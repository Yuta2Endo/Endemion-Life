# Stage 04.2 Audit Report — Living World & Persistent Consequences

**Project:** Endemion Life  
**Stage:** 04.2 (Living World Engine)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Pre-existing uncommitted changes (Stages 12–14):** preserved, not touched by this audit

---

## 1. Executive Summary

The Living World simulation is **already substantially implemented** and well tested. World state (`WorldState`), per-universe yearly rules (`WorldRules`), the yearly world tick (`worldTick`), world metrics (`worldMetrics`), deterministic seeded RNG, save normalization, and client presentation (`presentWorld`) all exist. World conditions already influence character meters, dynasty renown affects settlement prosperity, and dynasty achievements write to the world activity feed.

**Verified gaps (minimal, high-value):** World state (settlement prosperity/stability, world faction standing) cannot currently gate narrative events or character opportunities. The world feeds the dynasty, but the world's own condition does not feed back into event eligibility for the player character. This is the "World → Character / Narrative" connection the stage asks for, and it is the smallest, safest gap to close.

No economy balance change is required or recommended. No separate event-selection engine. No schema version bump.

---

## 2. Existing World Simulation Behavior (verified by source + tests)

### World state (`packages/game-core/src/world/state.ts`)
- `WorldState`: `tick`, `settlements[]` (3 per universe: prosperity/stability/population/dominantFactionId), `factions[]` (power/influence/standing), `activities[]` (capped at 24 via `MAX_WORLD_ACTIVITIES`).
- `newWorldState(universe)`: deterministic starting prosperity 48–60, stability 52–58, population 1000–1900, faction power 35–51.
- `worldTick(ctx)` — runs once per lived year while the character is alive (engine/game.ts `advance`, line 224):
  - Dynasty renown ≥ `DYNASTY_PROSPERITY_RENOWN` (30) → +1 prosperity to all settlements (dynasty-prosperity activity).
  - Economy cycle drift (±2 prosperity on boom/slump), stability drift (+1 if prosperity ≥ 60, −2 if ≤ 25), population drift, all with `rng.int(-1,1)` jitter.
  - Stability crossing 35/70 → crisis/recovery activity.
  - Factions: influence drifts toward character standing; power drifts based on influence; standing recomputed.
  - 12% chance/year of troubling news (stability < 40) or new opportunity (stability ≥ 40) activity.
  - RNG: `hashSeed(seed::world::age::rng.state)` — deterministic; does not consume the main generator.
- `normalizeWorldState` — old saves without/invalid `world` normalize at action boundary; `world?` is optional in `GameState`.
- `presentWorld(state)` — client view with localized settlement/faction names.

### Per-universe world rules (`packages/game-core/src/world/rules.ts`)
`worldYearly(ctx, emit)` applies universe-specific yearly effects:
- dark-fantasy: corruption/ember meters, karma loss, mist death.
- isekai: system-favor meter, intelligence boost.
- murim: qi-deviation meter, faction drift (demonic-cult / orthodox-alliance), health damage/death.
- xianxia: dao-heart / karmic-debt meters.
- hunter: gate-threat meter → `hu.district-break` scheduled event, fame decay.
- academy: court-favor / scandal meters, reputation loss, imperial social-class promotion.
- `trackFactor(state)` — world-state modifier to path-power growth.

### World metrics (`packages/game-core/src/world/metrics.ts`)
- `worldMetrics(state)` — pure, no NaN, empty world → zeros. Reports hasWorld/tick, settlements (count, prosperity/stability min/max/mean, atMax/atMin), factions (count, relation range), dynastyRenown, activeThreads, activities (count, byKind).

### Pipeline integration (`engine/game.ts` `advance`)
Order per year (character alive): `worldYearly` → `worldTick` → `npcYearly` → deferred world entries → `year` history entry → goal outcome → `settle` → milestone → `questYearly` → `discoverYearly` → `consequencesYearly` → `lineageYearly` → `masteryYearly` → `settle` → `selectEvent`. World tick happens every year the character lives.

---

## 3. Existing World Event Consequences (verified)

World state already produces consequences:

| Direction | Mechanism | Evidence |
|---|---|---|
| Dynasty → World | Renown ≥ 30 boosts all settlement prosperity (+1/yr); lineage achievements push dynasty-favor/dynasty-feud/dynasty-recognized/dynasty-disgraced activities | `world/state.ts:146`, `legacy/lineage.ts:87-139`, tests stage05/stage07/stage08/stage09/stage10 |
| World → character (meters) | `worldYearly` changes corruption/ember/system-favor/qi-deviation/dao-heart/karmic-debt/gate-threat/court-favor/scandal; can kill or change social class | `world/rules.ts`, tests stage06/stage07 |
| World → history | Crisis/recovery/troubling-news/new-opportunity/succession activities written to `world.activities` | `world/state.ts`, tests stage02/stage05/stage08/stage09 |

**Already satisfies:** "World events are recorded" (activity feed capped at 24, deterministic ordering by age/tick, preserved across succession), "World → dynasty" (renown → prosperity), "Dynasty → faction relations" (`legacy/present.ts` `dynastyFactionRelations` + `FACTION_ACTIONS`), "World → character meters/health/class".

---

## 4. Verified Gaps (World → Character / Economy / Factions / Narrative)

| Direction | Status | Gap |
|---|---|---|
| World → Character (meters/health/class) | Present | `worldYearly` already modifies character meters and can kill/promote. No gap. |
| World → Character (event eligibility) | **Missing** | No narrative condition reads settlement prosperity/stability or world faction standing. World condition cannot gate which story events the player is offered. |
| World → Economy | **Missing** (do not change without evidence) | Economy cycle is rolled independently of world state (`rollCycle`, own RNG). World prosperity/stability does not affect income/cycle. Per instructions: do not change balance without evidence. |
| World → Factions | Partially present | `worldTick` updates faction power/influence/standing from character standing, but world events do not change faction power, and faction standing does not gate world events. |
| World → Family/Legacy | Present | Lineage renown → settlement prosperity; dynasty achievements → world activities; succession activity recorded. |
| World → Narrative | Partially present | Conditions exist for `cycle`, `strain`, `region` prosperity, `faction` (character standing), `meter`, `renown` (lineage), `world` (universe id). **Missing:** conditions for settlement prosperity/stability and world faction standing/power/influence. |

**Conclusion:** The one minimal, balance-safe, high-value implementation is to add two narrative conditions so world state can gate events (World → Narrative → Character consequences):
- `settlement`: `{ id, prosperity?: {min,max}, stability?: {min,max} }` — reads a specific settlement's prosperity/stability.
- `worldFaction`: `{ id, power?: {min,max}, influence?: {min,max}, standing?: {min,max} }` — reads a world faction's standing.

These use the existing `Condition` union + `checkCondition` + `describeCondition` + `when.*` DSL, are deterministic, add no persisted fields, touch no balance constants, and require no schema migration.

---

## 5. Duplicate-System Risks

None identified. The Living World is a single system (`world/state.ts` + `world/rules.ts`) called once per year from `engine/game.ts`. No parallel world engine, no second RNG stream for world events (worldTick uses its own derived hashSeed; economy cycle has its own hashSeed — both intentional and tested). The activity feed is the single persistent world history (24-entry cap preserved).

---

## 6. Performance Risks

None. `worldTick` is O(settlements + factions) = O(3 + ~factions) per year with small fixed arrays and clamps. No repeated full-world scans, no unbounded history growth (activities sliced to 24), no UI-blocking sync work. Tests run 50 ticks in milliseconds.

---

## 7. Save Compatibility Risks

None for the proposed change. Conditions are evaluated at runtime against existing state; they add no persisted fields. `world?` remains optional; `normalizeWorldState` already handles old saves. `SAVE_SCHEMA_VERSION` stays 8. Import/export and API projections (`presentWorld`, `worldMetrics`) unchanged.

---

## 8. Recommended Minimal Implementation

Add two narrative conditions (World → Narrative → Character):

1. **`condition.type === "settlement"`** — `{ id: string; prosperity?: {min,max}; stability?: {min,max} }` — checks `state.world?.settlements.find(id)`.
2. **`condition.type === "worldFaction"`** — `{ id: string; power?: {min,max}; influence?: {min,max}; standing?: {min,max} }` — checks `state.world?.factions.find(id)`.

Wiring:
- `narrative/types.ts` — add two `Condition` variants.
- `narrative/dsl.ts` — `when.settlement(...)`, `when.worldFaction(...)`.
- `engine/conditions.ts` — `checkCondition` cases + `describeCondition` text.
- Tests — determinism, bounds, all six worlds, save normalization unaffected.

After this, world conditions (e.g., a settlement in crisis, a faction's standing) can gate event eligibility, giving world state a direct, deterministic consequence for the player character without changing balance, economy, or schema.

---

## 9. Tests Currently Covering Living World (all pass)

- `stage02.test.ts` — determinism, bounded settlements/factions, 3 settlements, activities ≤ 24, save compatibility (missing world normalizes).
- `stage05-world-dynasty.test.ts` — dynasty prosperity footprint, determinism across seeds, tick preserved on succession, activities ≤ 24, save compatibility.
- `stage06-balance.test.ts` — bounds (−1/+2 prosperity drift without dynasty), determinism, 50-year stability, save compatibility.
- `stage07-dynasty.test.ts` — dynasty-recognized/disgraced activities.
- `stage08-dynasty.test.ts` — dynasty-favor/feud → settlement prosperity ±5, world activities.
- `stage09-world.test.ts` — thread old-enemy decreases settlement prosperity, six worlds stability, 50-year determinism.
- `stage10-world-integration.test.ts` — `normalizeWorldState` never throws on missing world.
- `stage11-long-term.test.ts` / `stage11-world-metrics.test.ts` — `worldMetrics` bounds/emptiness/determinism.
- `stage13-soak.test.ts` — 10-generation × 250-year soak, all six worlds saturated.

---

## 10. Recommended Next Step (Stage 04.2 Implementation)

Implement the two narrative conditions (`settlement`, `worldFaction`) plus tests, then run typecheck/lint/tests/build. Stop after 04.2; do not proceed to 04.3 without approval.

**Report file:** `STAGE_04_2_AUDIT_REPORT.md`
