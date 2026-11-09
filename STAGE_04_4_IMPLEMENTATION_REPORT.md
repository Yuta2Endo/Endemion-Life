# Stage 04.4 — Narrative Chains & Character History Implementation Report

**Project:** Endemion Life  
**Stage:** 04.4 (Narrative Chains & Character History)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Pre-existing uncommitted changes (Stages 12–14, 04.1–04.3.1):** preserved, not touched  
**Implementation date:** 09.11.2026

---

## 1. Executive Summary

Stage 04.4 extends the existing Endemion Life narrative engine to support connected multi-step storylines with persistent progress, branching choices, and dual scope (character vs lineage). The implementation reuses the existing narrative infrastructure — `Condition`/`Effect` unions, `checkCondition`/`applyEffect` pipelines, scheduled events, chronicle entries — without creating a separate quest framework or replacing any existing system.

**Two independent story scopes:**
- **Character stories** (`CharacterState.storyProgress?`): personal, per-life, does NOT transfer to heir at succession
- **Lineage stories** (`LineageState.storyProgress?`): family/dynasty, survives succession via `deepClone(dead.lineage)`

**New narrative primitives:** `when.storyStage`, `when.storyChoice`, `when.storyCompleted` conditions and `fx.advanceStory`, `fx.recordStoryChoice`, `fx.completeStory` effects, all with explicit `scope: "character" | "lineage"`.

**Demonstration storyline:** "The Broken Oath" (`story.broken-oath`) — 3 events, 2 branches, terminal completion, lineage scope.

---

## 2. Actual Architecture Used

### 2.1 Data flow (unchanged core pipeline)

```
advance (game.ts) → selectEvent (selection.ts) → state.pending → choose (game.ts)
  → applyEffects (effects.ts) → recordStory (lineage.ts) → remember (game.ts) → pushEntry (game.ts)
```

Story effects (`advanceStory`, `recordStoryChoice`, `completeStory`) plug into the existing `applyEffect` switch at `effects.ts:501`. Story conditions (`storyStage`, `storyChoice`, `storyCompleted`) plug into `checkCondition` at `conditions.ts:125`. Event eligibility (`isEligible` in `selection.ts`) evaluates conditions via `checkAll`, so story-gated events work seamlessly with the existing selection pipeline.

### 2.2 Scope separation

| Scope | Storage | Succession behaviour |
|-------|---------|---------------------|
| Character | `CharacterState.storyProgress?: Record<string, StoryProgress>` | Fresh per character via `generateCharacter()` — does NOT transfer |
| Lineage | `LineageState.storyProgress?: Record<string, StoryProgress>` | Transfers via `deepClone(dead.lineage)` at `succession.ts:355` |

`buildHeir()` creates a new `CharacterState` via `generateCharacter()` which does not initialize `storyProgress` (remains `undefined`). The `applyAction` normalization (`game.ts:377-381`) handles `??= {}` for both scopes at the action boundary.

---

## 3. Final StoryProgress Model

```typescript
// types.ts
export interface StoryProgress {
  stage: number;           // current stage, 0-based, exact-match semantics
  completed: boolean;      // terminal state — no further advancement
  choices: Record<string, string>;  // eventId → choiceId
}

export type StoryScope = "character" | "lineage";
```

Added to:
- `CharacterState.storyProgress?: Record<string, StoryProgress>` (types.ts:189)
- `LineageState.storyProgress?: Record<string, StoryProgress>` (types.ts:467)

`StoryProgress` is initialized to `{ stage: 0, completed: false, choices: {} }` lazily via `getStoryProgress()` when first accessed. `newLineage()` initializes `storyProgress: {}` (chronicle.ts:40). `applyAction` normalizes `storyProgress ??= {}` for both scopes (game.ts:381-382).

---

## 4. Character vs Lineage Scope Implementation

### Character scope
- Stored on `CharacterState`, which is freshly generated at succession via `generateCharacter()` (succession.ts:184)
- No `storyProgress` initialization in `generateCharacter` — remains `undefined`, normalized on first `applyAction`
- Personal stories (e.g., "The Scholar's Path") live and die with one character

### Lineage scope
- Stored on `LineageState`, transferred wholesale via `deepClone(dead.lineage)` at succession (succession.ts:355)
- `newLineage()` initializes `storyProgress: {}`
- Family sagas (e.g., "The Broken Oath") span generations

Scope is explicit in every condition/effect — no ambiguous defaults.

---

## 5. DSL API and Semantics

### Conditions (`narrative/types.ts`, `narrative/dsl.ts`, `engine/conditions.ts`)

| Condition | DSL constructor | Semantics |
|-----------|----------------|-----------|
| `storyStage` | `when.storyStage(id, stage, scope)` | `progress.stage === stage` (exact match, not `>=`) |
| `storyChoice` | `when.storyChoice(id, eventId, choiceId, scope)` | `progress.choices[eventId] === choiceId` |
| `storyCompleted` | `when.storyCompleted(id, scope)` | `progress.completed === true` |

Type definitions:
```typescript
| { type: "storyStage"; id: string; stage: number; scope: StoryScope }
| { type: "storyChoice"; id: string; eventId: string; choiceId: string; scope: StoryScope }
| { type: "storyCompleted"; id: string; scope: StoryScope }
```

### Effects (`narrative/types.ts`, `narrative/dsl.ts`, `engine/effects.ts`)

| Effect | DSL constructor | Semantics |
|--------|----------------|-----------|
| `advanceStory` | `fx.advanceStory(id, expectedStage, nextStage, scope)` | Guarded stage transition: only if `!completed && stage === expectedStage && nextStage > stage` |
| `recordStoryChoice` | `fx.recordStoryChoice(id, eventId, choiceId, scope)` | Records `choices[eventId] = choiceId` |
| `completeStory` | `fx.completeStory(id, scope)` | Sets `completed = true`, prevents future advancement |

Type definitions:
```typescript
| { type: "advanceStory"; id: string; expectedStage: number; nextStage: number; scope: StoryScope }
| { type: "recordStoryChoice"; id: string; eventId: string; choiceId: string; scope: StoryScope }
| { type: "completeStory"; id: string; scope: StoryScope }
```

### Stage transition rules (per specification)
1. Absent story starts at stage 0 (`getStoryProgress` returns default)
2. Exact stage matching — `storyStage(id, 1)` is false when stage is 2
3. Completed stories cannot advance (`advanceStoryEffect` returns early if `completed`)
4. Advancement guarded by expected stage match
5. Transition may move to any later stage (supports branching)
6. Invalid transitions silently no-op (no corruption)
7. Unknown story IDs handled safely (default stage 0, not completed)
8. Repeated same transition does not advance twice (stage check prevents re-entry)

---

## 6. Choice Recording Behavior

Choices are recorded directly in `StoryProgress.choices` (eventId → choiceId), not inferred from chronicle entries. This is deterministic, save/load-safe, and queryable via `when.storyChoice`.

Each `recordStoryChoice` also writes a chronicle entry of kind `"story"` with `v.story`, `v.event`, `v.choice`, `v.scope` for traceability in the lineage chronicle.

`advanceStory` writes a chronicle entry with `v.stage` and `v.scope`. `completeStory` writes an entry with `v.completed = "1"`.

---

## 7. Scheduling Integration

Story chains use the existing `fx.schedule(eventId, inYears)` → `ScheduledEvent[]` → `takeScheduled()` pipeline. No new scheduling mechanism was introduced.

The demonstration storyline uses `fx.schedule` to chain events across years:
- Event 1 → choice "enter" → `fx.schedule("story.broken-oath.2", 5)`
- Event 2 → choice "read" → `fx.schedule("story.broken-oath.3", 8)`

Scheduled events respect existing eligibility (`isEligible` checks conditions including `when.storyStage` and `when.storyChoice`), cooldowns, `maxOccurrences`, and `RECENT_LIMIT`. Completed chains cannot restart because `when.storyCompleted` returns `true` and `advanceStory` returns early when `completed`.

---

## 8. Demonstration Storyline: "The Broken Oath"

**Scope:** Lineage (family/dynasty)  
**Events:** 3 (`story.broken-oath.1`, `.2`, `.3`)  
**Choices:** 6 total (2 per event)  
**Branches:** 2 (accept/reject at event 3, abandon/suppress at events 1-2)  
**Terminal:** `completeStory` on all terminal branches

### Event 1: "The Family Crypt" (`story.broken-oath.1`)
- `minAge: 16`, `maxOccurrences: 1`
- Choice "enter": `advanceStory(0→1)`, `recordStoryChoice(event.1, "enter")`, `schedule(event.2, 5)`
- Choice "leave": `completeStory` — branch: abandoned

### Event 2: "The Oathkeeper's Journal" (`story.broken-oath.2`)
- `scheduledOnly: true`, `conditions: [when.storyStage("story.broken-oath", 1, "lineage")]`
- Choice "read": `advanceStory(1→2)`, `recordStoryChoice(event.2, "read")`, `schedule(event.3, 8)`
- Choice "hide": `completeStory` — branch: suppressed

### Event 3: "The Ancestor's Judgment" (`story.broken-oath.3`)
- `scheduledOnly: true`, `conditions: [when.storyStage("story.broken-oath", 2, "lineage"), when.storyChoice("story.broken-oath", "story.broken-oath.2", "read", "lineage")]`
- Choice "accept": `completeStory`, `fx.renown(5)` — branch: accepted
- Choice "reject": `completeStory`, `fx.renown(-5)` — branch: rejected

Added to `LEGACY_EVENTS` in `legacy/stories.ts`.

---

## 9. Save Compatibility and Succession Verification

| Requirement | Implementation | Verified |
|-------------|---------------|----------|
| `SAVE_SCHEMA_VERSION = 8` | Unchanged | ✓ Typecheck |
| Old saves without `storyProgress` | `??= {}` normalization in `applyAction` | ✓ Test 17 |
| Missing progress = stage 0, not completed | `getStoryProgress` default | ✓ Test 1 |
| JSON round-trip preserves progress | `Record<string, StoryProgress>` is plain JSON | ✓ Test 19 |
| Invalid progress rejected | `checkLineage` validates structure | ✓ Test 20 |
| Loading doesn't reapply effects | Effects only applied via `applyEffect`, not on load | ✓ Test 21 |
| Character progress doesn't transfer | Fresh `CharacterState` at succession | ✓ Test 4 |
| Lineage progress survives succession | `deepClone(dead.lineage)` | ✓ Test 5, 22 |

---

## 10. Test Cases and Actual Results

**New file:** `packages/game-core/test/stage04-4-chains.test.ts` — **24 tests, all passing**

| Category | Tests | Pass |
|----------|-------|------|
| Data model and scope | 5 | 5 |
| Stage progression | 6 | 6 |
| Choice history | 5 | 5 |
| Persistence and succession | 5 | 5 |
| describeCondition localization | 3 | 3 |

Also updated `packages/game-core/test/stage03-1.test.ts` to reflect 19 legacy events (was 16, +3 demonstration events).

**Full game-core suite:** 37 test files, 491 tests passed (1 pre-existing failure in `stage01-life-upgrade.test.ts`, unrelated to Stage 04.4).

---

## 11. Typecheck, Lint and Build Results

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Game-core typecheck | `tsc -p tsconfig.json --noEmit` | **Pass** | No errors |
| Game-core tests | `npx vitest run` | **Pass** | 37 files / 491 tests (1 pre-existing failure) |
| Shared tests | `npx vitest run` | **Pass** | 2 files / 12 tests |
| Web tests | `npx vitest run` | **Pass** | 2 files / 9 tests |
| API tests | `npx vitest run` | **Pass** | 3 files / 18 tests |
| ESLint (changed code) | `npx eslint <files>` | **Pass** | No errors |
| Web typecheck | `tsc --noEmit` (apps/web) | **Fail** | Pre-existing JSX errors in `lineage.tsx` (not Stage 04.4) |
| Web production build | `next build` | **Fail** | Pre-existing JSX errors in `lineage.tsx` (not Stage 04.4) |

**Web typecheck/build blocker:** Pre-existing JSX tag mismatches in `apps/web/src/components/play/lineage.tsx` (lines 220, 288–325, 384–388, 487–522). These errors exist in the baseline before Stage 04.4 and are NOT caused by any Stage 04.4 changes. `lineage.tsx` was not modified in this stage.

---

## 12. Full Changed/Created File List

**Modified (11):**
1. `packages/game-core/src/types.ts` — `StoryProgress` interface, `StoryScope` type, `CharacterState.storyProgress?`, `LineageState.storyProgress?`
2. `packages/game-core/src/narrative/types.ts` — `Condition.storyStage/StoryChoice/StoryCompleted`, `Effect.advanceStory/recordStoryChoice/completeStory`, `StoryScope` import
3. `packages/game-core/src/narrative/dsl.ts` — `when.storyStage/StoryChoice/StoryCompleted`, `fx.advanceStory/recordStoryChoice/completeStory`
4. `packages/game-core/src/engine/conditions.ts` — `checkCondition`/`describeCondition` cases, `getStoryProgress` import
5. `packages/game-core/src/engine/effects.ts` — `getStoryProgress`/`setStoryProgress` helpers, `advanceStoryEffect`/`recordStoryChoiceEffect`/`completeStoryEffect`, `applyEffect` cases
6. `packages/game-core/src/engine/game.ts` — `storyProgress ??= {}` normalization for both scopes
7. `packages/game-core/src/engine/save.ts` — `checkLineage` validation for `storyProgress`
8. `packages/game-core/src/legacy/chronicle.ts` — `newLineage()` `storyProgress: {}`
9. `packages/game-core/src/legacy/stories.ts` — Demonstration storyline (3 events)
10. `packages/game-core/test/stage03-1.test.ts` — Updated event count (16→19) and ID list

**Created (1):**
1. `packages/game-core/test/stage04-4-chains.test.ts` — 24 specialized tests

---

## 13. Remaining Risks and Limitations

| Risk | Assessment |
|------|------------|
| `lineage.storyProgress` grows unbounded | Low — bounded by number of chain events in content |
| `storyChoice` chronicle lookup not used | N/A — choices stored directly in `StoryProgress.choices`, O(1) lookup |
| `character.storyProgress` undefined until first `applyAction` | Handled by `??= {}` normalization and `?? {}` defaults in `getStoryProgress` |
| Web build blocked by pre-existing `lineage.tsx` JSX errors | Not caused by Stage 04.4 — `lineage.tsx` was not modified |
| One pre-existing test failure (`stage01-life-upgrade`) | Unrelated to Stage 04.4 — delayed consequence provenance issue |

**Limitations (by design, out of scope for MVP):**
- No story journal UI or visible chain-progress panel
- No chain epilogue events
- No world-state mutation from narrative (one-way: world → narrative only)
- No cross-universe chain content
- No mutual-exclusion chains between different storylines

---

## 14. Confirmation

- ✅ Previous uncommitted changes from Stages 12–14 and 04.1–04.3.1 were preserved (36 modified files, 38 untracked files in working tree, unchanged)
- ✅ No `git reset`, `git checkout`, `git clean`, `git restore`, or destructive commands used
- ✅ No commits, pushes, or deployments performed
- ✅ `SAVE_SCHEMA_VERSION` remains 8
- ✅ No changes to Stage 04.1, 04.2, 04.3, or 04.3.1 source code
- ✅ No new quest framework — existing narrative engine extended
- ✅ No changes to deterministic RNG, world simulation, economy, or relic bonuses
- ✅ No story journal UI implemented
- ✅ Stage 04.4 not started before this implementation

---

## 15. Completion Status

**COMPLETED** — All Stage 04.4 requirements met:

1. ✅ Personal and lineage story progress correctly separated
2. ✅ Story progression is persistent and deterministic
3. ✅ Earlier choices reliably influence later events (`when.storyChoice`)
4. ✅ Branching and completion work correctly (demonstration storyline)
5. ✅ Completed chains cannot accidentally restart (`completed` flag + `advanceStory` guard)
6. ✅ Personal progress does not leak to heirs (fresh `CharacterState` at succession)
7. ✅ Family progress survives succession (`deepClone(dead.lineage)`)
8. ✅ Old saves remain compatible (`??= {}` normalization, `checkLineage` validation)
9. ✅ Real three-event demonstration chain works end to end (3 events, 2 branches, terminal completion)
10. ✅ Specialized automated tests pass (24/24)
11. ✅ Existing project changes remain intact
