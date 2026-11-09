# Stage 04.4 — Narrative Chains & Character History Audit Report

**Project:** Endemion Life  
**Stage:** 04.4 (Narrative Chains & Character History — STRICT AUDIT ONLY)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Pre-existing uncommitted changes (Stages 12–14, 04.1–04.3.1):** preserved, not touched  
**Mode:** Audit only — no source code modified

---

## 1. Executive Summary

The existing Endemion Life narrative system is a well-structured, deterministic, event-driven engine built around `EventDefinition`, `Condition`, and `Effect` unions with `checkCondition`/`applyEffect` pipelines. It already supports several concepts relevant to narrative chains:

- **Scheduled continuations** via `fx.schedule(eventId, inYears)` → `ScheduledEvent[]` → `takeScheduled()` in `selection.ts`
- **Delayed consequences** via `fx.later(id, inYears)` → `ConsequenceState[]` → `consequencesYearly()` in `consequences.ts`
- **Lineage-level deferred effects** via `fx.lineageLater(id, inYears)` → `LineagePending[]` → `lineageYearly()` in `lineage.ts`
- **Story counters** via `lineage.stories[eventId]` and `when.story(id, max)` condition
- **Lineage threads** (`LineageThread[]`) transferred at succession via `deepClone(dead.lineage)`
- **Flags** (`string[]`) with `when.flag(id)` / `fx.flag(id, set)`
- **Achievements** (`AchievementRecord[]`) one-time-per-lineage
- **History entries** (`HistoryEntry[]`) with `sourceEventId`, `consequenceOf`, `check`, `eventId`, `choiceId`
- **Memory** (`MemoryEntry[]`) — key decisions of a life (max 12)
- **Relics** (`RelicState[]`) on `LineageState`, gated by `when.relic(id)` and acquired via `fx.relic(id)`

**No multi-step narrative chain system exists.** There is no persistent story-progress state that outlives a single event, no named story entity with stages/steps, no prerequisite linkage between events beyond `when.relic`/`when.story`/`when.thread` conditions, and no way to record that "event A happened with choice B" in a queryable way that future events can depend on beyond simple flag/thread/story counters.

The existing infrastructure (flags, threads, scheduled events, consequences, story counters, history entries) can be **reused** to implement narrative chains without creating a new quest framework.

---

## 2. Existing Architecture and Data Flow

### 2.1 Core data model

| Type | File | Purpose |
|------|------|---------|
| `EventDefinition` | `narrative/types.ts:187` | Event schema: id, kind, conditions, choices, cooldown, maxOccurrences, lineageMax, scheduledOnly |
| `Condition` | `narrative/types.ts:9` | Union of ~40 condition variants (stat, flag, relic, story, thread, goal, settlement, worldFaction, …) |
| `Effect` | `narrative/types.ts:90` | Union of ~45 effect variants (stat, flag, schedule, later, lineageLater, thread, relic, …) |
| `ChoiceDefinition` | `narrative/types.ts:173` | Choice: requires conditions, check, success/failure outcomes |
| `GameState` | `types.ts:603` | Root state: character, life, flags, occurrences, lastSeen, pending, scheduled, consequences, lineage, memory, … |
| `LineageState` | `types.ts:434` | Per-lineage state: relics, threads, stories, achievements, traits, pending, chronicle, … |
| `CharacterState` | `types.ts:156` | Per-character state: goal, goalProgress, stats, skills, … |
| `HistoryEntry` | `types.ts:551` | Per-action history: seq, age, kind, eventId, choiceId, sourceEventId, consequenceOf, check, changes |
| `MemoryEntry` | `types.ts:470` | Key decisions: age, eventId, choiceId, success, weight (max 12) |
| `ConsequenceState` | `types.ts:274` | Delayed effect: id, age, source |
| `ScheduledEvent` | `types.ts:501` | Scheduled continuation: eventId, age |
| `PendingEvent` | `types.ts:496` | Current waiting event: eventId, age |
| `ChronicleEntry` | `types.ts:317` | Lineage chronicle: kind, who, v, src, link |

### 2.2 Event lifecycle

```
advance (game.ts:213)
  → ageOneYear (life/aging.ts)
    → goal evaluation (goals.ts)
    → milestone check (milestones.ts)
  → worldYearly / worldTick / npcYearly
  → consequencesYearly (narrative/consequences.ts) — fires due ConsequenceState
  → lineageYearly (legacy/lineage.ts) — fires due LineagePending
  → selectEvent (narrative/selection.ts:92)
    → takeScheduled — fires due ScheduledEvent (grace: SCHEDULE_GRACE_YEARS=5)
    → isEligible — checks minAge/maxAge/stages, maxOccurrences, lineageMax, cooldown, RECENT_LIMIT, conditions, available choices
    → weighted random selection
  → state.pending = { eventId, age }  (player must choose)
choose (game.ts:291)
  → validate choice, check checkAll(choice.requires)
  → roll check (checkChance) if choice.check present
  → applyEffects(ctx, outcome.effects) (engine/effects.ts)
  → recordStory(ctx, event, choiceId, success) (legacy/lineage.ts:72) — increments lineage.stories for kind="legacy"
  → remember (game.ts:116) — MemoryEntry with weight
  → pushEntry (game.ts:90) — HistoryEntry with sourceEventId, consequenceOf, check, changes
```

### 2.3 Persistence and save compatibility

- `SAVE_SCHEMA_VERSION = 8` (game.ts:59)
- `parseSave` (save.ts:441) validates all top-level fields including `lineage`, `world?`, `social?`
- Additive optional fields are normalized at the action boundary (`applyAction` game.ts:377-381: `autoMode ??= "manual"`, `milestones ??= { triggered: [] }`, `goal ??= null`)
- Old saves without `lineage.relics` are handled by `checkLineage` (save.ts:335-343) and `applyRelic` (effects.ts:510: `if (!lineage.relics) lineage.relics = []`)
- `deepClone(dead.lineage)` in succession.ts:355 transfers `relics`, `threads`, `stories`, `pending`, `achievements`, `traits` wholesale to the heir

### 2.4 UI presentation

- `EventCard` (apps/web/src/components/play/event-card.tsx) — renders pending event with title, text, choices (availability, locked reasons, chance)
- `OutcomeCard` (event-card.tsx:76) — renders last decision result with check, touches, changes
- `presentEvent` (engine/view.ts:62) — builds `EventView` from `state.pending`: choices with `available`, `locked` (describeCondition), `chance`, `touches`
- `presentLineage` / `DynastyPanel` (lineage.tsx) — Dynasty tab shows `DynastyView.relics`, threads, identity, faction relations
- `presentInheritance` / `InheritanceDetails` (lineage.tsx) — succession screen shows `InheritanceView.relics`
- `presentLegacy` (present.ts:518) — `LegacyBrief` with `lineageName`, `generation`, `renown`, `achievements`, `inheritance`, `summary`, `current`
- `renderChronicle` / `names` (present.ts:772 / 669) — lineage chronicle text including `relic` kind (present.ts:761-765)

---

## 3. Inventory of Existing Narrative Capabilities

### Fully implemented

| Capability | Evidence |
|------------|----------|
| Single-event gating via conditions | `checkCondition` (conditions.ts:24), `isEligible` (selection.ts:55), `when.*` DSL (dsl.ts:53) |
| Choice requirements | `ChoiceDefinition.requires` (types.ts:177), `presentEvent` locked reasons (view.ts:81) |
| Stat/skill checks on choices | `ChoiceDefinition.check` + `StatCheck` (types.ts:154), `checkChance` (engine/checks.ts) |
| Success/failure branching | `ChoiceDefinition.success` / `ChoiceDefinition.failure` (types.ts:168-182) |
| Scheduled event continuation | `fx.schedule` (dsl.ts:19), `ScheduledEvent[]`, `takeScheduled` (selection.ts:75), `SCHEDULE_GRACE_YEARS=5` |
| Delayed consequences | `fx.later` (dsl.ts:38), `ConsequenceState[]`, `consequencesYearly` (consequences.ts:12) |
| Lineage-level deferred effects | `fx.lineageLater` (dsl.ts:42), `LineagePending[]`, `lineageYearly` (lineage.ts:37) |
| Story occurrence counters | `lineage.stories` (types.ts:457), `when.story(id, max)` (dsl.ts:97), `recordStory` (lineage.ts:72) |
| Lineage threads | `LineageThread[]` (types.ts:358), `when.thread` / `fx.thread` (dsl.ts:95,41), `setThread` (effects.ts:240) |
| Flags | `flags: string[]` (types.ts:613), `when.flag` / `fx.flag` (dsl.ts:55,17), `setFlag` (effects.ts:107) |
| Achievements (one-time per lineage) | `ACHIEVEMENTS[]` (legacy/achievements.ts), `lineage.achievements` (types.ts:451), `unlockAchievements` (legacy/achievements.ts) |
| Relics (one-time per lineage) | `lineage.relics: RelicState[]` (types.ts:466), `when.relic` / `fx.relic` (dsl.ts:109,50), `applyRelic` (effects.ts:506) |
| History with provenance | `HistoryEntry.sourceEventId`, `consequenceOf` (types.ts:564-566), `pushEntry` (game.ts:90) |
| Memory of key decisions | `MemoryEntry[]` (types.ts:470), `remember` (game.ts:116), `MAX_MEMORY=12` |
| Event de-duplication / cooldown | `occurrences`, `lastSeen` (types.ts:615-617), `RECENT_LIMIT=4` (selection.ts:31), `DEFAULT_COOLDOWN=3` |
| Event validation | `eventProblems` (selection.ts:204) — checks broken conditions/effects, duplicate ids, empty choices |
| Six-universe support | `UNIVERSE_IDS` (types.ts), per-universe events in `universes/<id>.ts` |
| Localized narrative text | `LocalizedText` {ru, en} (i18n.ts:8), `fillText` (i18n.ts), `t()` helper |
| Deterministic seeded RNG | `Rng.fromSeed` (rng.ts), `hashSeed`, `state.rngState` preserved across actions |

### Partially implemented

| Capability | Evidence | Gap |
|------------|----------|-----|
| Multi-step event chains | `fx.schedule` exists for single continuations; no named chain entity, no chain progress tracking, no branching chain state | No way to model "event A → choice B → unlocks event C → choice D → unlocks event E" as a single narrative unit |
| Persistent story progress across years | `lineage.stories` counts occurrences but stores no per-choice state; `flags`/`threads` are boolean; no stage/step model | Cannot represent "chapter 2 of 3" or "choice X in chapter 1 affects chapter 3" |
| Character-specific story history | `HistoryEntry` records events but is not queryable by future conditions; `MemoryEntry` is capped at 12 and not exposed to conditions | No `when.storyChoice(id, choice)` or `when.storyStage(id, stage)` condition |
| Relics as narrative prerequisites | `when.relic(id)` exists (dsl.ts:109) | Relics gate events but no event can be triggered *by* acquiring a specific relic as a chain continuation |
| World-state storylines | `when.settlement` / `when.worldFaction` (Stage 04.2) exist | World events do not modify settlement/faction state (one-way: world → narrative only) |

### Not implemented

| Capability | Evidence |
|------------|----------|
| Named story chain entity with stages | No `StoryChain`, `StoryStage`, `StoryProgress` type anywhere |
| Event prerequisites from earlier events (beyond flags/threads/story counts) | No condition references a prior event's choice outcome |
| Consequences that create new events (only effects) | `ConsequenceDefinition.effects` applies effects but cannot schedule a new event |
| Narrative conclusions / epilogue per storyline | No "story completed" terminal state |
| Prevention of contradictory chain events | No mutual-exclusion or chain-state validation |
| Save/load for chain progress | No chain-progress field in `LineageState` or `CharacterState` |

---

## 4. Missing Capabilities and Evidence

### 4.1 Multi-step narrative chains — NOT IMPLEMENTED

**Evidence:**
- `narrative/types.ts` has no `StoryChain` or `StoryStage` type
- `narrative/dsl.ts` has no `when.storyChain` or `fx.advanceStory` constructor
- `engine/conditions.ts` has no condition to check chain progress
- `engine/effects.ts` has no effect to advance a chain stage
- `selection.ts` has `takeScheduled` for single-event continuations but no chain resolver
- `fx.schedule` only chains one event at a time; there is no way to model a chain where the *next* event depends on the *choice* made in the previous event (only on the event occurring)

### 4.2 Events with prerequisites from earlier events — PARTIALLY IMPLEMENTED

**Evidence:**
- `when.flag(id)` / `fx.flag(id, set)` — can gate on a flag set by a prior event
- `when.thread(id)` / `fx.thread(id, add)` — can gate on a lineage thread
- `when.relic(id)` / `fx.relic(id)` — can gate on a relic
- `when.story(id, max)` / `recordStory` — can gate on story occurrence count
- **Gap:** No condition reads a prior event's *choiceId* or *success* outcome. `HistoryEntry.choiceId` and `check.success` exist but are not exposed to `Condition`.

### 4.3 Persistent narrative progress across years — PARTIALLY IMPLEMENTED

**Evidence:**
- `lineage.stories: Record<string, number>` persists occurrence counts across generations
- `LineageThread[]` persists across succession via `deepClone`
- `flags: string[]` persists within a life (cleared at succession — only `bloodFlags` transfer)
- **Gap:** No per-character or per-lineage story-stage tracker that survives within a life and can be queried by conditions. `MemoryEntry` is capped at 12 and not queryable.

### 4.4 Character-specific story history — PARTIALLY IMPLEMENTED

**Evidence:**
- `HistoryEntry[]` records every event with `eventId`, `choiceId`, `check.success`, `sourceEventId`, `consequenceOf`
- `MemoryEntry[]` records up to 12 key decisions with `weight`
- **Gap:** Neither is queryable by `Condition`. No `when.eventChoice(id, choiceId)` or `when.eventOutcome(id, success)`.

### 4.5 Consequences affecting future events — PARTIALLY IMPLEMENTED

**Evidence:**
- `ConsequenceDefinition` has `conditions` and `effects` — consequences can set flags/threads/relics which then gate future events
- `consequencesYearly` fires due consequences and applies effects
- **Gap:** Consequences cannot schedule a new event (only apply effects). `fx.schedule` is available inside effects, so a consequence *can* schedule an event via `fx.schedule` inside its effects — this works but is indirect.

### 4.6 Family and dynasty-related storylines — PARTIALLY IMPLEMENTED

**Evidence:**
- `LEGACY_EVENTS[]` (legacy/stories.ts:66) are dynasty-level events with `kind: "legacy"`, `lineageMax: 1`
- `LINEAGE_CONSEQUENCES[]` (legacy/stories.ts:281) are deferred lineage effects
- `when.generation`, `when.renown`, `when.achievement`, `when.thread` gate on dynasty state
- `InheritanceRecord.relics: string[]` (types.ts:425) passes relics at succession
- **Gap:** No dynasty-level story chain that spans generations with per-generation stages.

### 4.7 Stories involving inherited relics — PARTIALLY IMPLEMENTED

**Evidence:**
- `when.relic(id)` gates events on relic ownership
- `InheritanceRecord.relics` passes relic IDs at succession
- `DynastyView.relics` and `InheritanceView.relics` expose relics to UI
- **Gap:** No event can be triggered specifically because a relic was *just inherited* (no "relic inherited" chain continuation).

### 4.8 World-state-dependent storylines — PARTIALLY IMPLEMENTED

**Evidence:**
- `when.settlement(id, prosperity?, stability?)` (Stage 04.2)
- `when.worldFaction(id, power?, influence?, standing?)` (Stage 04.2)
- **Gap:** World events cannot modify settlement/faction state (one-way only). No "world crisis → narrative chain" trigger.

### 4.9 Narrative conclusions and branching outcomes — PARTIALLY IMPLEMENTED

**Evidence:**
- `ChoiceDefinition.failure` provides per-choice branching
- `ConsequenceDefinition` has `chance` for probabilistic outcomes
- **Gap:** No "storyline completed" terminal state, no epilogue event per chain, no way to mark a chain as finished so it doesn't re-offer.

### 4.10 Prevention of repeated or contradictory events — PARTIALLY IMPLEMENTED

**Evidence:**
- `maxOccurrences`, `lineageMax`, `cooldown`, `RECENT_LIMIT`, `occurrences`, `lastSeen`, `recentEvents`
- `when.story(id, max)` limits story repetitions
- **Gap:** No chain-level mutual exclusion (e.g., "choice A in chain X prevents chain Y").

### 4.11 Localization of all narrative content — FULLY IMPLEMENTED

**Evidence:**
- All `EventDefinition` fields use `LocalizedText` {ru, en}
- `Condition` descriptions via `describeCondition` (conditions.ts:165)
- `Effect` application does not need localization
- Chronicle text built from `ChronicleEntry.kind` + `v` values (present.ts:669)

### 4.12 Save/load persistence for narrative progress — PARTIALLY IMPLEMENTED

**Evidence:**
- `lineage.stories`, `lineage.threads`, `lineage.achievements`, `lineage.relics` all persist and round-trip via `parseSave`
- `flags` persists within a life
- `ConsequenceState[]`, `ScheduledEvent[]` persist
- **Gap:** No chain-progress field to persist; any new chain system must add optional fields with `??=` normalization for old saves.

---

## 5. Recommended Implementation Scope

**Minimal, architecture-compatible proposal:** Extend the existing narrative infrastructure rather than creating a new quest framework. Reuse `LineageState` for chain progress, `Condition`/`Effect` for chain gating/advancement, and `HistoryEntry`/`MemoryEntry` for chain history.

### Scope items (in dependency order):

1. **Story stage progress on LineageState** — add optional `storyStages: Record<string, number>` field mapping story/chain id → current stage index. Defaults to `undefined` for old saves, normalized via `??=`.

2. **`when.storyStage(id, stage)` condition** — checks `lineage.storyStages[id] >= stage` (or `=== stage` depending on semantics). Reuses `checkCondition` pattern.

3. **`fx.advanceStory(id)` effect** — increments `lineage.storyStages[id]`. Can be used in choice success/failure effects to advance a chain.

4. **`when.storyChoice(id, choiceId)` condition** — checks if a specific choice was made in a story event. Requires querying `lineage.chronicle` for `story` kind entries with matching `v.choice`. (Alternative: simpler to use flags set by events, but this avoids flag proliferation.)

5. **Optional: `fx.triggerStory(id)` effect** — schedules a story event as the next pending event (like `fx.schedule` but with `scheduledOnly` semantics and immediate eligibility).

6. **Save normalization** — `storyStages ?? {}` at action boundary; `SAVE_SCHEMA_VERSION` stays 8.

7. **Tests** — chain advancement, dedup, old-save normalization, succession transfer via deepClone.

**Out of scope for Stage 04.4 (minimal):** new UI screens, chain epilogue events, world-state mutation from narrative, mutual-exclusion chains, cross-world chain content.

---

## 6. Proposed Data Model

### 6.1 `LineageState.storyStages` (types.ts:434)

```typescript
/** Прогресс сюжетных цепочек: id сюжета → текущий этап (0-based). Опционально для совместимости со старыми сохранениями. */
storyStages?: Record<string, number>;
```

- Additive, optional. Old saves omit it; `applyAction` normalizes `storyStages ?? {}`.
- Survives succession via `deepClone(dead.lineage)` (already copies all LineageState fields).
- Round-trips through `parseSave` / `checkLineage` with optional validation.

### 6.2 Reuse existing types

No new top-level types needed. Reuse:
- `LineageThread` pattern for chain metadata if needed later
- `ConsequenceState` for deferred chain triggers
- `ScheduledEvent` for timed chain continuations
- `HistoryEntry` / `ChronicleEntry.link` for chain provenance (existing `link: number | null` on ChronicleEntry)

---

## 7. Proposed DSL Additions

### 7.1 `narrative/dsl.ts`

```typescript
// when
storyStage: (id: string, stage: number): Condition => ({ type: "storyStage", id, stage }),
storyChoice: (id: string, choiceId: string): Condition => ({ type: "storyChoice", id, choiceId }),

// fx
advanceStory: (id: string): Effect => ({ type: "advanceStory", id }),
triggerStory: (id: string): Effect => ({ type: "triggerStory", id }),
```

### 7.3 `narrative/types.ts` Condition additions

```typescript
| { type: "storyStage"; id: string; stage: number }
| { type: "storyChoice"; id: string; choiceId: string }
```

### 7.4 `narrative/types.ts` Effect additions

```typescript
| { type: "advanceStory"; id: string }
| { type: "triggerStory"; id: string }
```

### 7.5 `engine/conditions.ts` — `checkCondition` + `describeCondition`

```typescript
case "storyStage":
  return (state.lineage.storyStages?.[condition.id] ?? 0) >= condition.stage;
case "storyChoice": {
  const entry = state.lineage.chronicle
    .filter((e) => e.kind === "story" && e.v.story === condition.id)
    .find((e) => e.v.choice === condition.choiceId);
  return entry !== undefined;
}
```

### 7.6 `engine/effects.ts` — `applyEffect` case

```typescript
case "advanceStory":
  return advanceStory(ctx, effect.id);
case "triggerStory":
  return triggerStory(ctx, effect.id);
```

Where `advanceStory` increments `lineage.storyStages[id]` and `triggerStory` pushes a `ScheduledEvent` for immediate eligibility (or directly sets `state.pending`).

---

## 8. Save Compatibility Assessment

| Aspect | Assessment |
|--------|------------|
| `SAVE_SCHEMA_VERSION` | Stays **8** — no bump needed |
| `storyStages` optional field | Normalized via `storyStages ?? {}` in `applyAction` (game.ts:377-381 pattern) |
| `checkLineage` validation | Add optional validation: if present, must be `Record<string, number>` with non-negative integer values |
| `parseSave` round-trip | `storyStages` is a plain object — survives `JSON.stringify`/`JSON.parse` |
| Succession transfer | `deepClone(dead.lineage)` already copies all LineageState fields including optional ones |
| Old saves without `storyStages` | `?? {}` normalization handles gracefully; `checkCondition` uses `?? 0` default |

**No migration step required.** All additive and optional.

---

## 9. Testing Strategy

| Test area | Test cases |
|-----------|------------|
| Stage advancement | `fx.advanceStory("chain-a")` increments `lineage.storyStages["chain-a"]` from undefined→0→1 |
| Stage gating | `when.storyStage("chain-a", 1)` returns true only after stage ≥1; false before |
| Choice-based gating | Event with `when.storyChoice("legacy.heir-born", "ancestor")` matches when that choice was recorded in chronicle |
| Dedup / idempotency | Calling `advanceStory` twice increments once per call (no cap by design; caller controls via conditions) |
| Old save normalization | `parseSave` on save without `storyStages` → `storyStages` is `{}` after normalization |
| Save round-trip | `storyStages` preserved through `JSON.stringify` → `parseSave` |
| Succession transfer | `deepClone(lineage)` preserves `storyStages` for the heir |
| `describeCondition` localization | `storyStage` shows localized text; `storyChoice` shows localized text |
| Determinism | Same seed → same chain progression |

**Test file:** `packages/game-core/test/stage04-4-chains.test.ts` (new)

---

## 10. UI Impact

**Minimal — no new screens required.**

| Location | Impact |
|----------|--------|
| `event-card.tsx` | No changes needed; existing choice rendering handles new conditions via `describeCondition` |
| `lineage.tsx` DynastyPanel | Could optionally show active story stages, but not required for MVP |
| `present.ts` `names()` | Could add `storyStage` / `advanceStory` chronicle kinds if those effects write chronicle entries |
| `messages.ts` | Add `describeCondition` strings for `storyStage` / `storyChoice` (RU/EN) |

**Recommended:** No UI changes for MVP. Story chains are invisible to the player except through event gating (locked reasons already display via `describeCondition`).

---

## 11. Risks and Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `lineage.storyStages` grows unbounded | Low | Low | Chains are content-defined; bounded by number of chain events |
| `storyChoice` chronicle lookup is O(n) | Low | Low | Chronicle capped at 400 entries (MAX_CHRONICLE) |
| Chain state not cleared on succession | Medium | Low | By design — chains are lineage-level; intentional for family sagas |
| `triggerStory` could fire during `advance` mid-loop | Low | Medium | `selectEvent` is called once per year; `triggerStory` sets `state.pending` which causes early return |
| Chronique `link` field for chain provenance | Low | Low | `ChronicleEntry.link` already exists; optional |

**Dependencies:** None beyond existing narrative/condition/effect infrastructure. No new packages, no schema change, no UI framework changes.

---

## 12. Ordered Implementation Plan

| Order | Task | File(s) | Complexity |
|-------|------|---------|------------|
| 1 | Add `storyStages?: Record<string, number>` to `LineageState` | `types.ts:434` | Trivial |
| 2 | Add `storyStage` + `storyChoice` to `Condition` union | `narrative/types.ts:87` | Trivial |
| 3 | Add `advanceStory` + `triggerStory` to `Effect` union | `narrative/types.ts:152` | Trivial |
| 4 | Add `when.storyStage` + `when.storyChoice` DSL | `narrative/dsl.ts:109` | Trivial |
| 5 | Add `fx.advanceStory` + `fx.triggerStory` DSL | `narrative/dsl.ts:50` | Trivial |
| 6 | Add `checkCondition` + `describeCondition` cases | `engine/conditions.ts:125` | Low |
| 7 | Add `applyEffect` cases + handler functions | `engine/effects.ts:501` | Low |
| 8 | Add `storyStages ?? {}` normalization in `applyAction` | `engine/game.ts:377` | Trivial |
| 9 | Add `checkLineage` validation for `storyStages` | `engine/save.ts:335` | Low |
| 10 | Write tests (`stage04-4-chains.test.ts`) | `test/stage04-4-chains.test.ts` | Medium |
| 11 | Run typecheck, lint, tests, build | — | — |

**Estimated total:** Small (1–2 days). All changes are additive and localized to the narrative/engine layers.

---

## 13. Files Likely to Change

**Modified (10):**
1. `packages/game-core/src/types.ts` — `LineageState.storyStages?`
2. `packages/game-core/src/narrative/types.ts` — `Condition.storyStage`, `Condition.storyChoice`, `Effect.advanceStory`, `Effect.triggerStory`
3. `packages/game-core/src/narrative/dsl.ts` — `when.storyStage`, `when.storyChoice`, `fx.advanceStory`, `fx.triggerStory`
4. `packages/game-core/src/engine/conditions.ts` — `checkCondition` + `describeCondition` for new types
5. `packages/game-core/src/engine/effects.ts` — `applyEffect` cases + `advanceStory`/`triggerStory` handlers
6. `packages/game-core/src/engine/game.ts` — `storyStages ?? {}` normalization
7. `packages/game-core/src/engine/save.ts` — `checkLineage` validation for `storyStages`
8. `packages/game-core/src/legacy/present.ts` — optional `names()` case for new chronicle kinds
9. `apps/web/src/lib/messages.ts` — `describeCondition` strings for `storyStage`/`storyChoice`
10. `packages/game-core/test/stage04-4-chains.test.ts` — new test file

**Created (1):**
- `packages/game-core/test/stage04-4-chains.test.ts`

---

## 14. Estimated Complexity

| Part | Complexity | Rationale |
|------|-----------|-----------|
| Data model (`storyStages?`) | Trivial | One optional field on existing interface |
| Condition types + DSL | Trivial | Follows existing `when.story` / `fx.schedule` patterns exactly |
| `checkCondition` / `describeCondition` | Low | Simple lookup with `??` defaults; matches existing `thread`/`story` patterns |
| `applyEffect` handlers | Low | `advanceStory` is a counter increment; `triggerStory` is a `ScheduledEvent` push |
| Save normalization + validation | Low | Follows `autoMode ??= "manual"` pattern |
| Tests | Medium | Need to cover advancement, gating, choice lookup, old-save normalization, round-trip, succession |
| UI | None (MVP) | Existing `EventCard` / `describeCondition` handles new conditions |

**Overall complexity: Low.** The design reuses existing infrastructure and avoids creating a parallel quest framework.

---

## 15. Status

**READY FOR IMPLEMENTATION**

The existing narrative architecture provides all necessary building blocks (conditions, effects, scheduled events, consequences, lineage state, chronicle links, history entries). No blocking gaps exist. The proposed scope is minimal, additive, save-compatible, and can be implemented without touching Stage 04.1, 04.2, 04.3, or 04.3.1 changes.

**Verified facts vs. recommendations:** All capability classifications (Section 3–4) are based on direct source code inspection. The implementation scope (Section 5–14) is a recommendation based on the audit findings.
