# Stage 04.3 Audit Report — Family Relics

**Project:** Endemion Life  
**Stage:** 04.3 (Legacy Engine 2.0 — Family Relics)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Pre-existing uncommitted changes (Stages 12–14, 04.1, 04.2):** preserved, not touched by this audit  
**This is audit-only:** no source code modified, no implementation performed

---

## 1. Executive Summary

Family Relics — unique objects that carry a family's history across generations with provenance, ownership history, and restrained gameplay effects — **do not exist yet**. There is no item/relic/collectible/inventory system anywhere in `game-core`.

The closest existing analog is **`LineageThread`** (`legacy/chronicle.ts`, `types.ts`): five predefined threads (`old-enemy`, `family-feud`, `ancient-knowledge`, `buried-secret`, `betrayal`) stored in `lineage.threads`, transferred to the heir at succession, and gated by the `thread` narrative condition. Relics can be built as a **parallel but distinct** system sitting alongside threads: threads are abstract narrative flags, relics are concrete named objects with provenance and optional gameplay effects.

The infrastructure needed to support relics already exists and is tested: per-lineage state (`LineageState`), one-time-per-lineage achievements, succession transfer (`succeed`), the narrative DSL (`Condition`/`Effect`), the world activity feed, and save normalization. Stage 04.3 can be implemented as a **small, additive extension** without changing `SAVE_SCHEMA_VERSION` or introducing a new event-selection engine.

---

## 2. Existing Relevant Systems (with source locations)

### 2.1 Lineage & inheritance (the natural home for relics)

`packages/game-core/src/types.ts` — `LineageState` (lines 414-445):
- `generation`, `epoch`, `renown`, `startRenown`, `lives[]`, `chronicle[]`, `nextEntry`, `achievements[]`, `traits`, `threads[]`, `pending[]`, `stories`, `continuedBy`, `archived`, `inheritance`, `names`
- `LineageThread { id, year, gen, src }` — threads transferred to the heir at succession (used for `old-enemy`, `family-feud`, `ancient-knowledge`, `buried-secret`, `betrayal`)
- `InheritanceRecord { fromGen, fromName, fromNpcId, relation, law, wealth, ownWealth, shares[], socialClassId, classInherited, reputation, talents[], weaknesses[], dormant, flags[], threads[], controlAge, guardianName, held }` — what passes to the heir

`packages/game-core/src/legacy/succession.ts` — `succeed(dead, heirId, salt)`:
- Transfers `lineage` (including `threads`, `traits`, `stories`, `achievements`, `inheritance`) wholesale to the new life
- Records `succession` in the lineage chronicle; world activity `succession.<heir.id>`
- Validates heir via `heirCandidates()` (blood relation, control age, regency)

`packages/game-core/src/legacy/achievements.ts` — `ACHIEVEMENTS[]` (one-time-per-lineage), `unlockAchievements(state)` pushes to `lineage.achievements`. Categories include `family` and `legacy`.

`packages/game-core/src/legacy/stories.ts` — `LEGACY_EVENTS[]` (16 events, `lineageMax: 1`) and `LINEAGE_CONSEQUENCES[]` (delayed effects via `lineageLater`). Existing threads defined in `THREADS`.

`packages/game-core/src/legacy/present.ts` — `DynastyView`, `LineageView`, `presentLineage`, `presentLegacy`, `dynastyFactionRelations`, `dynastyIdentity`.

### 2.2 Narrative DSL (conditions/effects — the integration point for relic gating)

`packages/game-core/src/narrative/types.ts`:
- `Condition` union (lines 9-85): `stat`, `flag`, `karma`, `reputation`, `wealth`, `hardship`, `cycle`, `strain`, `prosperity`, `deed`, `deedAny`, `achievement`, `level`, `rank`, `trackReady`, `origin`, `race`, `temperament`, `ability`, `skill`, `talent`, `weakness`, `npc`, `affinity`, `meter`, `faction`, `socialClass`, `standing`, `profession`, `education`, `specialization`, `dormantTalent`, `hidden`, `secret`, `quest`, `yearsLeft`, `generation`, `renown`, `thread`, `story`, `world`, `missingKin`, `married`, `settlement` (Stage 04.2), `worldFaction` (Stage 04.2), `goal` (Stage 04.1). **No `relic` condition.**
- `Effect` union (lines 88-148): `stat`, `resource`, `reputation`, `karma`, `wealth`, `xp`, `track`, `breakthrough`, `flag`, `ability`, `schedule`, `death`, `skill`, `talent`, `awakenTalent`, `weakness`, `overcomeWeakness`, `npc`, `affinity`, `npcRole`, `npcDies`, `npcSkill`, `meter`, `faction`, `socialClass`, `profession`, `education`, `educationTier`, `specialization`, `later`, `reveal`, `renown`, `thread`, `lineageLater`, `kinReturns`, `kinMissing`, `classStep`, `adopt`, `strain`, `prosperity`. **No `relic` effect.**

`packages/game-core/src/narrative/dsl.ts` — `fx.*` effect constructors and `when.*` condition constructors (just added `settlement`, `worldFaction`, `goal` in Stage 04.2).

`packages/game-core/src/engine/conditions.ts` — `checkCondition` (evaluates conditions against `GameState`) and `describeCondition` (localized lock text).

### 2.3 Save / serialization

`packages/game-core/src/engine/save.ts`:
- `SAVE_SCHEMA_VERSION = 8` (engine/game.ts)
- Additive migrations V1→V8; each new optional field normalized at parse time, no generator/RNG changes
- `checkLineage(lineage)` validates `LineageState` (lives, chronicle ≤1000, achievements, threads ≤20, pending ≤20, stories, names)
- `parseSave` validates all top-level fields including `world?`, `social?`, `economy`, `adventure`, `region`, `mastery`

### 2.4 UI

`apps/web/src/components/play/`:
- `dossier.tsx` (29 KB) — People / Dossier tabs, presents `NpcView`/`LifeProfile`
- `lineage.tsx` (29 KB) — dynasty tab, family tree, dynasty view (`DynastyView`)
- `world-panel.tsx` — world settlements/factions/activities
- `play-screen.tsx` — main play screen

---

## 3. Verified Gaps

| Area | Status | Gap |
|---|---|---|
| Item/relic/inventory system | **Absent** | No `RelicState`, no item effect, no item condition |
| Relic persistence | **Absent** | No `lineage.relics` or `character.relics` field |
| Relic narrative gating | **Absent** | No `when.relic(id)` condition, no `fx.relic(id)` effect |
| Relic chronicle | **Absent** | No `relic` chronicle kind (existing: origin, birth, adoption, marriage, divorce, death, tragedy, missing, return, career, class, succession, inheritance, achievement, deed, talent, secret, story, milestone, faction) |
| Relic UI | **Absent** | No relic panel in `dossier.tsx`/`lineage.tsx` |
| Succession transfer of relics | **Absent** | `InheritanceRecord` has no relics field; `succeed` does not transfer relics |

No duplicate system exists. Threads (`LineageThread`) are the closest analog but are abstract flags, not concrete objects with provenance and effects — relics are a distinct, complementary concept.

---

## 4. Proposed Minimal Family Relics Design

### 4.1 Data model

Add to `LineageState` (types.ts):

```ts
export interface RelicState {
  id: string;            // stable relic id (e.g. "ancestral-blade")
  name: LocalizedText;
  description: LocalizedText;
  acquiredGen: number;   // lineage generation when acquired
  acquiredAge: number;   // character age when acquired
  source: string;        // event id or "inheritance"/"founder"
  effects: Effect[];     // gameplay effects applied while held (existing Effect union)
  ownerNpcId: string | null; // current holder NPC id, null if held by lineage
}
```

Add `relics: RelicState[]` to `LineageState`. Default `[]` for old saves (normalized in `parseSave`/`newLineage`).

**Why lineage-level, not character-level:** Relics belong to the family, not an individual. They transfer via `succeed` and outlive any single character. Storing on `CharacterState` would risk loss on succession and complicate save validation.

### 4.2 Gameplay (smallest useful set)

- **Acquisition:** via narrative event effect `fx.relic(id)` or a legacy event choice, adding a `RelicState` to `lineage.relics` (deduplicated by id) and writing a `relic` chronicle entry.
- **Effects while held:** existing `Effect` variants applied once at acquisition (e.g. `fx.renown(2)`, `fx.stat("willpower", 1)`, `fx.faction("order-of-ash", 3)`). Effects are applied through the normal `applyEffect`/`ctx.changes` pipeline so they appear in history.
- **Transfer:** on `succeed`, `lineage.relics` passes to the new life; `InheritanceRecord.relics?: string[]` records which relics passed.
- **Loss (optional, later):** an event could remove a relic (`fx.relic(id, add: false)`), but this is optional for Stage 04.3.

### 4.3 Narrative integration

- New `Condition` variant: `relic: { id: string; has: boolean }` — gates event choices on relic ownership.
- New `Effect` variant: `relic: { id: string; add: boolean }` — acquires/loses a relic.
- Existing `when.*` and `fx.*` DSL constructors; no new event-selection engine.
- Relic ownership readable in `when.relic("ancestral-blade")` for event eligibility; relic descriptions render via existing `t()` localization.

### 4.4 Succession & lineage integration

- `succeed()` transfers `lineage.relics` to the heir's new life.
- `InheritanceRecord.relics?: string[]` records relic ids passed to the heir (displayed on the succession screen).
- `finishLife()` / death chronicle can note which relics the deceased held.
- Relics outlive the individual: a relic acquired in generation 1 can still be held in generation 5.

---

## 5. Persistence & Save Compatibility

- `lineage.relics: RelicState[]` is **additive and optional**.
- `parseSave` normalizes missing `lineage.relics` to `[]` (like `world?`, `social?`, `economy`).
- `checkLineage` validates each relic: `id` string, `name`/`description` `LocalizedText`, `acquiredGen`/`acquiredAge` ints ≥0, `source` string, `effects` valid `Effect[]`, `ownerNpcId` nullable person id.
- `SAVE_SCHEMA_VERSION` stays 8. No migration step needed because the field defaults to `[]`.
- Import/export (`prepareImport`) unaffected — relics are part of `lineage`, which is already imported.

---

## 6. UI Integration (minimal)

Relic display fits naturally into existing screens without a standalone inventory redesign:

- **`lineage.tsx`** (Dynasty tab / `DynastyView`): add a "Relics" section listing `lineage.relics` with name/description/acquired generation/source, similar to `threads`.
- **`dossier.tsx`**: optional relic icon/line on the character dossier when the current character holds a relic (via `ownerNpcId === SELF_ID`).
- **Succession screen** (`life-summary.tsx`): show `InheritanceRecord.relics` passing to the heir.
- No new screens, no inventory-management UI (relics are acquired via events, not equipped/unequipped by the player).

---

## 7. Balance, Performance & Save Risks

| Risk | Assessment |
|---|---|
| Balance | Relic effects use existing `Effect` types (renown, wealth, stat, faction, karma) with existing clamps (`WEALTH_MAX`, stat 1–100, relation ±30). Effects applied once at acquisition, not per-year, so no unbounded scaling. |
| Performance | `lineage.relics` is a small array (expected <10 relics per lineage). `checkCondition` for `relic` is an O(n) array scan. No repeated full-world scans. |
| Save size | Each relic is a small object; expected few per lineage. Negligible vs. chronicle/npcs. |
| Determinism | Relic acquisition comes from event choices (server-resolved RNG via `ctx.rng`); effects deterministic given state. No `Math.random()`. |
| Schema | No new fields on `CharacterState` or `WorldState`; only optional `lineage.relics`. No `SAVE_SCHEMA_VERSION` bump. |

---

## 8. Recommended Implementation Breakdown (Stage 04.3)

1. **Data model** — Add `RelicState` interface and `lineage.relics: RelicState[]` to `types.ts`; default `[]` in `newLineage()` (chronicle.ts).
2. **Narrative DSL** — Add `relic` to `Condition` union (`narrative/types.ts`), `when.relic(id)` and `fx.relic(id, add)` to `narrative/dsl.ts`.
3. **Condition evaluation** — Add `checkCondition` + `describeCondition` cases for `relic` in `engine/conditions.ts`.
4. **Effect application** — Add `fx.relic` handling in `engine/effects.ts` (`applyEffect`): push `RelicState` to `state.lineage.relics` (dedup by id) or remove it.
5. **Succession** — `legacy/succession.ts` `succeed()` transfers `lineage.relics`; `InheritanceRecord.relics?: string[]`; `legacy/present.ts` `InheritanceView.relics`.
6. **Chronicle** — `relic` chronicle kind on acquisition (optional: add to `CHRONICLE_KINDS` and render in `legacy/present.ts` `names()`).
7. **UI** — Relic list in `lineage.tsx` Dynasty tab; optional relic indicator in `dossier.tsx`; relics passed shown in `life-summary.tsx` succession screen.
8. **Tests** — `test/stage04-3-relics.test.ts`: condition evaluation, acquisition via effect, succession transfer, save round-trip, all six universes, determinism, bounds (dedup, no duplicates).

---

## 9. Tests Required

New file `packages/game-core/test/stage04-3-relics.test.ts` covering:

- **Condition evaluation:** `when.relic("ancestral-blade")` matches when relic held, not when absent; works across all six universes.
- **Effect application:** acquiring a relic via `fx.relic` adds to `lineage.relics`, applies effect, writes chronicle entry; acquiring again is a no-op (dedup).
- **Succession transfer:** `succeed()` passes `lineage.relics` to the heir; `InheritanceRecord.relics` populated.
- **Save compatibility:** save with `lineage.relics` round-trips via `parseSave`; save without `relics` normalizes to `[]`; `SAVE_SCHEMA_VERSION` stays 8.
- **Determinism:** same seed/choices → same relics across repeated runs.
- **Bounds:** `lineage.relics` contains no duplicate ids; relic count stays small.

Existing tests to keep passing: stage02, stage05, stage06, stage07, stage08, stage09, stage10, stage11 (all world/legacy/dynasty tests).

---

## 10. Files Likely to Change

**Modified (8):**
- `packages/game-core/src/types.ts` — `RelicState` interface + `LineageState.relics`
- `packages/game-core/src/narrative/types.ts` — `Condition.relic` + `Effect.relic`
- `packages/game-core/src/narrative/dsl.ts` — `when.relic`, `fx.relic`
- `packages/game-core/src/engine/conditions.ts` — `checkCondition`/`describeCondition` for `relic`
- `packages/game-core/src/engine/effects.ts` — `fx.relic` application logic
- `packages/game-core/src/legacy/succession.ts` — transfer `lineage.relics`; `InheritanceRecord.relics`
- `packages/game-core/src/legacy/chronicle.ts` — `newLineage()` initializes `relics: []`; optional `relic` chronicle kind
- `packages/game-core/src/engine/save.ts` — `checkLineage` validates `lineage.relics`

**Created (2):**
- `packages/game-core/test/stage04-3-relics.test.ts`
- `STAGE_04_3_REPORT.md` (implementation report, after coding)

**Possibly modified (UI, optional for MVP):**
- `apps/web/src/components/play/lineage.tsx`
- `apps/web/src/components/play/dossier.tsx`
- `apps/web/src/components/play/life-summary.tsx`

---

## 11. Stop Condition

This is an **audit-only** stage. No source code has been modified. Implementation of Stage 04.3 awaits your explicit approval.

**Report file:** `STAGE_04_3_AUDIT_REPORT.md`
