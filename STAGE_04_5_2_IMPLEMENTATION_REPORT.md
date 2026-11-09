# Stage 04.5.2 — Dynasty → World Persistent Influence

**Project:** Endemion Life  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`  
**HEAD:** `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Implementation date:** 10.11.2026  
**Final status:** **COMPLETED WITH KNOWN BLOCKERS** (all blockers are pre-existing and unrelated)

---

## 1. Executive Summary

Stage 04.5.2 adds a small, bounded, deterministic mechanic through which a dynasty's accumulated decisions permanently shape the Living World.

**What was implemented:**

- A validated lineage-scoped structure, `lineage.worldInfluence`, with two closed categories (`settlements`, `factions`) and no unrestricted string dictionary.
- A new DSL/effect pair, `fx.influence(kind, id, delta)` / `Effect { type: "influence" }`, that awards persistent influence from real narrative choices.
- Integration into the **existing** Stage 04.5.1 events: settlement crisis, its delayed follow-up, and the Order of Ash invitation now award influence in addition to their existing effects. The events were not rewritten and their occurrence rules were not changed.
- Application inside the **existing** `worldTick` — no second simulation tick, no new RNG:
  - settlement influence shifts yearly prosperity by −2…+2;
  - faction influence modifies the derived faction standing by −10…+10.
- Range caps (±5 per entity), entry caps (8 per category), catalog validation, duplicate rejection, and strict save validation.
- Legacy-save compatibility: saves without the field load and play unchanged; the field is normalized at the existing action boundary.

No world-state duplication, no generational world memory, no new narrative history system, no Stage 04.5.3 work. No commit, push, deployment, or production change.

---

## 2. Initial Branch, HEAD, and Git Status

Verified before any edit:

```
Branch: main
HEAD:   1bcf224
Status: 38 modified files, 58 untracked files
```

The working tree contained the completed Stage 04.5.1 work plus all earlier pre-existing modifications. The Stage 04.5.1 report and its regression test file were read first. No destructive Git operation was used.

Final inventory after implementation: **38 modified, 59 untracked** (the only new file is the Stage 04.5.2 test file; the report adds one more untracked file). No previously modified file left the modified set, and no previously untracked file was removed.

---

## 3. Architecture Findings

Actual order in `engine/game.ts`:

1. `ageOneYear` ages the character.
2. Universe world rules run.
3. `worldTick` updates settlements, factions, and the bounded `WorldActivity` log.
4. NPC, consequence, lineage, and mastery yearly phases run.
5. `selectEvent` chooses a scheduled or weighted eligible event.
6. `choose` validates `requires`, optionally consumes the seeded RNG, applies effects, and records lineage stories.
7. `succeed` deep-clones `lineage` and normalizes/carries `world`.

Relevant existing facts:

- `LineageState` is already the cross-generation container (renown, stories, relics, story progress) and is deep-cloned on succession.
- `WorldState` is carried across succession but is normalized against the current universe catalog; it stores only settlements, factions, tick, and activities.
- `worldTick` already contains dynasty effects (renown-driven prosperity), settlement crisis detection (`stability < 35`), and faction drift, and it derives faction `standing` from stored `power`/`influence`.
- Existing effects can change a settlement's prosperity/stability (`fx.settlement`, added in 04.5.1) but nothing could record a **persistent dynasty-level** relationship.
- `fx.faction` changes the current character's personal faction standing, not a dynasty-level value; it naturally feeds `worldTick` but is character-scoped and resets with succession.
- `isEligible`, `maxOccurrences`, `lineageMax`, `fx.schedule`, and scheduled-event re-validation already handle repetition and stale opportunities.
- Save compatibility tests assert that parsing an old save adds only the fields introduced by that old save's own migration. Therefore new non-schema normalization must **not** happen inside `parseSave`.

---

## 4. Data Model and Why It Was Chosen

```ts
export type WorldInfluenceKind = "settlement" | "faction";

export interface WorldInfluenceEntry {
  id: string;   // id from the current universe catalog
  value: number; // integer, −5…+5, never 0
}

export interface WorldInfluenceState {
  settlements: WorldInfluenceEntry[];
  factions: WorldInfluenceEntry[];
}
```

`LineageState.worldInfluence: WorldInfluenceState` is required for newly created dynasties.

**Why lineage, not world state:**

- Influence is a property of the dynasty, not of the current character; it must survive succession. `lineage` is already deep-cloned by `succeed`.
- Storing it in `world` would either be redundant with lineage or would be lost/mis-normalized by `normalizeWorldState`, which rebuilds settlements/factions from the universe catalog and would need a parallel persistence path.
- The audit's `Record<string, number>` was rejected: it allows arbitrary keys, mixes settlements and factions, and cannot be validated against a stable contract. Two closed categories plus catalog-validated ids are explicit and bounded.

**Why not store influence values directly inside `WorldSettlementState`/`WorldFactionState`:**

- Those values are the world's current state, not the dynasty's historical footprint.
- Derived faction values (`standing`) must remain computed, per the stage brief. The influence bonus is added to the derived formula each tick and is never written back as a second stored value.

---

## 5. Influence Semantics, Ranges, and Caps

**Meaning:**

- `settlements[i].value` — how strongly the dynasty has supported or harmed that settlement over its history.
- `factions[i].value` — how strongly the dynasty has backed or opposed that faction over its history.

**Ranges and caps:**

| Limit | Value | Rationale |
|---|---|---|
| Per-entry value | −5…+5 (`MAX_WORLD_INFLUENCE`) | Small integer footprint; keeps yearly drift meaningful but subordinate to existing world mechanics |
| Entries per category | 8 (`MAX_WORLD_INFLUENCE_ENTRIES`) | Defensive bound (current universes have 3 settlements and 3–4 factions) |
| Zero entries | Removed | Absence means no influence; no meaningless zero records |
| Unknown id | Ignored at runtime, rejected in saves | Prevents influence on entities outside the current universe |
| Duplicate id | Rejected in saves; impossible at runtime | One value per entity |

**Derived application coefficients:**

- Settlement yearly prosperity drift: `0` at 0, `±1` at `±1…±2`, `±2` at `±3…±5`.
- Faction derived standing bonus: `value × 2`, i.e. `−10…+10`.

Every non-zero influence value is observable. This piecewise mapping replaced a plain `/2` truncation because `±1` would otherwise have produced no effect.

---

## 6. Influence Sources

Influence is earned only from real Stage 04.5.1 choices:

| Event | Choice | Influence awarded |
|---|---|---|
| `world.settlement-crisis.ash-capital` | `aid` | settlement `ash-capital` +2 |
| same | `influence` | settlement +1, faction `order-of-ash` +1 |
| same | `ignore` | settlement −1 |
| `world.settlement-crisis-followup.ash-capital` | `pay` | settlement +2 |
| same | `refuse` | settlement −2 |
| `world.faction-invitation.order-of-ash` | `accept` | faction +2 |
| same | `negotiate` success / failure | faction +1 / −1 |
| same | `decline` | faction −1 |

No automatic yearly award exists. Eligibility alone awards nothing — the player must choose. No new story chains or sources were introduced.

---

## 7. World Application Mechanics

All application happens inside the existing `worldTick`:

- **Settlements:** the yearly prosperity update is now

  `prosperity += cycleDrift + influenceDrift + rng.int(-1, 1)`

  then clamped to 0–100. Stability and population formulas are unchanged.

- **Factions:** the derived standing is now

  `standing = clamp(round((power − 50) × 0.8 + influence × 0.2) + bonus, −100, 100)`

  where `bonus = dynastyFactionInfluence × 2`. Stored `power` and `influence` formulas are unchanged.

- No extra tick, no extra RNG stream, no new event engine, no parallel queue.

`changeWorldInfluence` is the only mutation path: it validates the id against the current universe, clamps the sum, rejects zero, deduplicates by id, and enforces the entry cap. Unknown ids are silent no-ops at runtime.

---

## 8. Stacking, Decay, and Balance Rules

- **Stacking:** repeated awards sum on the same `{id}` entry, e.g. `+2` then `+1` → `3`.
- **Decay:** none. Influence is permanent until changed by gameplay; a deliberate design choice, bounded by the hard caps.
- **Removal:** if the sum reaches `0`, the entry is removed.
- **Reapplication:** capped at `±5`; further awards saturate.
- **Multiple effects:** different choices may target the same entity and stack under the same cap.
- **Runaway growth prevention:**
  - per-entry cap `±5`;
  - derived settlement drift `≤ 2/year`, with world prosperity clamped to 100;
  - derived faction bonus `≤ 10`, with standing clamped to −100…100;
  - no feedback from the bonus into stored faction `influence` or into event eligibility.
- A 30-year simulation with maximal positive settlement influence stays `≤ 100` prosperity and `5` influence (covered by test).

---

## 9. Save Schema and Migration Decision

- `SAVE_SCHEMA_VERSION` remains **8**.
- The field is additive on `lineage`, which already survives succession. No migration step is required.
- `parseSave` does **not** inject the field: existing save-compatibility tests assert that parsing an old save does not silently add fields outside that save's historical migration. Injecting it there caused 15 save-compat test failures during implementation; this was detected and corrected.
- Legacy saves without `lineage.worldInfluence`:
  - pass `checkLineage` (the field is optional during validation);
  - are normalized to `{ settlements: [], factions: [] }` at the existing action boundary in `applyAction`, matching the established pattern for `storyProgress` and other late-added fields;
  - are safe to simulate even before the first action because `worldInfluenceValue` treats an absent structure as zero.
- New saves are strictly validated. `checkLineage` now receives the universe and rejects:
  - a non-object influence structure;
  - more than 8 entries per category;
  - non-integer values or values outside ±5;
  - ids not present in the current universe's settlement/faction catalogs;
  - duplicate ids.
- Save/load round-trip and succession are tested.

---

## 10. Exact Files Changed

| File | Change |
|---|---|
| `packages/game-core/src/types.ts` | Added `WorldInfluenceKind`, `WorldInfluenceEntry`, `WorldInfluenceState`; added `LineageState.worldInfluence`. |
| `packages/game-core/src/legacy/chronicle.ts` | `newLineage()` initializes empty influence. |
| `packages/game-core/src/world/state.ts` | Added caps, `emptyWorldInfluence`, `worldInfluenceValue`, `settlementInfluenceDrift`, `factionInfluenceBonus`, `changeWorldInfluence`; integrated both effects into `worldTick`. |
| `packages/game-core/src/narrative/types.ts` | Added `Effect` variant `influence { kind, id, delta }`. |
| `packages/game-core/src/narrative/dsl.ts` | Added `fx.influence(kind, id, delta)`. |
| `packages/game-core/src/narrative/selection.ts` | `brokenEffect` validates influence target ids per universe. |
| `packages/game-core/src/engine/effects.ts` | Added `applyEffect` case `influence`. |
| `packages/game-core/src/engine/game.ts` | Legacy normalization of `lineage.worldInfluence` in `applyAction`. |
| `packages/game-core/src/engine/save.ts` | `checkLineage` now validates influence with the universe catalog; strict malformed-data rejection. |
| `packages/game-core/src/universes/dark-fantasy.world.ts` | Added `fx.influence` to existing 04.5.1 choices only. |
| `packages/game-core/test/stage04-5-2-dynasty-world-influence.test.ts` | **New**: 26 focused tests. |
| `STAGE_04_5_2_IMPLEMENTATION_REPORT.md` | **New**: this report. |

No web, API, Android, or shared-contract file was modified.

---

## 11. Test Coverage and Exact Results

New file: `packages/game-core/test/stage04-5-2-dynasty-world-influence.test.ts` — **26 tests, 26 passing**.

| # | Required coverage | Test(s) |
|---|---|---|
| 1 | Influence initializes correctly | `новая династия начинает с пустым влиянием` |
| 2 | Invalid keys rejected/normalized | `неизвестные поселения и фракции не принимают влияние`, `испорченные данные влияния отклоняются…` |
| 3 | Values outside range handled safely | `влияние зажимается в допустимый диапазон ±MAX`, malformed-save test |
| 4 | Real gameplay choice awards influence | aid / ignore / accept / pay choice tests |
| 5 | Influence affects intended entity | `влияние на поселение добавляет процветание…`, `влияние на фракцию меняет её производное отношение…` |
| 6 | Unrelated entities untouched | same two tests (`mist-border`, `mist-cult`) |
| 7 | Observable in world state | same two tests plus `влияние не меняет мир в момент выдачи — только в годовом тике` |
| 8 | Repeated choices cannot exceed limits | clamp test and `влияние не даёт неограниченного роста значений мира` |
| 9 | Reapplication/stacking semantics | `влияние складывается по одному и тому же id`, `нулевое влияние удаляет запись…` |
| 10 | Applied in the correct simulation phase | phase test (`worldTick` only) |
| 11 | Yearly application deterministic | `годовое применение влияния детерминировано` |
| 12 | Drift and crisis remain coherent | `влияние не отменяет существующую логику кризиса` |
| 13 | No unbounded value growth | 30-year growth test |
| 14 | Influence survives save/load | `влияние переживает сохранение и загрузку` |
| 15 | Influence survives succession | `влияние переживает наследование` |
| 16 | Legacy saves remain valid | `старое сохранение без поля влияния остаётся валидным` |
| 17 | Malformed save data handled safely | `испорченные данные влияния отклоняются…` |
| 18 | Stage 04.5.1 settlement crisis intact | `кризис поселения по-прежнему доступен…`, `влияние не подменяет личный прогресс…`, plus the full 04.5.1 file |
| 19 | Stage 04.5.1 faction narrative intact | `приглашение фракции по-прежнему зависит от её влияния`, plus the full 04.5.1 file |
| 20 | Existing lineage/world systems functional | scope test, legacy-tick test, and the full suite |

Additional tests: closed-category coefficient table, negotiation success/failure effects, eligibility-without-award, old-world-state tick safety.

**Exact QA runs:**

| Check | Result |
|---|---|
| Focused Stage 04.5.2 + Stage 04.5.1 files | **49 / 49 passing** (2 files) |
| Full game-core suite, sequential (`--no-file-parallelism`) | **563 / 564 passing**, 1 failed (40 files) |
| Full game-core suite, parallel | **563 / 564 passing**, 1 failed (40 files) |
| Shared package | **12 / 12 passing** (2 files) |

The single game-core failure is the known pre-existing `stage01-life-upgrade.test.ts > keeps the decision provenance when a delayed consequence arrives` (`expected undefined to be 'mu.bandits'`).

During one earlier parallel run, two additional heavy tests (`stage04-events`, `stage04-import`) exceeded the default 5 s timeout under worker contention. Both pass in isolation and in the sequential and subsequent parallel runs. They are timing flakes, not regressions; no source used by them was changed.

---

## 12. Typecheck and Lint

- `packages/game-core`: `npx tsc -p tsconfig.json --noEmit` → **exit 0**.
- ESLint on all changed source and test files → **exit 0** (verified after fixing test-only `any` and an unused import in the new test file).
- Shared tests were run because save/world contracts are shared conceptually; no shared file was modified.
- Root `pnpm lint` was **not** run; it is historically red for unrelated pre-existing reasons.
- Web/API test suites were not run; no web/API file was touched.

---

## 13. Determinism Verification

- No `Math.random()`, wall-clock time, browser API, or server API was added.
- No new RNG stream or extra draw was introduced. Settlement influence is deterministic arithmetic; faction influence is deterministic arithmetic on a derived value.
- `worldTick` still derives its local RNG from `${seed}::world::${age}::${rng.state}`; adding influence does not change the number or order of RNG calls.
- Test `годовое применение влияния детерминировано` ticks two identical clones with the same seed and asserts identical `world` and identical influence.
- The controlled before/after tests rely on identical RNG sequences, so observed differences are exactly the influence coefficients.

---

## 14. Succession Verification

- `succeed` deep-clones `lineage`, so `worldInfluence` transfers with the dynasty unchanged.
- Test `влияние переживает наследование` asserts the heir's influence equals the deceased's, with both positive and negative entries, and that `world` remains defined.
- Repeated influence application is capped before and after succession, so a successor cannot inherit an unbounded modifier.
- Character-scoped faction standing still resets on succession; only the dynasty-level influence persists.

---

## 15. Stage 04.5.1 Regression Results

- The Stage 04.5.1 test file passes **23 / 23**.
- The three 04.5.1 events retain their titles, texts, conditions, occurrence limits, scheduling, and existing effects; only additional `fx.influence` effects were appended to choices.
- Settlement crisis still changes prosperity/stability; the delayed follow-up still schedules and re-validates; the faction invitation still depends on `worldFaction` influence ≥ 10.
- `eventProblems("dark-fantasy")` remains clean, so the new effect ids validate against the universe catalog.

---

## 16. Known Blockers

| Blocker | Origin | Impact |
|---|---|---|
| `stage01-life-upgrade.test.ts` delayed-consequence provenance fails (`expected undefined to be 'mu.bandits'`) | Pre-existing, documented in the Stage 04.5 audit and Stage 04.5.1 report | None; unrelated source path |
| JSX errors in `apps/web/src/components/play/lineage.tsx` block web typecheck/build | Pre-existing uncommitted web work | None; file untouched |
| Root `pnpm lint` historically fails | Pre-existing Android/test issues | None; changed-file lint is clean |
| Occasional 5 s timeout of heavy tests under parallel worker contention | Harness load, not deterministic failure | None; tests pass in isolation and sequentially |

No new failures were introduced.

---

## 17. Preservation of Pre-Existing Work

- Initial inventory: **38 modified, 58 untracked**.
- Final inventory: **38 modified, 59 untracked** before this report (the only addition is the new test file).
- All previously modified files remain modified; no pre-existing untracked file was deleted.
- No `git reset`, `git clean`, `git restore`, `git checkout`, or destructive branch operation was used.
- HEAD remains `1bcf224`.
- No earlier stage's behavior, tests, or content was weakened. The only test-suite interaction was ensuring the new field does not alter legacy save-compatibility expectations.

---

## 18. No Commit, Push, or Deployment

Confirmed:

- no `git commit`;
- no `git push`;
- no deployment;
- production at `https://life.endemion.online` was neither touched nor verified.

---

## 19. Final Status

**COMPLETED WITH KNOWN BLOCKERS**

Acceptance criteria:

1. ✅ Dynasty influence has a clear and documented meaning.
2. ✅ The data model is explicit, catalog-validated, bounded, and not an unrestricted dictionary.
3. ✅ Influence comes from actual Stage 04.5.1 gameplay choices.
4. ✅ Influence has a persistent, observable world consequence.
5. ✅ Influence survives succession.
6. ✅ Stacking and balance are controlled by hard caps and bounded yearly modifiers.
7. ✅ The system is deterministic.
8. ✅ Save compatibility is preserved; schema remains 8.
9. ✅ Stage 04.5.1 behavior remains intact.
10. ✅ New tests pass (26/26).
11. ✅ Existing unrelated failures are documented accurately.
12. ✅ All pre-existing working-tree changes are preserved.
13. ✅ No commit, push, or deployment.

**Stop here. Awaiting approval before Stage 04.5.3.**
