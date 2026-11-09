# Stage 04.5.1 — World → Narrative Integration

**Project:** Endemion Life  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`  
**HEAD:** `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Implementation date:** 10.11.2026  
**Final status:** **COMPLETED WITH KNOWN BLOCKERS** (blockers are pre-existing and unrelated)

---

## 1. Executive Summary

Stage 04.5.1 connects the existing Living World simulation to the existing Narrative Engine without adding a second event engine.

Implemented:

1. **"A Settlement in Trouble"** — a narrative opportunity gated by the real state of Ashen Capital (`ash-capital`) in the `dark-fantasy` world. It becomes eligible only while the settlement is in the same crisis range used by `worldTick` (stability below 35). Choices spend gold, use dynasty influence, postpone aid (existing `fx.schedule` chain), or ignore the crisis.
2. **"Ashen Capital's Debt"** — a scheduled-only follow-up that is validated again against world state when its due date arrives; invalidated opportunities are dropped safely by the existing scheduler.
3. **"The Order's Invitation"** — a faction opportunity gated by `when.worldFaction("order-of-ash", …)` using the faction influence that `worldTick` derives from the dynasty's relationship with the Order.

One minimal additive mechanism was required: an `settlement` effect that changes a settlement's prosperity/stability. No existing effect can modify `WorldSettlementState`; the audit proposal (`fx.triggerStoryFromWorld`) was **not** added, and no duplicate condition such as `when.factionStanding` was created.

No save field, migration, or schema bump. No commit, push, or deployment.

---

## 2. Initial Branch, HEAD, and Git Status

Verified before any edit:

```
Branch: main
HEAD:   1bcf224
Status: 36 modified files, 38 untracked files
```

The pre-existing inventory matched the historical reference. All pre-existing modifications were left in place.

**An important discovery:** the working tree already contained an unfinished and broken attempt at this same stage:

- `packages/game-core/src/legacy/stories.ts` contained duplicate `const settlementCrisisCondition` declarations, a missing `title`, duplicate object keys, mojibake, and a reference to an unimported `Condition` type. `tsc` failed at line 279.
- `packages/game-core/test/stage04-5-world-narrative.test.ts` was syntactically invalid (unclosed `describe`, undefined `ctx`) and contained stale relic tests.
- `STAGE_04_5_1_IMPLEMENTATION_REPORT.md` incorrectly described the relic implementation (Stage 04.3), not world→narrative integration.

These were treated as this stage's own incomplete work: the broken source block was removed, the test file was replaced with the required Stage 04.5.1 tests, and this report was rewritten. No unrelated pre-existing work was touched.

---

## 3. Architecture Findings Before Implementation

Actual call order in `engine/game.ts` (`advance` → `choose`):

1. `ageOneYear` ages the character.
2. `worldYearly` (universe rules) runs.
3. `worldTick` advances settlements, factions, and writes `WorldActivity` entries.
4. `npcYearly` runs.
5. `consequencesYearly`, `lineageYearly`, `masteryYearly` run.
6. `selectEvent` is called: scheduled events first (`takeScheduled`), otherwise a weighted eligible event.
7. The selected event becomes `pending`; `occurrences` / `lastSeen` / `recentEvents` are updated.
8. On `choose`, `checkAll(choice.requires)` runs, the check (if any) consumes the seeded RNG, then `applyEffects` runs and `recordStory` writes lineage-scoped history.
9. Succession (`legacy/succession.ts`) deep-clones `lineage` and normalizes/carries `world`.

Key facts that shaped the design:

- `when.settlement` already reads `state.world.settlements` directly and supports prosperity/stability ranges.
- `when.worldFaction` already reads `state.world.factions` and supports power/influence/standing ranges.
- `worldTick` already treats a settlement as in crisis when stability drops below 35, and computes faction `influence` from `character.factions` (`(influence*3 + characterStanding)/4`).
- `fx.schedule` already deduplicates by `eventId` and caps the queue at 20.
- `takeScheduled` re-validates `event.conditions` at presentation time and discards an invalid continuation after a 5-year grace period.
- `isEligible` already enforces `maxOccurrences`, `lineageMax`, cooldowns, and “at least one available choice”.
- `recordStory` increments `lineage.stories[eventId]` for `kind: "legacy"` events, so `lineageMax` survives succession.
- No existing effect can change a settlement's prosperity/stability (only `fx.prosperity`/`fx.strain`, which affect the region, not a settlement).

---

## 4. Reuse vs. Extension: Exact Reasoning

| Question from the brief | Answer |
|---|---|
| Can `when.settlement` detect a settlement crisis? | **Yes.** Used directly with `stability: { max: 34 }`, matching `worldTick`'s own `< 35` crisis threshold. |
| Can `when.worldFaction` detect a faction threshold? | **Yes.** Used directly with `influence: { min: 10 }`. No `when.factionStanding` was added. |
| Can `WorldActivity` be a reliable narrative trigger? | Not needed. Activities are a bounded log; eligibility is more reliable from the state that produced them. The event still writes a `WorldActivity` when it changes the settlement. |
| Can `fx.schedule` create a delayed opportunity? | **Yes.** Used for the follow-up, with existing deduplication and grace-period validation. |
| Can existing occurrence limits prevent spam? | **Yes.** `legacy()` semantics (`maxOccurrences: 1`, `lineageMax: 1`) are applied inline in the universe event definitions. |
| Can narrative chains handle multi-step consequences? | **Yes.** The settlement event + scheduled follow-up reuse the existing `scheduled` queue and `recordStory`. |
| Can this be done without a new save field? | **Yes.** No persistent state was added. |

**The only additive extension:** `Effect.settlement { id, prosperity?, stability? }`.

Justification: the stage explicitly requires “settlement recovery or other existing world-state effect” and testable world consequences. `WorldSettlementState` already exists in the save, but no effect modifies it. Without this effect, choices could only change character/lineage values and the “affected settlement” would remain flavour text. The effect is a pure DSL/content addition; it introduces no serialized field and no migration.

---

## 5. Implementation Description

### 5.1 Settlement crisis

`world.settlement-crisis.ash-capital` (`dark-fantasy`):

- Conditions: `when.settlement("ash-capital", undefined, { max: 34 })`.
- The event text names Ashen Capital explicitly in both locales.
- Choices:
  - `aid` — requires 20 gold; spends gold, adds `+5` prosperity and `+12` stability, `+4` reputation, `+3` karma.
  - `influence` — requires renown ≥ 20; calls in the Order of Ash: `+8` personal faction standing (which `worldTick` later converts into world faction influence), `+2` prosperity, `+8` stability, `+1` renown.
  - `postpone` — schedules `world.settlement-crisis-followup.ash-capital` in 3 years; `-2` karma.
  - `ignore` — `-5` karma, `-2` renown, no world change.

### 5.2 Scheduled follow-up

`world.settlement-crisis-followup.ash-capital`:

- `scheduledOnly: true`, `maxOccurrences: 1`, `lineageMax: 1`.
- Conditions: `when.settlement("ash-capital", undefined, { max: 40 })`.
- If the city has recovered before the due date, `takeScheduled` does **not** present it; after the existing 5-year grace period the stale entry is removed.
- Choices: keep the word (30 gold, settlement recovery) or break the promise (karma/renown loss).

### 5.3 Faction opportunity

`world.faction-invitation.order-of-ash` (`dark-fantasy`):

- Condition: `when.worldFaction("order-of-ash", undefined, { min: 10 })` (third argument is `influence`).
- Threshold is grounded in `worldTick`: initial influence is 0, and influence converges toward the character's standing with the faction.
- Choices: accept (`+10` faction standing, `+4` reputation, `+2` renown), negotiate (existing `check(["charisma","wisdom"], 13, …, { skill: "persuasion" })`), decline (`-6` faction standing, `+2` karma, `-1` renown).
- `maxOccurrences: 1`, `lineageMax: 1`.

### 5.4 Placement

The three events live in `universes/dark-fantasy.world.ts`, not in `LEGACY_EVENTS`. Reason: `LEGACY_EVENTS` is merged into **all six** universes, and `eventProblems()` validates faction/effect ids per universe. Placing `order-of-ash`/`ash-capital` content in common events made the content checker report broken faction references in the other five universes. Placing it in the universe that actually owns those ids is the existing architectural convention and keeps the content validator green.

---

## 6. Files Changed

| File | Change |
|---|---|
| `packages/game-core/src/narrative/types.ts` | Added `Effect` variant `settlement { id, prosperity?, stability? }`. |
| `packages/game-core/src/narrative/dsl.ts` | Added `fx.settlement(id, { prosperity?, stability? })`. |
| `packages/game-core/src/engine/effects.ts` | Added `applyEffect` case and `changeSettlement()` (clamps 0–100, safely no-ops on unknown settlement, writes a localized `WorldActivity`). |
| `packages/game-core/src/narrative/selection.ts` | `brokenEffect` validates `settlement` ids against `settlementSeeds(universe)`. |
| `packages/game-core/src/universes/dark-fantasy.world.ts` | Added the three demonstration events. |
| `packages/game-core/src/legacy/stories.ts` | Removed the broken duplicate/unfinished Stage 04.5.1 block; pre-existing relic code untouched. |
| `packages/game-core/test/stage04-5-world-narrative.test.ts` | Replaced the invalid stale file with 23 focused Stage 04.5.1 tests. |
| `packages/game-core/test/stage03-1.test.ts` | Corrected the stale expected `LEGACY_EVENTS` id list (removed ids that moved to the dark-fantasy universe; count 22 → 19). No assertion was weakened. |
| `STAGE_04_5_1_IMPLEMENTATION_REPORT.md` | Rewritten (previous content described relics, not this stage). |

No files outside game-core content/narrative/world were modified by this stage.

---

## 7. Data Model and Save Compatibility

- `SAVE_SCHEMA_VERSION` remains **8**.
- No field was added to `GameState`, `WorldState`, `WorldSettlementState`, `LineageState`, or `CharacterState`.
- The new `Effect` variant exists only in static event definitions and is never serialized as state.
- Existing saves load unchanged; `normalizeWorldState` already governs world arrays.
- Round-trip is covered by a test (`parseSave` after an aid choice preserves settlement values and `lineage.stories`).

---

## 8. Russian / English Localization

Every new player-facing string uses `t(ru, en)`:

- Event titles: «Поселение в беде» / “A settlement in trouble”, «Долг Пепельной столицы» / “Ashen Capital’s debt”, «Приглашение Ордена Пепла» / “The Order’s invitation”.
- All event texts, choice labels, success texts, and failure text have both languages.
- Settlement and faction names appear in both locales.
- The world activity written by `changeSettlement` is localized in both languages.
- `eventProblems("dark-fantasy")` reports no empty localized texts.

---

## 9. Test Coverage and Exact Results

New file: `packages/game-core/test/stage04-5-world-narrative.test.ts` — **23 tests, 23 passing**.

| # | Requirement | Test |
|---|---|---|
| 1 | Crisis makes event eligible | `кризис делает событие доступным` |
| 2 | Non-crisis does not | `благополучное поселение не делает событие доступным` |
| 3 | Correct settlement referenced | `событие привязано к реальному id Пепельной столицы…` |
| 4 | Assistance produces intended effect | `помощь тратит золото и восстанавливает…` |
| 5 | Ignore produces consequence | `отказ от помощи не меняет поселение…` |
| 6 | No indefinite repetition | `событие не повторяется бесконечно…` |
| 7 | Faction threshold eligible | `влияние Ордена Пепла выше порога…` |
| 8 | Below threshold not eligible | `влияние ниже порога…`, `влияние другой фракции…` |
| 9 | Occurrence limits respected | `событие уважает лимит вхождений` |
| 10 | Choice effects update correct state | `выборы меняют правильное личное отношение к фракции` |
| 11 | Scheduled events not duplicated | `повторное планирование одного события не создаёт дубль` |
| 12 | Invalidated world conditions safe | `продолжение не показывается, если кризис уже прошёл`, `устаревшее продолжение отбрасывается…` |
| 13 | Old activities do not retrigger | `старые записи мира не переоткрывают уже случившееся событие` |
| 14 | Different eligible activities independent | `разные кризисы проверяются независимо…` |
| 15 | Determinism | `одинаковое состояние и выбор дают одинаковый результат…` |
| 16 | World survives succession | `мир переживает наследование без сброса…` |
| 17 | Completed opportunities do not reappear | `завершённая возможность не возвращается после наследования` |
| 18 | Lineage/character scopes separate | `личный и родовой прогресс остаются раздельными` |
| — | Content validation | `новые события проходят проверку ссылок и локализации` |
| — | Save round-trip | `состояние мира переживает сериализацию сохранения` |
| — | Promise actually schedules | `обещание помощи действительно ставит продолжение в очередь` |

Full game-core suite:

```
Test Files  1 failed | 38 passed (39)
Tests       1 failed | 537 passed (538)
```

The single failure is the known pre-existing `stage01-life-upgrade.test.ts > keeps the decision provenance when a delayed consequence arrives` (`expected undefined to be 'mu.bandits'`). It is unrelated to this stage; no source involved in that path was changed.

Shared package: **12 tests, 12 passing** (2 files). Shared contracts were not modified.

---

## 10. Typecheck and Lint

- `packages/game-core`: `npx tsc -p tsconfig.json --noEmit` → **exit 0**.
- ESLint on all changed files (source + tests) → **exit 0**.
- Root `pnpm lint` was **not** run; it is historically red for pre-existing reasons outside this stage (Android build artifacts, unrelated tests).

Web/API test suites were not run; no web/API files were touched.

---

## 11. Known Blockers

| Blocker | Origin | Impact on this stage |
|---|---|---|
| `stage01-life-upgrade.test.ts` delayed-consequence provenance fails | Pre-existing, documented in the Stage 04.5 audit | None; unrelated source path |
| JSX errors in `apps/web/src/components/play/lineage.tsx` block web typecheck/build | Pre-existing uncommitted work from Stages 12–14 | None; file untouched |
| Root `pnpm lint` historically fails | Pre-existing Android/test issues | None; changed-file lint is clean |

No new failures were introduced.

---

## 12. Determinism Verification

- No `Math.random()`, wall-clock time, browser API, or server API was introduced in game-core.
- No new RNG stream was created.
- The only random element is the existing `check()` in the faction negotiation choice, which consumes the existing seeded RNG.
- Test `одинаковое состояние и выбор дают одинаковый результат…` compares two identical states (including `rngState`) after the same choice and asserts equal faction/wealth/RNG/world results.
- World changes are integer deltas with existing clamping.

---

## 13. Succession Verification

- `succeed()` already deep-clones `lineage` and normalizes/carries `world`; no inheritance rule was changed.
- Test `мир переживает наследование…` asserts world tick, settlement ids, and faction ids survive.
- Test `завершённая возможность не возвращается после наследования` asserts `lineage.stories[eventId]` persists and the event is not eligible for the heir even when the world crisis condition is true.
- Test `личный и родовой прогресс остаются раздельными` asserts the events do not write character- or lineage-`storyProgress`.

---

## 14. Preservation of Pre-Existing Work

- Initial inventory recorded: **36 modified, 38 untracked**.
- Final inventory: **37 modified, 38 untracked**. The single extra modified file is `packages/game-core/src/universes/dark-fantasy.world.ts`, changed by this stage.
- All pre-existing modifications from Stages 04.x–14 remain in the working tree.
- No `git reset`, `git clean`, `git restore`, `git checkout`, destructive branch operation, commit, push, or deploy was used.
- HEAD is still `1bcf224`.

The only pre-existing file content removed was the broken, uncommitted Stage 04.5.1 block in `legacy/stories.ts` (duplicate declarations / non-compiling code). The unrelated relic implementation in the same file was left intact.

---

## 15. No Commit / Push / Deployment

Confirmed:

- No `git commit`.
- No `git push`.
- No deployment or production change.
- Production at `https://life.endemion.online` was not touched or verified.

---

## 16. Final Status

**COMPLETED WITH KNOWN BLOCKERS**

Acceptance criteria:

1. ✅ A settlement crisis creates a meaningful narrative opportunity.
2. ✅ A faction condition creates a meaningful narrative opportunity.
3. ✅ Both use actual `WorldState`.
4. ✅ Choices produce real, testable consequences.
5. ✅ Event spam is prevented by existing occurrence/lineage limits.
6. ✅ Scheduled-event behavior is safe (re-validation + grace-period drop).
7. ✅ Deterministic behavior preserved.
8. ✅ Russian and English localization complete.
9. ✅ Succession preserves world state and completed-opportunity history.
10. ✅ Existing saves remain compatible; schema stays 8.
11. ✅ New tests pass (23/23).
12. ✅ Unrelated failures documented (pre-existing `stage01-life-upgrade`, pre-existing web JSX).
13. ✅ All pre-existing working-tree changes preserved.
14. ✅ No commit, push, or deployment.

**Stop here. Awaiting approval before Stage 04.5.2.**
