# Stage 04.5.3 — Generational World Memory

**Project:** Endemion Life  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`  
**HEAD:** `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Implementation date:** 10.11.2026  
**Final status:** **COMPLETED WITH KNOWN BLOCKERS** (all blockers are pre-existing and unrelated)

---

## 1. Executive Summary

Stage 04.5.3 makes the Living World remember a significant decision from a previous generation and lets a later heir encounter its narrative consequence.

**Implemented mechanic — “Ashen Capital remembers”:**

1. When the dynasty helps Ashen Capital during the Stage 04.5.1 settlement crisis (`aid`), the choice now also starts a lineage-scoped story record:
   - `lineage.storyProgress["story.ancestor-promise"]` advances from stage 0 to 1;
   - the choice is recorded by stable id: event `world.settlement-crisis.ash-capital`, choice `aid`.
2. A new follow-up event, `world.ancestor-promise.ash-capital`, becomes eligible only for a later generation while that lineage story is at stage 1.
3. The heir can renew the promise (spend gold, restore the settlement, reinforce existing world influence) or simply honour the memory (renown/karma only).
4. Either choice advances the story to stage 2, marks it completed, and records the follow-up in `lineage.stories`, so it cannot repeat in this or any later generation.

**No new persistent data structure, no new DSL condition, no new effect type, no new event engine, no second chronicle, and no save schema change.** The feature reuses `lineage.storyProgress`, `lineage.stories`, `lineage.chronicle`, `lineage.worldInfluence`, `when.storyStage`, `when.generation`, `fx.advanceStory`, `fx.recordStoryChoice`, `fx.completeStory`, `fx.settlement`, and `fx.influence`.

No commit, push, deployment, or production change.

---

## 2. Initial Branch, HEAD, and Git Status

Verified before any edit:

```
Branch: main
HEAD:   1bcf224
Status: 38 modified files, 60 untracked files
```

This matches the reported post-04.5.2 working tree (38 modified, 60 untracked including the 04.5.2 report and test file). All pre-existing work was read and preserved.

The `STAGE_04_5_AUDIT_REPORT.md`, `STAGE_04_5_1_IMPLEMENTATION_REPORT.md`, and `STAGE_04_5_2_IMPLEMENTATION_REPORT.md` were reviewed before implementation.

---

## 3. Architecture Audit Findings

### Lineage history

| Structure | Exact semantics |
|---|---|
| `lineage.chronicle` | Bounded human-readable event record; entries carry `kind`, `who`, `v` values, source, and optional link. Archived/trimmed; not a reliable machine-readable memory store for arbitrary choices. |
| `lineage.stories` | Count of each `kind: "legacy"` event occurrence, incremented by `recordStory`. Used by `lineageMax` to prevent repeats across generations. |
| `lineage.storyProgress` | Optional lineage-scoped map `id → { stage, completed, choices }`. Written by `fx.advanceStory`, `fx.recordStoryChoice`, `fx.completeStory`; read by `when.storyStage`, `when.storyChoice`, `when.storyCompleted`; survives succession. |
| `lineage.worldInfluence` | Stage 04.5.2 dynasty-level impact on settlement/faction, applied in `worldTick`. |
| `lineage.relics` | Acquired family relics, with acquisition generation/age. |

These structures are not interchangeable: `chronicle` is a log, `stories` is a counter, `storyProgress` is state, `worldInfluence` is a numeric footprint.

### Narrative chain system

- Story chains already support cross-generation progression: `story.broken-oath.1 → .2 → .3` uses a lineage-scoped story id, stage conditions, recorded choices, scheduling within a life, and completion.
- `lineage.storyProgress` is deep-cloned on succession; there is no need for a new persistence mechanism.
- `recordStory` increments `lineage.stories` only for `kind: "legacy"`, which gives a second, independent anti-repeat guard (`lineageMax`).
- `fx.schedule` is **character-scoped**: `state.scheduled` is reset to `[]` on succession. Scheduling therefore cannot be used for a cross-generation trigger.
- `takeScheduled` re-validates conditions and drops stale continuations; this stage does not need it because the follow-up is naturally eligible, not scheduled.

### World integration

- `worldTick` is the only yearly world simulation step.
- Stage 04.5.1 settlement and faction events already read real world state.
- Stage 04.5.2 influence is lineage-scoped and applied inside the same `worldTick`.
- The existing world activity log is bounded and informational; it was not used as a memory source.

### Save compatibility

- `checkLineage` already validates `storyProgress` strictly when present and allows it to be absent.
- `parseSave` must not add fields outside the established migration contract; existing save-compatibility tests enforce this.
- Therefore no new field was introduced and no `parseSave` change was made.

---

## 4. Existing Lineage Structures Reused

| Need | Reused structure |
|---|---|
| Did an ancestor help Ashen Capital? | `lineage.storyProgress["story.ancestor-promise"]`, stage 1, choice recorded under `choices["world.settlement-crisis.ash-capital"] = "aid"` |
| Has the follow-up already happened? | `lineage.stories["world.ancestor-promise.ash-capital"]` plus story `completed: true` and stage 2 |
| Historical audit trail | Existing `lineage.chronicle` story entries written by the existing story effects |
| World consequence | Existing `lineage.worldInfluence`, `fx.settlement`, and `fx.influence` |
| Anti-repeat | Existing `maxOccurrences`, `lineageMax`, `when.storyStage`, completed flag |

---

## 5. Why No New Data Structure Was Needed

A new `lineage.generationalMemory` field was rejected because:

1. `storyProgress` already represents “a lineage-scoped narrative that began earlier and has not finished”.
2. The memory needs a stage, a completion flag, and a recorded choice — exactly the existing `StoryProgress` shape.
3. `lineage.stories` already counts completed lineage events and blocks repeats across generations.
4. Adding a second memory structure would duplicate `storyProgress` semantics and require new save validation, normalization, and migration work for no gameplay gain.

**Decision: no new serialized field, no new condition type, no new effect type, no schema bump.**

---

## 6. Memory Source and Stable Identifiers

| Item | Stable id |
|---|---|
| Lineage story | `story.ancestor-promise` |
| Source event | `world.settlement-crisis.ash-capital` |
| Source choice | `aid` |
| Follow-up event | `world.ancestor-promise.ash-capital` |

Eligibility never depends on localized chronicle text, array ordering, or record traversal. It reads two direct values: the story stage and the current generation.

Only the `aid` choice marks the memory. `ignore`, `influence`, and `postpone` do not, so not every crisis outcome is treated as a generational event.

---

## 7. Later-Generation Eligibility Rules

`world.ancestor-promise.ash-capital`:

- `minAge: 16`;
- `maxOccurrences: 1` (no repeat within one life);
- `lineageMax: 1` (no repeat across the dynasty);
- `kind: "legacy"` (records into `lineage.stories`);
- conditions:
  - `when.generation(2)` — the dynasty must have continued at least once;
  - `when.storyStage("story.ancestor-promise", 1, "lineage")` — the ancestor must have helped.

For the intended demonstration (founder chooses `aid`), only a successor can satisfy the generation condition. After the follow-up is resolved, stage becomes 2 and `completed` becomes true, so the stage condition fails; independently, `lineageMax: 1` also fails once `lineage.stories[followup] = 1`.

**Documented nuance:** `StoryProgress` does not store the generation in which the ancestor made the decision. If a later-generation character (generation ≥ 2) makes the `aid` choice and then lives long enough, the follow-up could theoretically become eligible in that same life. It remains lineage-scoped, one-time, and cannot repeat. No new field was added solely to eliminate this edge case.

---

## 8. World Consequences

Both choices are real and testable:

**`renew` — “Renew the promise (15 gold)”**

- requires wealth ≥ 15;
- `fx.wealth(-15)`;
- `fx.settlement("ash-capital", { prosperity: +5, stability: +8 })`;
- `fx.influence("settlement", "ash-capital", +1)` — reuses the Stage 04.5.2 store and its ±5 cap;
- `fx.rep(+3)`, `fx.renown(+2)`;
- advances the story 1 → 2 and completes it.

**`honour` — “Thank them and move on”**

- `fx.karma(+2)`, `fx.renown(+1)`;
- no settlement or influence change;
- advances the story 1 → 2 and completes it.

The effect targets only `ash-capital`; `mist-border` and other settlements/factions are untouched. When existing influence is already at the cap (`5`), the follow-up keeps it at `5` rather than exceeding it.

---

## 9. Story Completion and Repetition Rules

A follow-up resolution applies, in order:

1. `fx.advanceStory("story.ancestor-promise", 1, 2, "lineage")`;
2. `fx.completeStory("story.ancestor-promise", "lineage")`;
3. normal `recordStory` for the legacy event increments `lineage.stories[followup]`.

Result:

- `storyStage == 2`, so the eligibility condition no longer matches;
- `completed == true`, so `when.storyCompleted` would also block it;
- `lineageMax: 1` blocks the event independently;
- `maxOccurrences: 1` blocks a same-life repeat;
- succession deep-clones all three records, so the block survives the next generation.

No memory entry is duplicated: `storyProgress` is keyed by one stable story id, and the source choice is a single key inside `choices`.

---

## 10. Save Schema and Migration Decision

- `SAVE_SCHEMA_VERSION` remains **8**.
- No new serialized field was added.
- `storyProgress` was already optional, validated, normalized at the action boundary, and preserved by succession.
- `parseSave` was not changed; it does not inject fields outside the established migration contract.
- Legacy saves without `storyProgress` remain valid; it is normalized to `{}` by the existing `applyAction` boundary.
- Malformed story progress (e.g. negative stage) is rejected by the existing `checkLineage` validation.
- Round-trip and succession are covered by tests.

---

## 11. Exact Files Changed

| File | Change |
|---|---|
| `packages/game-core/src/universes/dark-fantasy.world.ts` | Added lineage-story effects to the existing crisis `aid` choice; added one follow-up event `world.ancestor-promise.ash-capital`. |
| `packages/game-core/test/stage04-5-3-generational-memory.test.ts` | **New**: 23 focused tests. |
| `STAGE_04_5_3_IMPLEMENTATION_REPORT.md` | **New**: this report. |

No engine, save, type, or shared-contract file was modified. No web, API, or Android file was touched.

---

## 12. Test Coverage and Exact Results

New file: `packages/game-core/test/stage04-5-3-generational-memory.test.ts` — **23 tests, 23 passing**.

| # | Required coverage | Test(s) |
|---|---|---|
| 1 | Significant ancestor decision creates the lineage record | `помощь предка в кризисе записывает родовой сюжет и стабильные id выбора` |
| 2 | Routine choices do not create memory | `обычный отказ от помощи не создаёт поколенческую память`, `другие значимые выборы 04.5.1 не помечаются…` |
| 3 | Stable ids, not localized text | `память опирается на машинные id…` |
| 4 | Later heir can encounter the follow-up | `память предка делает событие доступным наследнику` |
| 5 | Unavailable before memory exists | `без памяти событие недоступно`, `во втором поколении без памяти…` |
| 6 | Unavailable after consumption | `после завершения сюжета событие больше не выбирается` |
| 7 | No repeat after succession | `завершённая память не возвращается после следующего наследования`, `история не может тянуться вечно…` |
| 8 | Real testable consequence | `подтверждение обещания тратит золото…`, `благодарность без обещания…` |
| 9 | Correct target entity | `…меняет именно Пепельную столицу` |
| 10 | Bounded, reuses 04.5.2 influence | `память переиспользует ограниченное влияние 04.5.2, а не создаёт второй счётчик` |
| 11 | Memory survives succession | `память предка делает событие доступным наследнику`, consumed-memory succession test |
| 12 | Memory survives save/load | `незавершённая память остаётся доступной после сохранения`, `память и завершение переживают сохранение…` |
| 13 | Legacy saves remain valid | `старое сохранение без storyProgress остаётся валидным` |
| 14 | Malformed reused data handled safely | `испорченный storyProgress отклоняется существующей валидацией` |
| 15 | Identical input → identical result | `одинаковые состояния и выборы дают одинаковый сюжет, мир и выбор события` |
| 16 | Deterministic story progress and selection | same determinism test (`selectEvent` on identical clones) |
| 17 | Stage 04.5.1 crisis still functional | `Stage 04.5.1: кризис по-прежнему восстанавливает поселение`, plus the full 04.5.1 file |
| 18 | Stage 04.5.2 influence still functional | `Stage 04.5.2: влияние по-прежнему применяется через worldTick`, plus the full 04.5.2 file |
| 19 | Character/lineage scopes separate | `сюжет и эффекты остаются в родовой области, не в личной` |
| 20 | Save compatibility intact | full suite, including all historical save-migration tests |

Additional tests: same-generation exclusion, content validation (`eventProblems`).

**Exact QA runs:**

| Check | Result |
|---|---|
| Focused Stage 04.5.3 file | **23 / 23 passing** |
| Stage 04.5.1 + 04.5.2 + 04.5.3 files | **72 / 72 passing** (3 files) |
| Full game-core suite, sequential (`--no-file-parallelism`) | **586 / 587 passing**, 1 failed (41 files) |
| Full game-core suite, parallel | **586 / 587 passing**, 1 failed (41 files) |
| Shared package | **12 / 12 passing** (2 files) |

The single game-core failure is the known pre-existing `stage01-life-upgrade.test.ts > keeps the decision provenance when a delayed consequence arrives` (`expected undefined to be 'mu.bandits'`). No new failures were introduced.

---

## 13. Typecheck and Lint Results

- `packages/game-core`: `npx tsc -p tsconfig.json --noEmit` → **exit 0**.
- ESLint on changed source and test files → **exit 0**.
- Shared tests were run; no shared contract was modified.
- Root `pnpm lint` was **not** run; it is historically red for unrelated pre-existing reasons.
- Web/API test suites were not run; no web/API file was touched.

---

## 14. Determinism Verification

- No `Math.random()`, wall-clock time, browser API, or server API was added.
- The new ancestor effects and follow-up choices use no RNG.
- Story stage transitions are guarded (`expectedStage`, monotonic increase, `completed` check).
- Event eligibility is a pure read of `generation` and `storyProgress`; no collection-order dependence.
- Test with two identical heir states produces identical `storyProgress`, `world`, and `worldInfluence`.
- `selectEvent` on identical cloned states with identical RNG seeds returns the same event id.

---

## 15. Succession Verification

- `succeed` deep-clones `lineage`, so `storyProgress`, `stories`, and `worldInfluence` all persist.
- Test `память предка делает событие доступным наследнику` confirms stage 1 reaches generation 2 and the follow-up becomes eligible.
- Test `завершённая память не возвращается после следующего наследования` confirms completed state and the `lineage.stories` counter survive and keep the event closed.
- Character-scoped progress remains separate; the memory is never written to `character.storyProgress`.
- Succession rules were not changed.

---

## 16. Stage 04.5.1 Regression Results

- Stage 04.5.1 test file: **23 / 23 passing**.
- The crisis event still spends gold, restores prosperity/stability, and grants influence.
- The delayed follow-up and faction invitation are unchanged.
- The `aid` choice gained story-recording effects only; its established effects, requirements, and occurrence rules are intact.
- `eventProblems("dark-fantasy")` remains empty.

---

## 17. Stage 04.5.2 Regression Results

- Stage 04.5.2 test file: **26 / 26 passing**.
- Influence still initializes, stacks, caps, applies through `worldTick`, survives save/load and succession, and rejects malformed data.
- The follow-up reuses `fx.influence`; it does not create a second influence store or modify the meaning of existing values.
- A cap test confirms that an already-maximal influence value stays at `5`.

---

## 18. Known Blockers

| Blocker | Origin | Impact |
|---|---|---|
| `stage01-life-upgrade.test.ts` delayed-consequence provenance fails | Pre-existing, documented since the Stage 04.5 audit | None; unrelated source path |
| JSX errors in `apps/web/src/components/play/lineage.tsx` block web typecheck/build | Pre-existing uncommitted web work | None; file untouched |
| Root `pnpm lint` historically fails | Pre-existing Android/test issues | None; changed-file lint is clean |
| Same-generation edge for non-founder ancestors | `StoryProgress` has no decision-generation field; adding one was judged unnecessary | Documented in §7; memory is still one-time and lineage-scoped |

No new failures were introduced.

---

## 19. Preservation of Existing Work

- Initial inventory: **38 modified, 60 untracked**.
- Final inventory before this report: **38 modified, 61 untracked** (the only addition is the new test file).
- All previously modified files remain modified; no pre-existing untracked file was deleted.
- No `git reset`, `git clean`, `git restore`, `git checkout`, or destructive branch operation was used.
- HEAD remains `1bcf224`.
- No existing test was deleted or weakened.

---

## 20. No Commit, Push, or Deployment

Confirmed:

- no `git commit`;
- no `git push`;
- no deployment;
- production at `https://life.endemion.online` was neither touched nor verified.

---

## 21. Final Status

**COMPLETED WITH KNOWN BLOCKERS**

Acceptance criteria:

1. ✅ A significant decision is represented in lineage history by stable machine-readable ids.
2. ✅ A later generation can encounter a meaningful narrative consequence.
3. ✅ Existing lineage structures are reused.
4. ✅ No duplicate memory, chronicle, queue, or event engine was introduced.
5. ✅ The story is bounded by stage completion, `lineageMax`, and `maxOccurrences`.
6. ✅ The world consequence is real and testable.
7. ✅ Determinism is preserved.
8. ✅ Succession and save/load behave correctly.
9. ✅ Stage 04.5.1 and 04.5.2 regressions pass.
10. ✅ New tests pass (23/23).
11. ✅ Existing unrelated failures are documented accurately.
12. ✅ All pre-existing working-tree changes are preserved.
13. ✅ No commit, push, or deployment.

**Stop here. Awaiting approval before the next stage.**
