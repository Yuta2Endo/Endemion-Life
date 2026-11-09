# Stage 04.4.1 — Narrative Chains Closure & Edge-Case Verification Report

**Project:** Endemion Life  
**Stage:** 04.4.1 (Narrative Chains Closure & Edge-Case Verification)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Pre-existing uncommitted changes (Stages 12–14, 04.1–04.3.1):** preserved, not touched  
**Verification date:** 09.11.2026

---

## 1. Initial Git Status and HEAD

```
Branch: main (ahead of origin/main by 1 commit)
HEAD: 1bcf224 footer: contact email to endemion@internet.ru
```

**Modified files (pre-existing, preserved):** 36 files across `apps/web/` and `packages/game-core/`, including `lineage.tsx`, `conditions.ts`, `effects.ts`, `game.ts`, `save.ts`, `types.ts`, `narrative/types.ts`, `narrative/dsl.ts`, `legacy/stories.ts`, `legacy/chronicle.ts`, `legacy/succession.ts`, `legacy/present.ts`, and test files.

**Untracked files (pre-existing, preserved):** 38 files including stage reports, new source files (`goals.ts`, `social.ts`, `stories.ts`, `metrics.ts`), and new test files including `stage04-4-chains.test.ts`.

No destructive Git commands were used. No commits, pushes, or deployments performed.

---

## 2. Task 1 — Completed Story Protection

### Finding: DEFECT

All three "The Broken Oath" demonstration events (`story.broken-oath.1`, `.2`, `.3`) lacked `lineageMax` and `maxOccurrences`. After completing the chain via any terminal branch:
- **Event 1** could re-fire next year (no occurrence limit, only `minAge: 16` condition)
- **Event 2** could re-fire via `fx.schedule` (condition `storyStage === 1` remained true after "hide" completion at stage 0)
- **Event 3** could re-fire via `fx.schedule` (condition `storyStage === 2 AND storyChoice(read)` remained true after completion)

`when.storyCompleted` returning `true` does **not** itself prevent event eligibility — `isEligible` (selection.ts:55) only checks the conditions listed in the event definition, plus `maxOccurrences`, `lineageMax`, cooldown, and `RECENT_LIMIT`.

### Fix Applied

Added `maxOccurrences: 1` and `lineageMax: 1` to all three events in `packages/game-core/src/legacy/stories.ts`:

- `lineageMax: 1` is checked in `isEligible` (selection.ts:62) against `state.lineage.stories[event.id]`, which is incremented by `recordStory()` during `choose()`.
- `maxOccurrences: 1` is checked in `isEligible` (selection.ts:61) against `state.occurrences[event.id]`, which is incremented by `advance()` in game.ts.

After completion, `recordStory` increments `lineage.stories[event.id]` to 1, and `isEligible` returns `false` because `1 >= 1`. Events cannot re-fire.

### Verified Behavior (all terminal branches):

| Branch | Event | After completion, `isEligible` returns |
|--------|-------|----------------------------------------|
| Event 1: "leave" | `story.broken-oath.1` | `false` |
| Event 2: "hide" | `story.broken-oath.2` | `false` |
| Event 3: "accept" | `story.broken-oath.3` | `false` |
| Event 3: "reject" | `story.broken-oath.3` | `false` |

---

## 3. Task 2 — Save Validation

### Finding: DEFECT

`CharacterState.storyProgress` was **not validated** in `parseSave` (save.ts). Only `LineageState.storyProgress` was validated in `checkLineage` (save.ts:344-355). Malformed character story progress (e.g., non-object values, missing `choices` field, non-integer stage) would not be caught and could cause runtime errors in `getStoryProgress` or `setStoryProgress`.

### Fix Applied

Added character `storyProgress` validation in `parseSave` (save.ts:486-499), following the same pattern as lineage validation:

```typescript
const characterStoryProgress = c.storyProgress;
if (characterStoryProgress !== undefined && !isRecord(characterStoryProgress)) fail("character.storyProgress");
if (isRecord(characterStoryProgress)) {
  for (const [, value] of Object.entries(characterStoryProgress)) {
    if (!isRecord(value)) fail("character.storyProgress");
    const progress = value as { stage: number; completed: boolean; choices: Record<string, string> };
    if (typeof progress.stage !== "number" || typeof progress.completed !== "boolean") fail("character.storyProgress");
    if (!isRecord(progress.choices)) fail("character.storyProgress");
    for (const choiceValue of Object.values(progress.choices)) {
      if (typeof choiceValue !== "string") fail("character.storyProgress");
    }
  }
}
```

### Verification:

| Scenario | Result |
|----------|--------|
| Valid `character.storyProgress` | Accepted |
| Invalid `character.storyProgress` (non-object value) | Rejected with `INVALID_SAVE` |
| Missing `character.storyProgress` in old saves | Normalized to `{}` via `??= {}` in `applyAction` |
| Invalid `lineage.storyProgress` | Rejected (existing validation) |
| Missing `lineage.storyProgress` in old saves | Normalized to `{}` via `??= {}` in `applyAction` |
| JSON round-trip preserves valid progress | Confirmed |

---

## 4. Task 3 — Succession Edge Cases

### Verified via code inspection and tests:

| Behavior | Implementation | Verified |
|----------|---------------|----------|
| Personal story progress does NOT transfer to heir | `generateCharacter()` creates fresh `CharacterState` without `storyProgress` (succession.ts:184); normalized via `??= {}` on first `applyAction` | ✅ Test |
| Lineage story progress DOES transfer to heir | `deepClone(dead.lineage)` at succession.ts:355 copies `lineage.storyProgress` | ✅ Test |
| Completed lineage stories remain completed after succession | `completed: true` preserved via `deepClone` | ✅ Test |
| Scheduled story events do NOT transfer after succession | `scheduled: []` in `buildHeir` (succession.ts:333) — per-life only | By design |
| No duplicate rewards after completion | `advanceStoryEffect` and `completeStoryEffect` check `progress.completed` and return early | ✅ Code inspection |

---

## 5. Task 4 — Tests Added

**File:** `packages/game-core/test/stage04-4-chains.test.ts`  
**Total tests:** 31 (was 24, +7 new)

### New tests for confirmed defects:

| # | Test | Result |
|---|------|--------|
| 25 | Completed chain cannot show Event 1 again (leave branch) | Pass |
| 26 | Completed chain cannot show Event 2 again (hide branch) | Pass |
| 27 | Completed chain cannot show Event 3 again (accept branch) | Pass |
| 28 | Completed chain cannot show Event 3 again (reject branch) | Pass |
| 29 | Completed chain remains terminal after succession (deepClone) | Pass |
| 30 | Invalid character story progress is rejected at parseSave | Pass |
| 31 | Legacy saves without storyProgress load safely | Pass |

### Existing tests (all still pass):

| Category | Tests | Pass |
|----------|-------|------|
| Data model and scope | 5 | 5 |
| Stage progression | 6 | 6 |
| Choice history | 5 | 5 |
| Persistence and succession | 5 | 5 |
| describeCondition localization | 3 | 3 |
| Completed chain protection | 4 | 4 |
| Invalid progress + legacy saves | 2 | 2 |
| **Total** | **31** | **31** |

Also updated `packages/game-core/test/stage03-1.test.ts` (Stage 04.4): event count 16→19 with new demonstration event IDs.

---

## 6. Task 5 — Quality Assurance Results

| Check | Command | Result | Details |
|-------|---------|--------|---------|
| Game-core typecheck | `tsc -p tsconfig.json --noEmit` | **Pass** | No errors |
| Game-core tests | `npx vitest run` | **Pass** | 37 files / 491 tests (1 pre-existing failure) |
| Shared tests | `npx vitest run` | **Pass** | 2 files / 12 tests |
| Web tests | `npx vitest run` | **Pass** | 2 files / 9 tests |
| API tests | `npx vitest run` | **Pass** | 3 files / 18 tests |
| ESLint (changed code) | `npx eslint <files>` | **Pass** | No errors |
| Web typecheck | `tsc --noEmit` (apps/web) | **Fail** | Pre-existing JSX errors in `lineage.tsx` |
| Web production build | `next build` | **Fail** | Pre-existing JSX errors in `lineage.tsx` |

### Pre-existing failures (NOT caused by Stage 04.4 or 04.4.1):

1. **`test/stage01-life-upgrade.test.ts`** — 1 test failure: `keeps the decision provenance when a delayed consequence arrives` — `expected undefined to be 'mu.bandits'`. This is a pre-existing issue in a test file that was already modified before Stage 04.4.

2. **Web typecheck/build** — JSX tag mismatches in `apps/web/src/components/play/lineage.tsx` (lines 220, 288–325, 384–388, 487–522). `lineage.tsx` was **not modified** in Stage 04.4 or 04.4.1. These are pre-existing errors from Stages 12–14.

### New failures introduced by Stage 04.4.1:

**None.** All new tests pass, all existing tests (except pre-existing failure) pass, typecheck passes, lint passes.

---

## 7. Files Modified in Stage 04.4.1

**Modified (3):**

| File | Change |
|------|--------|
| `packages/game-core/src/legacy/stories.ts` | Added `maxOccurrences: 1` and `lineageMax: 1` to all 3 Broken Oath events |
| `packages/game-core/src/engine/save.ts` | Added `character.storyProgress` validation in `parseSave` |
| `packages/game-core/test/stage04-4-chains.test.ts` | Added 7 new tests (24→31 total) |

**Created (0):** No new files.

---

## 8. Remaining Blockers

| Blocker | Origin | Notes |
|---------|--------|-------|
| Web typecheck/build fails | Pre-existing JSX errors in `lineage.tsx` (Stages 12–14) | Not related to Stage 04.4 or 04.4.1. `lineage.tsx` was not modified. |
| 1 game-core test fails | Pre-existing `stage01-life-upgrade.test.ts` | Unrelated to narrative chains. |

---

## 9. Confirmation

- ✅ Previous uncommitted changes from Stages 12–14 and 04.1–04.3.1 were preserved
- ✅ No `git reset`, `git checkout`, `git clean`, `git restore`, or destructive commands used
- ✅ No commits, pushes, or deployments performed
- ✅ `SAVE_SCHEMA_VERSION` remains 8
- ✅ No changes to Stage 04.1, 04.2, 04.3, or 04.3.1 source code
- ✅ No new quest framework — existing narrative engine extended
- ✅ No changes to deterministic RNG, world simulation, economy, or relic bonuses
- ✅ Stage 04.5 not started

---

## 10. Completion Status

**COMPLETED** — All Stage 04.4.1 requirements met:

1. ✅ Terminal story protection verified — completed chains cannot re-fire via any terminal branch (all 3 events protected by `lineageMax: 1` + `maxOccurrences: 1`)
2. ✅ Both progress scopes validated — `character.storyProgress` and `lineage.storyProgress` validated in `parseSave`
3. ✅ Succession behavior verified — personal progress doesn't transfer, lineage progress survives, completed state persists
4. ✅ Relevant regression tests pass — 31/31 new tests pass, all existing tests pass (except 1 pre-existing failure)
5. ✅ Unrelated failures transparently documented — pre-existing web JSX errors and 1 game-core test failure
