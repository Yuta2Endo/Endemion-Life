# STAGE 02.1 — Health, Illness, Injury and Cause of Death

**Status:** implemented in the working tree (not committed).  
**Scope:** `packages/game-core`, `packages/shared`, the existing play character panel.  
**Out of scope:** education/career, property, business, travel, multiplayer, broad balance.

## 1. Model

The character already had a short-term `character.resources.health` pool used by events, adventures and the yearly rest step. Stage 02.1 adds a second, persistent **life health** track without replacing that pool:

- `GameState.health.value` — integer **0–100**, the long-term condition of the body.
- `GameState.health.conditions` — active illnesses and injuries, at most **6**, unique by `id`.
- `GameState.health.deathCause` — localized cause persisted when life health reaches zero or a lethal condition resolves fatally. It mirrors `life.deathCause`, which remains the single source of truth for death history and lineage records.

The two pools have different jobs. `resources.health` is immediate stamina used by the existing combat/adventure/event rules. `health.value` is the lasting physical state shown in the character panel. Damage from `fx.health(...)` is applied to both: the short-term pool keeps its existing behaviour, and the long-term pool loses the same **percentage** of its current maximum (so a −30 hit is −30 at a 100-point pool and −10 at a 300-point pool). This preserves old event balance while making old injury events matter to the new model.

No combat system, DB, network, filesystem or wall-clock dependency was added. Every roll uses the existing seeded `ctx.rng`; migration never changes `rngState` or `seed`.

### State shape

```ts
type HealthConditionKind = "illness" | "injury" | "wound" | "curse";

interface HealthCondition {
  id: string;              // stable catalog id, e.g. "common-fever"
  kind: HealthConditionKind;
  severity: number;        // 1..3
  source: string;          // event / consequence id, or "event"/"age"
  onsetAge: number;        // character age when it started
  remaining: number;       // years until natural recovery; 0 = chronic
  damage: number;          // health lost per year at current severity
  recoverable: boolean;
  lethal: boolean;
}

interface HealthState {
  value: number;                 // 0..100
  conditions: HealthCondition[]; // max 6, unique ids
  deathCause: LocalizedText | null;
}
```

`GameState.health` is required at schema 9. It is additive: no existing field was removed or renamed.

## 2. Catalog and bounds

`packages/game-core/src/life/health.ts` owns the catalog:

| id | kind | default severity | duration | damage/year | lethal |
|---|---|---:|---:|---:|---|
| `common-fever` | illness | 1 | 2 | 4 | no |
| `common-old-wound` | injury | 1 | 3 | 3 | no |
| `common-wound` | wound | 2 | 2 | 6 | no |
| `df-mist-rot` | illness | 2 | 4 | 7 | yes |
| `is-mana-burn` | injury | 2 | 3 | 6 | no |
| `mu-qi-deviation` | injury | 2 | 3 | 7 | no |
| `xx-serpent-venom` | illness | 3 | 2 | 8 | yes |
| `hu-gate-wound` | wound | 2 | 3 | 8 | yes |
| `ac-duel-injury` | injury | 2 | 2 | 6 | no |

Bounds are enforced both when conditions are created and in `parseSave`:

- `value` 0–100;
- at most `MAX_HEALTH_CONDITIONS = 6`;
- `severity` 1–3;
- `remaining` 0–20;
- `damage` 1–20;
- duplicate ids reject the save; adding the same condition in play **worsens** it instead of duplicating (severity +1, damage +2, duration refreshed).

A new condition at full capacity is ignored. This is deterministic and keeps saves bounded.

## 3. Yearly simulation

`healthYear(ctx)` runs once in `ageOneYear`, after the ordinary yearly rest and before the natural-old-age roll:

1. Every recoverable condition may worsen (seeded chance based on severity, age and vitality).
2. `remaining` decreases. At zero a non-lethal condition resolves and restores a few points; a **lethal** condition resolving while health is already very low kills instead.
3. Active conditions deal their yearly damage.
4. Age/vitality drift applies: children recover a little, adults with high vitality recover, old age and low vitality drain.
5. A lethal condition at severity 3 while health ≤ 25 can trigger a crisis roll (vitality resists).
6. If `value` reaches 0, the result carries a localized cause. The caller (`life/aging.ts`) passes it to the existing `kill()` path, so death is single and uses `life.alive` / `life.stage` / history exactly as before.

`healthYear` returns `{ died: LocalizedText | null }` instead of killing directly. This keeps it a pure-ish state step and avoids a circular import with `engine/effects.ts`.

Death causes:

- illness → “Болезнь оказалась смертельной” / “The illness proved fatal”;
- injury or wound → “Раны оказались смертельными” / “The wounds proved fatal”;
- curse → “Проклятие истощило тело” / “The curse drained the body”;
- no condition, external damage → existing `DEATH_CAUSES.wounds`;
- no condition, natural exhaustion → existing `DEATH_CAUSES.oldAge`.

`kill()` now writes the same cause into `health.deathCause` as `life.deathCause`. The death history entry keeps the existing cause text and appends the names of active ailments.

## 4. Event integration

The narrative DSL gained:

- effects `fx.condition(id, severity?, duration?)` and `fx.cure(id)`;
- conditions `when.health(min, max?)`, `when.condition(id)` and `when.noCondition(id)`;
- `Effect` / `Condition` union members, validated by `eventProblems` against the catalog.

Content added without flooding pacing:

- **Shared pool:** new `common.wound` (weight 0.7, cooldown 9) with a guaranteed “hide it” choice that creates `common-wound`, and condition effects added to the existing `common.fever` and `common.old-wound` choices.
- **One world-specific event each:** dark-fantasy mist rot, isekai mana burn, murim qi deviation, xianxia serpent venom, hunter Gate wound, academy duel injury. Each has weight 0.7, cooldown 12–14 and at most 2 occurrences. All are appended through `universes/registry.ts`; shared events are appended to `COMMON_EVENTS`.

Every condition comes from a DSL effect or a yearly rule. There are no UI-only states.

## 5. Views and UI

- `presentHealth(state)` returns `HealthView` with `value`, mapped condition views (localized name/description, kind, severity, source, onset age, remaining years, damage, lethal flag) and `deathCause`.
- `LifeView` in `packages/shared` now includes `health`; `toLifeView` always provides it. `LifeView.life.deathCause` remains for compatibility.
- The existing `CharacterSheet` (play screen, character tab) now renders a compact **Life health** panel under the resource meters:
  - 0–100 meter;
  - ailment cards with severity, remaining years/chronic state, yearly damage and lethal marker;
  - cause of death when the life is over.
- UI strings were added to `apps/web/src/lib/messages.ts` in RU and EN. Layout, tabs and the rest of the dossier were not redesigned.

## 6. Save compatibility

`SAVE_SCHEMA_VERSION` is now **9**. `engine/save.ts` adds `migrateV8`:

- alive lives: `health.value` = the current `resources.health` share of `maxResources.health`, clamped to 1–100; conditions start empty; no RNG use;
- dead lives: value 0 and `health.deathCause` copied from `life.deathCause`;
- all other fields are passed through unchanged; `seed` and `rngState` are untouched.

`parseSave` validates the new branch strictly (`checkHealth`). `applyAction` also normalizes the field at the action boundary for defensive compatibility with un-migrated local states.

The migration chain remains 1→9. Existing production saves at schema 1, 2, 5 and 8 continue through the existing steps and receive health only at the final step. No DB operation was performed in this work.

## 7. Tests

`packages/game-core/test/stage02-health.test.ts` (10 tests) covers:

- initialization of a new life;
- condition onset from a real event choice;
- yearly worsening and natural recovery;
- death from a lethal condition, cause persisted in `health`, `life` and the death history entry;
- deterministic replay from the same seed and actions;
- condition cap and de-duplication;
- strict rejection of out-of-range and duplicate condition arrays;
- schema 8 → 9 migration (alive and dead fixture);
- schema 1 / 2 / 5 compatibility.

Existing tests that hard-coded schema 8 were updated to the current version; migration equality tests now account for the additive `health` field.

`packages/shared/test/schemas.test.ts` checks that `LifeView` exposes health, condition details and cause of death.

## 8. Risks and known gaps

- **Balance:** long-term damage from existing `fx.health` events is proportional, but a full balance pass was intentionally not part of this slice. Conditions may need tuning after long soak runs.
- **Two health pools:** `resources.health` (short-term) and `health.value` (long-term) are intentionally separate; the UI labels the new one “Life health” to avoid ambiguity.
- **Treatment inventory:** curing is a narrative effect (`fx.cure`), not an item or clinic system. There is no medicine inventory.
- **No pregnancy/childbirth/disability model** — explicitly outside this slice.
- **Chronic conditions:** the model supports `duration: 0`, but current catalog content only uses curable timed conditions; no content seeds a true chronic condition yet.
- **Condition source labels:** `source` stores the event id; the UI shows condition names, not a localized “from event X” line.
- **Old saves mid-condition:** schema ≤ 8 had no condition history, so migrated saves start with no active conditions. Their current resource health is reflected in the starting value, but no retroactive illness is invented.

## 9. Files

New:

- `packages/game-core/src/life/health.ts`
- `packages/game-core/src/narrative/health-events.ts`
- `packages/game-core/test/stage02-health.test.ts`
- `packages/game-core/test/fixtures/saves-v8.ts`
- this document

Changed (core):

- `packages/game-core/src/types.ts`
- `packages/game-core/src/engine/{game,save,effects,conditions}.ts`
- `packages/game-core/src/life/aging.ts`
- `packages/game-core/src/legacy/succession.ts`
- `packages/game-core/src/narrative/{types,dsl,selection,common}.ts`
- `packages/game-core/src/universes/registry.ts`
- `packages/game-core/src/index.ts`

Changed (shared/web):

- `packages/shared/src/views.ts`
- `packages/shared/test/schemas.test.ts`
- `apps/web/src/components/play/character-sheet.tsx`
- `apps/web/src/lib/messages.ts`
