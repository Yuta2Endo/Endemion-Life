# Stage 04.5.4 — World Consequence Feedback

**Project:** Endemion Life  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`  
**HEAD:** `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Implementation date:** 10.11.2026  
**Final status:** **COMPLETED WITH KNOWN BLOCKERS** (all blockers pre-existing and unrelated)

---

## 1. Executive Summary

Stage 04.5.4 closes the loop **player decision → world change → measurable outcome → new narrative opportunity** with one bounded event.

**Implemented mechanic — “Ashen Capital revived” (`world.settlement-recovery.ash-capital`):**

1. If the dynasty previously helped Ashen Capital during the Stage 04.5.1 crisis (`aid`), that decision is permanently recorded in `lineage.storyProgress` under machine ids (`story.ancestor-promise` / `world.settlement-crisis.ash-capital` / `aid`).
2. The settlement is simulated by `worldTick`, which already defines **recovery** as stability crossing **70** and emits a recovery activity at that point.
3. A new event becomes eligible only when the actual settlement state satisfies `stability ≥ 70` **and** the dynasty's aid record exists.
4. The heir/character may accept the city's gratitude (renown, reputation, karma, one point of existing settlement influence) or demand a levy (gold, but colder relations).
5. The event is a `kind: "legacy"` event with `maxOccurrences: 1` and `lineageMax: 1`, so the existing `lineage.stories` counter permanently blocks a repeat, including after succession.

**No new persistent data, no new condition, no new effect, no new event queue, no second influence store, no second chronicle, and no save schema change.** The feature reuses `state.world.settlements`, `lineage.storyProgress`, `lineage.stories`, `lineage.worldInfluence`, `when.settlement`, `when.storyChoice`, `fx.settlement`, `fx.influence`, and the existing legacy-event repetition rules.

No commit, push, deployment, or production change.

---

## 2. Initial Branch, HEAD, and Git Status

Verified before any edit:

```
Branch:   main
HEAD:     1bcf224
Staged:   0
Modified: 38
Untracked: 62
```

The counts match the post-04.5.3 working tree (38 modified, 62 untracked including the 04.5.3 report and test). All four prior Stage 04.5 reports were reviewed, and the actual source was inspected before design.

---

## 3. Architecture Audit Findings

### World state and simulation (`world/state.ts`, `world/rules.ts`, `engine/game.ts`)

| Mechanism | Finding |
|---|---|
| `worldTick` | Single deterministic yearly world step, called from the existing `advance` pipeline **before** `selectEvent`. |
| Settlement prosperity | Persistent, 0–100, drifts from cycle, Stage 04.5.2 influence, and seeded RNG. |
| Settlement stability | Persistent, 0–100, drifts from prosperity and seeded RNG. |
| Recovery definition | `worldTick` treats `beforeStability < 70 && stability >= 70` as recovery and emits activity `recovery.<id>`. This is the codebase's existing expression of a meaningful recovery outcome. |
| Faction standing | Derived each tick from power, influence, and Stage 04.5.2 influence bonus. |
| Activity log | Bounded (24), evictable, presentation-oriented. Unsuitable as a machine trigger. |
| `worldInfluence` | Lineage-scoped `{ settlements, factions }`, applied inside `worldTick`. |

### Narrative selection (`narrative/types.ts`, `dsl.ts`, `selection.ts`, `engine/conditions.ts`)

- `isEligible` is a pure function of age/stage, occurrence counters, lineage story counters, cooldown, conditions, and choice availability.
- Existing conditions already include `when.settlement(id, prosperity?, stability?)`, `when.worldFaction(...)`, `when.storyStage(...)`, `when.storyChoice(...)`, `when.storyCompleted(...)`, and `when.generation(...)`.
- `when.settlement` and `when.worldFaction` read live world state each evaluation — no caching or stale flags.
- Legacy events (`kind: "legacy"`) increment `lineage.stories[event.id]` in `recordStory`, which `lineageMax` reads.
- `fx.schedule` is character-scoped (`state.scheduled` is reset on succession), so it cannot express a cross-generation or lineage-level feedback trigger.

### Existing Stage 04.5 behavior

- **04.5.1** — crisis event fires only at `stability ≤ 34`; faction invitation fires at Order influence `≥ 10`. Nothing reacts to a settlement recovering.
- **04.5.2** — influence is a bounded numeric footprint applied in `worldTick`; no narrative reads it directly, but its effects are visible in settlement/faction state.
- **04.5.3** — ancestor-promise is generation-gated and driven by `storyProgress`, not by a world outcome.

### Save and succession

- `lineage.storyProgress` and `lineage.worldInfluence` are already validated; both are optional and normalized.
- `succeed` deep-clones `lineage` and preserves `world` through `normalizeWorldState`.
- `state.occurrences` is character-scoped and reset on succession; `lineage.stories` is lineage-scoped and persists.
- No new field was needed, so the migration contract was not touched.

---

## 4. Identified Missing Feedback Loop

The concrete gap:

> `worldTick` already detects and logs a settlement **recovery** at stability 70, and the dynasty can influence whether that happens — but no narrative event can ever react to the recovered state. The only settlement event fires during the crisis (stability ≤ 34); once the city actually recovers, the world is silent.

This satisfies the design gate:

1. **Real measurable outcome** — `stability ≥ 70`, the same threshold `worldTick` uses.
2. **Connected to a prior decision** — the `aid` choice in `world.settlement-crisis.ash-capital`.
3. **Clear eligibility** — one world condition plus one machine-readable lineage record.
4. **Observable consequence** — the choice changes renown, reputation, karma, wealth, and (capped) settlement influence.
5. **Reuses existing state and DSL** — no new framework.
6. **Cannot repeat indefinitely** — `maxOccurrences` + `lineageMax` + `lineage.stories`.
7. **Deterministic** — no RNG in eligibility or effects.
8. **No broad refactor** — one event added to the existing world definition.

---

## 5. Design Decision and Rejected Alternatives

**Chosen:** a recovery-recognition event keyed to live settlement stability and the recorded `aid` choice.

| Alternative | Why rejected |
|---|---|
| Add a `recoveryScore` field | Existing `stability` already expresses recovery; `worldTick` already defines the threshold. A score would be invented and redundant. |
| Trigger from the world activity log | The log is bounded (24), unordered for this purpose, and evictable. Reading it would create stale/missing-trigger bugs and couple narrative to presentation. |
| Add a lineage-scoped scheduled event | Would duplicate the narrative engine; `fx.schedule` is character-scoped and reset on succession anyway. |
| Add a new DSL condition (e.g. `lineageInfluence`) | `when.settlement` + `when.storyChoice` already express the mechanic exactly. |
| Reuse the faction invitation | That already covers faction growth (`when.worldFaction(... min: 10)`) and is a different outcome. |
| Add `lineage.generationalMemory` | `lineage.stories` already records one-time legacy events across generations. A second store would duplicate semantics and require new save validation/migration. |
| Gate on `generation ≥ 2` | 04.5.3 already covers generational memory. 04.5.4 is about a **world outcome**, which may legitimately occur in the same life. Imposing a generation gate would weaken the feedback loop without adding safety. |

---

## 6. Exact Event Eligibility Rules

Event `world.settlement-recovery.ash-capital`:

- `kind: "legacy"`;
- `maxOccurrences: 1`;
- `lineageMax: 1`;
- `minAge: 16`;
- conditions:
  - `when.settlement("ash-capital", undefined, { min: 70 })` — the settlement is actually recovered;
  - `when.storyChoice("story.ancestor-promise", "world.settlement-crisis.ash-capital", "aid", "lineage")` — the dynasty actually helped during the crisis.

Both conditions are machine ids and live state. No localized text, no array-order dependence, no activity-log scan.

Because eligibility is a live read, the event cannot fire from a stale or unrelated world state: if Ash Capital drops below 70 before selection, the condition fails.

---

## 7. World Outcome Source of Truth

Single source of truth: `state.world.settlements[ash-capital].stability`.

- `worldTick` clamps stability to 0–100 and emits the existing recovery activity when it crosses 70.
- The event uses the same 70 threshold, so the narrative definition of “recovery” and the simulation definition are identical.
- No duplicate or parallel “recovery score” exists.
- The settlement entity is addressed by the stable id `ash-capital`.

---

## 8. Narrative Consequence and Effects

**`accept` — “Accept the city's gratitude”**

- `fx.renown(+2)`;
- `fx.rep(+2)`;
- `fx.karma(+2)`;
- `fx.influence("settlement", "ash-capital", +1)` — reused Stage 04.5.2 store, clamped to ±5.

No settlement stat inflation and no new world modifier.

**`levy` — “Ask the city for a levy”**

- `fx.wealth(+20)`;
- `fx.renown(+1)`;
- `fx.karma(-3)`;
- `fx.rep(-1)`.

No settlement or influence change.

Both choices are meaningful, bounded, and target only the relevant systems. The effects respect existing caps (`RENOWN_LIMIT`, `REPUTATION_LIMIT`, `KARMA_LIMIT`, `MAX_WORLD_INFLUENCE`, `WEALTH_MAX`).

---

## 9. Repetition Prevention

Three independent layers, all existing:

1. `maxOccurrences: 1` — prevents a second occurrence for the same character.
2. `kind: "legacy"` — `recordStory` increments `lineage.stories[event.id]`.
3. `lineageMax: 1` — `isEligible` permanently blocks the event once `lineage.stories[event.id] ≥ 1`.

`lineage.stories` is deep-cloned on succession, so the block survives every later generation. A test resets `occurrences` to 0 and confirms `lineageMax` still blocks the event.

No new memory entry, no duplicate reward path, and no consumable event in a queue.

---

## 10. Save Schema and Migration Decision

- `SAVE_SCHEMA_VERSION` remains **8**.
- No new serialized field, no new type, no normalization change, no migration.
- `parseSave` intentionally unchanged; it does not inject fields outside the migration contract.
- `lineage.storyProgress`, `lineage.stories`, and `lineage.worldInfluence` were already validated.
- Legacy saves without `storyProgress` remain valid and are normalized to `{}` by the existing action boundary.
- Malformed `storyProgress` is still rejected by `checkLineage`.
- Round-trip and succession are covered by tests.

---

## 11. Exact Files Changed

| File | Change |
|---|---|
| `packages/game-core/src/universes/dark-fantasy.world.ts` | Added one event `world.settlement-recovery.ash-capital` after the 04.5.3 ancestor event. |
| `packages/game-core/test/stage04-5-4-world-feedback.test.ts` | **New**: 22 focused tests. |
| `STAGE_04_5_4_IMPLEMENTATION_REPORT.md` | **New**: this report. |

No engine, save, type, shared-contract, web, API, or Android file was modified.

---

## 12. Test Coverage and Exact Results

New file: `packages/game-core/test/stage04-5-4-world-feedback.test.ts` — **22 tests, 22 passing**.

| # | Required coverage | Test(s) |
|---|---|---|
| 1 | Unavailable before the world outcome | `при памяти о помощи событие недоступно, пока город не восстановился` (stability 69) |
| 2 | Eligible after the outcome | `при памяти о помощи и реальном восстановлении событие доступно` |
| 3 | Unrelated settlement does not satisfy | `восстановление другого поселения не открывает событие` |
| 4 | Responds to state, not localized text | `условия опираются на состояние мира и машинные id…` |
| 5 | Meaningful testable effect | `принятие благодарности…`, `подать даёт золото…` |
| 6 | Correct world entity | `…ограниченное влияние`, target checks |
| 7 | Caps respected | `влияние уважает существующий предел 04.5.2…` |
| 8 | No duplicate rewards | `одно и то же восстановление не выдаёт награду дважды` |
| 9 | Persistence after save/load | `полученная реакция… переживают сохранение и загрузку` |
| 10 | Legacy saves valid | `старое сохранение без storyProgress остаётся валидным` |
| 11 | Succession correct | `родовая реакция и память… переживают наследование`, `…не повторяется после следующего наследования` |
| 12 | Identical sequences identical | `одинаковые состояния и выборы…` |
| 13 | Deterministic selection | `выбор события детерминирован…` |
| 14 | Repeated ticks no duplicates | `повторные worldTick не выдают родовую награду…` |
| 15 | 04.5.1 regression | `Stage 04.5.1: кризис по-прежнему…`, plus the full 04.5.1 file |
| 16 | 04.5.2 regression | `Stage 04.5.2: влияние по-прежнему…`, plus the full 04.5.2 file |
| 17 | 04.5.3 regression | `Stage 04.5.3: сюжет памяти предка…`, succession test, plus the full 04.5.3 file |
| 18 | Story scope/completion intact | `…сохраняет свою область и завершение` |

Additional tests: unavailable without memory even at 70; malformed story progress rejected; content validation (`eventProblems`).

**Exact QA runs:**

| Check | Result |
|---|---|
| Focused Stage 04.5.4 file | **22 / 22 passing** (exit 0) |
| 04.5.1 + 04.5.2 + 04.5.3 + 04.5.4 files | **94 / 94 passing**, 4 files (exit 0) |
| Full game-core suite, sequential (`--no-file-parallelism`) | **608 / 609 passing**, 1 failed, 42 files (exit 1) |
| Full game-core suite, parallel | **608 / 609 passing**, 1 failed, 42 files (exit 1) |
| Shared package | **12 / 12 passing**, 2 files (exit 0) |

The single failure is the known pre-existing `stage01-life-upgrade.test.ts > keeps the decision provenance when a delayed consequence arrives` (`expected undefined to be 'mu.bandits'`). No new failures.

---

## 13. Typecheck and Lint Results

- `packages/game-core`: `npx tsc -p tsconfig.json --noEmit` → **exit 0**.
- ESLint on `dark-fantasy.world.ts` and the new test file → **exit 0** (`ESLINT_OK`).
- Shared tests run; no shared contract modified.
- Root `pnpm lint` was **not** run; historically red for unrelated pre-existing reasons.
- Web/API test suites were not run; no web/API file was touched.

---

## 14. Determinism Verification

- No `Math.random()`, wall-clock time, browser API, or server API added.
- Eligibility is a pure read of `state.world` and `lineage.storyProgress`.
- Choice effects use no RNG.
- `worldTick` continues to use its existing seeded RNG; the new event neither consumes nor alters it.
- Identical cloned states with the same choice produce identical world, influence, reputation, and lineage records.
- `selectEvent` on identical clones with the same seed produces the same result.
- Repeated `worldTick` calls neither grant renown nor increment `lineage.stories`.

---

## 15. Succession Verification

- `succeed` deep-clones `lineage`, preserving `storyProgress`, `stories`, and `worldInfluence`.
- `world` persists via `normalizeWorldState`, so a recovered settlement remains recovered.
- Test: an unconsumed reaction remains eligible for the heir, and the 04.5.3 ancestor event still works.
- Test: a consumed reaction stays blocked because `lineage.stories[event] = 1` persists while character `occurrences` resets.
- Character-scoped progress stays separate; the new event writes nothing to `character.storyProgress`.
- Succession rules were not changed.

---

## 16. Stage 04.5.1 Regression Results

- Full 04.5.1 file: **23 / 23 passing** (included in the 94/94 run).
- The crisis event still spends gold and restores prosperity/stability.
- The delayed follow-up and faction invitation are unchanged.
- `eventProblems("dark-fantasy")` remains empty.

---

## 17. Stage 04.5.2 Regression Results

- Full 04.5.2 file: **26 / 26 passing** (included in the 94/94 run).
- Influence still initializes, stacks, caps, applies through `worldTick`, and survives save/load and succession.
- The new event uses the existing influence store and confirms the ±5 cap; it does not create a second counter.

---

## 18. Stage 04.5.3 Regression Results

- Full 04.5.3 file: **23 / 23 passing** (included in the 94/94 run).
- `story.ancestor-promise` still advances on `aid`, still gates the ancestor event at generation 2, and still completes without repeating.
- The new event reads the recorded `aid` choice but never advances or completes that story, so both mechanics remain independent and composable.
- Test confirms the new event leaves `storyProgress` stage 1 and the recorded choice untouched.

---

## 19. Known Blockers

| Blocker | Origin | Impact |
|---|---|---|
| `stage01-life-upgrade.test.ts` delayed-consequence provenance fails | Pre-existing, documented since the Stage 04.5 audit | None; unrelated source path |
| JSX errors in `apps/web/src/components/play/lineage.tsx` block web typecheck/build | Pre-existing uncommitted web work | None; file untouched |
| Root `pnpm lint` historically fails | Pre-existing Android/test issues | None; changed-file lint clean |
| Reaction may occur in the same life as the `aid` decision if the city recovers that quickly | Intentional: 04.5.4 reacts to a world outcome, not a generation; still one-time and bounded | None |

No new failures were introduced.

---

## 20. Confirmation that Existing Work Was Preserved

- Initial inventory: **38 modified, 62 untracked, 0 staged**.
- Final inventory before this report: **38 modified, 63 untracked** (only the new test file added).
- All previously modified files remain modified; no pre-existing untracked file was deleted.
- No `git reset`, `git clean`, `git restore`, `git checkout`, or destructive branch operation was used.
- HEAD remains `1bcf224`.
- No existing test was deleted or weakened.

---

## 21. Confirmation that No Commit, Push, or Deployment Occurred

- No `git commit`;
- no `git push`;
- no deployment;
- production at `https://life.endemion.online` was neither touched nor verified.

---

## 22. Final Status

**COMPLETED WITH KNOWN BLOCKERS**

Acceptance criteria:

1. ✅ A concrete missing world-to-narrative feedback loop was identified.
2. ✅ The event responds to a real world outcome (`stability ≥ 70`, the same threshold `worldTick` uses).
3. ✅ The outcome is connected to a prior decision by machine id (`aid` in the crisis event).
4. ✅ Existing architecture is reused; no new field, condition, effect, queue, or engine.
5. ✅ No duplicate store or persistent state.
6. ✅ The consequence is observable and tested.
7. ✅ Repetition and duplicate rewards are prevented by three existing layers.
8. ✅ Determinism preserved.
9. ✅ Save/load and succession verified.
10. ✅ Stage 04.5.1, 04.5.2, and 04.5.3 regressions pass.
11. ✅ New tests pass (22/22).
12. ✅ Existing failures documented accurately.
13. ✅ All pre-existing work preserved.
14. ✅ No commit, push, or deployment.

**Stop here. Awaiting approval before the next stage.**
