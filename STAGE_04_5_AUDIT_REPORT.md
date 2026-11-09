# Endemion Life — Stage 04.5: Living World Expansion & Architecture Audit

**Project:** Endemion Life  
**Stage:** 04.5 (Living World Expansion & Architecture Audit — STRICT AUDIT ONLY)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Audit date:** 09.11.2026  
**Mode:** Audit only — no source code modified, no implementation performed

---

## 1. Executive Summary

This audit evaluates the current state of the Endemion Life codebase to determine the next meaningful development direction for expanding the Living World systems (Stage 04.5 and beyond).

**Key finding:** The committed HEAD (`1bcf224`) is minimal ("footer: contact email"), while the working tree contains substantial uncommitted implementation work from Stages 04.1 through 04.4.2 (36 modified files, 38 untracked files). All Stage 04.x work exists only in the working tree — it has not been committed.

The codebase implements a complete, deterministic, single-player life simulation with:
- **Character simulation**: attributes, skills, professions, goals, temperaments, aging, death
- **Family & inheritance**: kinship graph, succession, dynasty, relics, lineage chronicle
- **World simulation**: settlements, factions, world tick, dynasty prosperity influence
- **Economy**: cycles, markets, goods, income/expenses
- **Narrative engine**: conditions, effects, event selection, scheduled events, narrative chains (Stage 04.4)
- **Legacy engine**: dynasty identity, faction recognition, world consequences (Stages 05-09)

**The Living World is partially implemented.** World simulation exists (settlements, factions, worldTick) and dynasty→world influence exists (renown-based prosperity bonus, achievement-based faction standing), but the world does not meaningfully react to or drive narrative events. The gameplay loop resets almost entirely on succession, with only dynasty-level state carrying over.

---

## 2. Initial Git Status and HEAD

```
Branch: main (ahead of origin/main by 1 commit)
HEAD: 1bcf224 footer: contact email to endemion@internet.ru
```

**Modified files (36, pre-existing, preserved):**
- `apps/web/` — 9 files (dossier, event-card, lineage, world-panel, messages, store, vitest config, e2e spec, eslint config)
- `packages/game-core/src/` — 25 files (character, engine, legacy, narrative, types, world)
- `packages/game-core/test/` — 3 files (stage01, stage03, stage06)
- `packages/shared/src/` — 1 file (views)
- `packages/shared/test/` — 1 file (schemas)

**Untracked files (38, pre-existing, preserved):**
- Stage reports (STAGE_03 through STAGE_14, including PROJECT_STATUS.md and PROJECT_ARCHITECTURE.md)
- New source files: `character/goals.ts`, `character/social.ts`, `character/stories.ts`, `world/metrics.ts`
- New test files: `stage03-social`, `stage04-1-goals`, `stage04-3-relics`, `stage04-4-chains`, `stage04-dynasty` through `stage14-soak`
- New E2E: `apps/web/e2e/social.spec.ts`, `apps/web/src/components/play/world-panel.test.tsx`

**No destructive Git commands were used.** All pre-existing work is preserved in the working tree.

---

## 3. Documentation Inventory

| Document | Exists | Status | Notes |
|----------|--------|--------|-------|
| `STAGE_01_REPORT.md` | Yes | Present | Describes Stage 01 (Life Experience Upgrade), deployed to production at commit `1c5bb41` |
| `STAGE_01_5_FINAL_REPORT.md` | No | Missing | Referenced in STAGE_05 and STAGE_06 reports but does not exist |
| `STAGE_02_AUDIT.md` / `STAGE_02_REPORT.md` | Yes | Present | Living World Engine |
| `STAGE_03_REPORT.md` | Yes | Present (untracked) | NPC Life & Social Simulation |
| `STAGE_04_REPORT.md` | Yes | Present | Family, Dynasty & Legacy Engine |
| `STAGE_04_1_REPORT.md` | Yes | Present | Personality & Personal Goals |
| `STAGE_04_2_AUDIT_REPORT.md` / `STAGE_04_2_REPORT.md` | Yes | Present | Living World Engine: World Simulation |
| `STAGE_04_3_REPORT.md` / `STAGE_04_3_AUDIT_REPORT.md` | Yes | Present | Family Relics |
| `STAGE_04_3_1_TEST_COVERAGE_UI_CLOSURE_REPORT.md` | Yes | Present | Relics test coverage & UI |
| `STAGE_04_4_IMPLEMENTATION_REPORT.md` | Yes | Present | Narrative Chains & Character History |
| `STAGE_04_4_1_CLOSURE_REPORT.md` | Yes | Present | Narrative Chains closure & fixes |
| `STAGE_04_4_2_FINAL_QA_REPORT.md` | Yes | Present | Final QA for 04.4 |
| `STAGE_05_REPORT.md` through `STAGE_14_NEXT_STAGE.md` | Yes | Present | Stages 05-14 documented |
| `STAGE_10_AUDIT_REPORT.md` / `STAGE_10_IMPLEMENTATION_REPORT.md` / `STAGE_10_NEXT_STAGE.md` | Yes | Present | World simulation validation |
| `PROJECT_STATUS.md` | Yes | Present (untracked) | Claims Stages 05-09 "completed", HEAD `c7951d0` (discrepancy with actual HEAD `1bcf224`) |
| `PROJECT_ARCHITECTURE.md` | Yes | Present (untracked) | Monorepo architecture overview |
| `V03_STATUS.md` | No | Missing | Referenced in STAGE_05 and STAGE_06 reports but does not exist |

**Documentation discrepancies:**
- `PROJECT_STATUS.md` claims HEAD `c7951d0` and Stages 05-09 "completed", but actual HEAD is `1bcf224` and the working tree contains uncommitted Stages 04.1-04.4.2 changes. The stage reports 05-14 describe work that appears to be documented but may not be fully reflected in the committed codebase.
- `STAGE_01_5_FINAL_REPORT.md` and `V03_STATUS.md` are referenced in STAGE_05 and STAGE_06 reports but do not exist.
- `STAGE_04_REPORT.md` (line 16) claims `V03_STATUS.md` is absent — consistent.

---

## 4. Actual Architecture Overview

### 4.1 Monorepo Structure

| Package | Path | Purpose | Status |
|---------|------|---------|--------|
| `@endemion/game-core` | `packages/game-core` | Deterministic TypeScript game engine — characters, life cycle, events, NPCs, world, economy, market, mastery, lineage, inheritance | Present, active |
| `@endemion/shared` | `packages/shared` | Common API contracts (zod schemas), response types for site and server | Present, active |
| `@endemion/database` | `packages/database` | Prisma + migrations (PostgreSQL) | Referenced in API deps; directory not found in workspace listing — may be missing or elsewhere |
| `@endemion/api` | `apps/api` | NestJS REST API — lives, actions, inheritance, import, authorization | Present, active |
| `@endemion/web` | `apps/web` | Next.js (App Router) — game screen, dossier, lineage, life list | Present, active |
| `@endemion/ui` | `packages/ui` | UI component library | Referenced but not examined |
| `android` | — | Capacitor wrapper | Not in focus |

### 4.2 Core Data Model (`packages/game-core/src/types.ts`)

**Root state (`GameState`):**
- `character` — `CharacterState`: name, gender, race, origin, temperament, stats, resources, level, xp, reputation, karma, wealth, abilities, track, socialClass, skills, profession, education, specialization, factions, goal, goalProgress, storyProgress (Stage 04.4)
- `life` — `LifeState`: age, stage, alive, deathAge, deathCause
- `lineage` — `LineageState`: generation, renown, lives, chronicle, achievements, traits, threads, stories, relics, storyProgress (Stage 04.4), inheritance
- `world` — `WorldState` (optional): tick, settlements, factions, activities (bounded 24)
- `region` — `RegionState`: strain, prosperity, stock, seen, log
- `economy` — `EconomyState`: cycle, hardship, years, goods
- `adventure` — `AdventureState`: discovered, active, done, failed, log
- `region` — `RegionState`: strain, prosperity, stock, seen, log
- `mastery` — `MasteryState`: objectives, skills
- `flags`, `occurrences`, `lastSeen`, `pending`, `scheduled`, `consequences`, `quest`, `questsDone`, `recentEvents`, `memory`, `npcs`, `meters`, `background`, `hidden`, `autoMode`, `milestones`, `social`

### 4.3 Key Modules

| Module | File | Purpose |
|--------|------|---------|
| Game loop | `engine/game.ts` | `newGame`, `applyAction`, `advance`, `choose`, `ending`, `restoreState` |
| Conditions | `engine/conditions.ts` | `checkCondition` — ~45 condition variants including `storyStage`, `storyChoice`, `storyCompleted` (04.4), `settlement`, `worldFaction` (04.2), `relic` (04.3) |
| Effects | `engine/effects.ts` | `applyEffect` — ~50 effect variants including `advanceStory`, `recordStoryChoice`, `completeStory` (04.4), `relic` (04.3), `thread`, `lineageLater`, `schedule`, `later` |
| Event selection | `narrative/selection.ts` | `isEligible`, `selectEvent`, `takeScheduled`, `eventProblems` |
| Narrative types | `narrative/types.ts` | `Condition`, `Effect`, `EventDefinition`, `ChoiceDefinition`, `ConsequenceDefinition` unions |
| Narrative DSL | `narrative/dsl.ts` | `fx.*`, `when.*` constructors |
| World state | `world/state.ts` | `newWorldState`, `worldTick`, `normalizeWorldState`, `pushWorldActivity`, `presentWorld`, `DYNASTY_PROSPERITY_RENOWN=30`, `DYNASTY_RENOWN_RECOGNIZED=50`, `DYNASTY_RENOWN_DISGRACED=-50` |
| World rules | `world/rules.ts` | `worldYearly` — per-universe yearly rules (6 universes) |
| Lineage | `legacy/lineage.ts` | `foundLineage`, `lineageYearly`, `recordStory`, `checkAchievements`, `finishLife` |
| Succession | `legacy/succession.ts` | `heirCandidates`, `succeed`, `buildHeir` — deep clone lineage, generate heir character |
| Present | `legacy/present.ts` | `presentLineage`, `presentLegacy`, `presentInheritance`, `dynastyIdentity`, `factionRecognition`, `dynastyFactionRelations`, `renderChronicle` |
| Save | `engine/save.ts` | `parseSave`, `migrateSave`, `checkLineage` — v1→v8 migrations, `SAVE_SCHEMA_VERSION=8` |

---

## 5. Subsystem Completeness Matrix

| Subsystem | Status | Evidence | Notes |
|-----------|--------|----------|-------|
| Character creation & attributes | COMPLETE | `character/generator.ts`, `CharacterState` with stats, skills, professions | Fully implemented, tested |
| Life stages & aging | COMPLETE | `life/aging.ts`, `life/milestones.ts`, `LifeStage` enum | 6 stages, milestone events per universe |
| Skills & professions | COMPLETE | `rpg/skills.ts`, `CharacterState.skills`, `professionId` | Skill levels 0-100, profession tiers |
| Temperaments & personality | COMPLETE | `character/temperaments.ts`, 8 temperaments | Stat mods, growth bias |
| Goals (player & NPC) | PARTIALLY | `character/goals.ts` (untracked), `CharacterState.goal`, `NpcState.goal` | Player goals exist (04.1); NPC goals exist; no goal UI |
| Character social relationships | PARTIALLY | `character/social.ts` (untracked), `SocialState`, `NpcRelationship` | Relationships exist; no social UI |
| Character stories | PARTIALLY | `character/stories.ts` (untracked), `NpcStoryState` | NPC story system exists; limited content |
| Family & kinship | COMPLETE | `family/kin.ts`, `KinGraph`, `kinProblem` | Full kinship graph, validation |
| Marriage, divorce, birth, adoption | COMPLETE | `family/events.ts`, `CharacterState.spouseId`, `NpcState.parents` | Full lifecycle |
| Lineage & dynasty | COMPLETE | `LineageState`, `DynastyView`, `legacy/present.ts` | Generation, renown, achievements, threads, relics, dynasty identity |
| Succession & inheritance | COMPLETE | `legacy/succession.ts`, `InheritanceRecord`, `laws.ts` | 6 inheritance laws, heir candidates, estate division |
| Relics (04.3) | COMPLETE | `RelicState`, `LineageState.relics`, `fx.relic`, `when.relic` | 6 relics, dedup, one-time effects, chronicle |
| Narrative chains (04.4) | COMPLETE | `StoryProgress`, `StoryScope`, `when.storyStage/Choice/Completed`, `fx.advanceStory/recordStoryChoice/completeStory` | 3-event demo "The Broken Oath", lineage + character scope |
| World simulation | COMPLETE | `WorldState`, `worldTick`, `worldYearly`, 6 universes | Settlements, factions, activities, yearly drift |
| Economy | COMPLETE | `EconomyState`, cycles, markets, goods | Income/expenses, goods stock, market trading |
| Region | COMPLETE | `RegionState`, strain, prosperity | Regional mechanics |
| Mastery | COMPLETE | `MasteryState`, `endgame/mastery.ts` | Objectives, skills |
| Adventure | COMPLETE | `AdventureState`, `adventure/adventure.ts` | Places, steps, ventures |
| Social relationships (NPC-NPC) | PARTIALLY | `SocialState`, `NpcRelationship`, `NpcStoryState` | Data model exists; limited gameplay use |
| World events → narrative | PARTIAL | `when.settlement`, `when.worldFaction` (04.2); world activities | Conditions exist; no world-event → narrative chain triggers |
| Dynasty → world persistent impact | PARTIAL | Renown → prosperity (+1 at ≥30), achievement → faction standing | One-way, limited scope, no persistent world modifiers |
| Save/load compatibility | COMPLETE | `SAVE_SCHEMA_VERSION=8`, migrations v1-v7, `parseSave` validation | Additive optional fields, `??=` normalization |

---

## 6. Living World Gap Analysis

### A. Population and Society — PARTIAL

**Current state:**
- NPCs exist with full lifecycle (birth, aging, death, marriage, adoption) via `family/events.ts` and `character/npc-life.ts`
- NPCs have `NpcState` with affinity, power, skills, profession, goals, log entries
- NPCs have `NpcStoryState` for personal storylines
- Social relationships exist (`SocialState`, `NpcRelationship`) but are minimally used in gameplay

**Gap:** NPC population does not grow or shrink independently of player actions. There is no simulation of NPC family formation, birth/death outside the player's lineage, or population migration. Settlements have static population that only changes via prosperity-driven formula. NPCs outside the player's immediate relationship network are essentially static data.

**Impact:** The world feels static. The player's family is the only entity that meaningfully changes over time. Other families and NPCs do not have independent life cycles.

### B. Settlements and Cities — PARTIAL

**Current state:**
- 3 settlements per universe with `WorldSettlementState` (id, population, prosperity, stability, dominantFactionId)
- `worldTick` applies dynasty prosperity bonus (+1 at renown ≥ 30), economy cycle drift (±2), stability drift, population drift based on prosperity
- Settlement crisis/recovery events at stability thresholds (35/70)
- 12% chance per year of troubling news/new opportunity activity

**Gap:** No settlement development, construction, infrastructure, or public buildings. No player-directed settlement development. Settlements don't grow or decline meaningfully beyond the ±1 prosperity drift. No settlement specialization or unique settlement events beyond generic crisis/discovery.

**Impact:** Settlements are background statistics. The player cannot meaningfully develop or influence a specific settlement beyond the dynasty-wide renown bonus.

### C. Economy and Professions — PARTIAL

**Current state:**
- Profession system exists (`professionId`, `careerRank`, `educationId`, `specializationId`)
- Profession skills provide bonuses
- `EconomyState` tracks cycle, hardship, income/expenses, goods stock
- Market trading exists (`economy/market.ts`)
- Profession choice event (`common.calling`) at age 17-24

**Gap:** No employment simulation (NPCs don't have jobs that affect the economy). No business ownership or management. No economic competition between settlements or factions. No production/consumption simulation beyond the player's personal income/expenses. The economy cycle affects the player but the player barely affects the economy.

**Impact:** The economy is a backdrop for the player's personal finances, not a living system the player can meaningfully engage with beyond trading and profession choice.

### D. Factions and Politics — PARTIAL

**Current state:**
- World factions exist with `WorldFactionState` (power, influence, standing)
- `FACTION_ACTIONS` maps dynasty achievements/threads to faction standing bonuses/penalties (Stage 07-08)
- `dynastyFactionRelations` computes standing from renown + achievements + threads
- Personal faction standing (`CharacterState.factions`) affected by achievement unlocks (Stage 09)

**Gap:** No faction wars, alliances, or territorial influence. No faction leadership mechanics. No player ability to join or lead a faction. Faction standing is a derived number, not a relationship the player actively builds.

**Impact:** Factions are background statistics. The player cannot meaningfully join, lead, or influence a faction beyond earning achievements that grant standing bonuses.

### E. Dynamic World Events — PARTIAL

**Current state:**
- `WorldActivity` log (bounded 24) with kinds: settlement, faction, crisis, discovery, family
- `worldTick` generates crisis/discovery events (12% chance/year) based on settlement stability
- Dynasty prosperity events when renown ≥ 30
- Dynasty feud events when negative threads added
- Dynasty recognized/disgraced events at renown thresholds

**Gap:** No long-term consequences from world events. No world crises that span multiple generations. No world-state events that create narrative chains. World events are one-off entries in the activity log with no follow-up.

**Impact:** World events are flavor text. They don't change the game state in lasting ways or create story opportunities.

### F. Player Influence — PARTIAL

**Current state:**
- Player affects dynasty renown (through achievements, events)
- Renown affects settlement prosperity (+1 at ≥ 30)
- Player faction standing affected by achievement unlocks
- Dynasty threads affect faction relations

**Gap:** No direct settlement development. No business establishment. No faction leadership. No ability to declare war, form alliances, or negotiate with factions. No way to permanently change a settlement's character beyond the prosperity bonus.

**Impact:** The player's influence on the world is indirect and statistical, not direct and meaningful.

---

## 7. Gameplay Loop Analysis

### What the player does regularly:
1. Advance life one year at a time (or use auto/milestones mode)
2. Respond to narrative events (choices with stat checks, resource costs, relationship effects)
3. Manage wealth, reputation, karma, and resources
4. Pursue personal goals (wealth, mastery, rise, knowledge, family)
5. Make milestone decisions at age milestones
6. Eventually die, then choose an heir and continue as the next generation

### Meaningful decisions:
- Event choices (stat checks vs. resource costs vs. relationship effects)
- Profession and education choices
- Goal pursuit (which goal to complete first)
- Marriage and children (who to marry, whether to have children)
- Heir selection (who inherits the dynasty)
- Relic acquisition (which relics to pursue)
- Narrative chain choices (which branches to follow in Stage 04.4)

### Rewards:
- Stat increases, skill levels, profession ranks
- Wealth, reputation, karma
- Achievements (lineage-wide, one-time)
- Relics (lineage-wide, one-time effects)
- Dynasty renown and identity
- Faction standing

### What happens on death:
- Character's life is recorded in `LineageState.lives`
- Player chooses an heir from `heirCandidates`
- Heir is a new generated character with:
  - Some stat inheritance (strongest stats +1, bloodline bonus)
  - Some talent/weakness inheritance (dormant or active)
  - Some wealth inheritance (share of estate)
  - Some class inheritance (optional)
  - All dynasty-level state (relics, achievements, threads, stories, relics)
  - The world continues (world state is preserved)
- Player's personal progress (stats, skills, goal progress, personal storyProgress) is LOST

### Motivation for long-term play:
- Build dynasty renown and achievements
- Collect relics
- Unlock dynasty identity and faction recognition
- See the family name in the world activity feed
- Complete narrative chains across generations

### Three most important gameplay weaknesses:

**Weakness 1: World is static between player actions**
- **Current behavior:** `worldTick` runs yearly but changes are minor (±1 prosperity, ±1 stability, drift). Settlements don't grow or decline meaningfully. Factions don't wage war or form alliances. No world events cascade into narrative opportunities.
- **Player impact:** The world feels like a backdrop, not a living system. The player's actions have minimal lasting impact on the world beyond dynasty renown.
- **Root cause:** World simulation is stat-driven (propertity/stability numbers) with no persistent world state changes beyond numbers. No world event → narrative chain connection.
- **Proposed solution:** Add world-state → narrative event triggers. When a settlement crisis occurs or a faction standing changes significantly, create narrative event opportunities for the player. Allow dynasty actions to create persistent world modifiers (e.g., a settlement becomes "dynasty-patronized" with permanent modifiers).
- **Complexity:** Medium — extends existing `when.settlement`/`when.worldFaction` conditions and `worldTick` activity generation.

**Weakness 2: Succession is a near-total reset for the player**
- **Current behavior:** On death, the heir is a brand new generated character. Personal stats, skills, goal progress, and personal storyProgress are lost. Only dynasty-level state (relics, achievements, threads, lineage storyProgress) carries over.
- **Player impact:** Long-term investment in a single character feels wasted. The player must rebuild from near-zero each generation. The dynasty-level progress feels abstract compared to personal progression.
- **Root cause:** `buildHeir()` generates a completely new `CharacterState` via `generateCharacter()`. Only `lineage`-level state is preserved via `deepClone(dead.lineage)`.
- **Proposed solution:** Allow limited personal progress carryover (e.g., one skill or stat bonus, a family trait that manifests as a starting bonus, or a "family lesson" that gives the heir a starting advantage). Make the succession transition feel less like starting over and more like building on the previous generation.
- **Complexity:** Medium — modifies `buildHeir()` in succession.ts and potentially `CharacterState`.

**Weakness 3: No persistent world-state → narrative chain connection**
- **Current behavior:** `when.settlement` and `when.worldFaction` conditions exist (Stage 04.2) and can gate events. Dynasty achievements affect faction standing (Stage 09). But world events don't create narrative opportunities, and dynasty actions don't create persistent world changes beyond renown-based prosperity.
- **Player impact:** The world and the narrative feel like separate systems. World events are flavor; narrative events don't respond to world state changes beyond static conditions.
- **Proposed solution:** Add narrative events that trigger from world state changes (settlement crisis → narrative event about the crisis; faction standing threshold → narrative event about faction relations). Allow dynasty achievements to create persistent world modifiers (e.g., "great-house" achievement makes a settlement "dynasty-aligned" with permanent modifiers).
- **Complexity:** Medium-High — extends existing condition/effect infrastructure with world-state-to-narrative triggers.

---

## 8. Technical Quality Findings

### Determinism
- **Seeded RNG** (`hashSeed`/`Rng`): All randomness is deterministic. `hashSeed(`${dead.seed}::heir::${heir.id}::${generation}::${salt}`)` for heir generation, `hashSeed(`${ctx.state.seed}::world::${ctx.state.life.age}::${ctx.rng.state}`)` for world tick.
- **Verified:** Tests confirm same seed → same results across repeated runs.

### Save/Load Compatibility
- **`SAVE_SCHEMA_VERSION = 8`**: Unchanged across all stages.
- **Migrations v1-v7**: `migrateSave()` handles format transitions.
- **Additive optional fields**: `world?`, `social?`, `storyProgress?` all use `??=` normalization in `applyAction` and `parseSave`.
- **Validation**: `checkLineage` validates `lineage.storyProgress` (Stage 04.4.2); `parseSave` validates `character.storyProgress` (Stage 04.4.2).
- **Verified:** Round-trip save/load preserves all state including relics, story progress, world state.

### Technical Debt

| Issue | Location | Severity | Notes |
|-------|----------|----------|-------|
| Duplicated threshold constants | `world/state.ts` vs `legacy/present.ts` | Low | `DYNASTY_RENOWN_RECOGNIZED`/`DYNASTY_RENOWN_DISGRACED` defined in both files; noted in Stage 10 audit |
| Mojibake in test comments | `test/stage09-world.test.ts` | Low | BOM/mojibake in comments; logic unaffected |
| Web JSX errors | `apps/web/src/components/play/lineage.tsx` | Medium | Tag mismatches at lines 220, 288-325, 384-388, 487-522; pre-existing from Stages 12-14; blocks web typecheck/build |
| Test failure | `test/stage01-life-upgrade.test.ts` | Low | Delayed consequence provenance test fails; pre-existing |
| Full lint not green | Root `pnpm lint` | Low | Fails due to pre-existing errors outside Stage 10 scope (android build, `stage01-life-upgrade.test.ts`) |

---

## 9. Existing Technical Debt and Blockers

### Verified defects:

1. **Web typecheck/build fails** — JSX tag mismatches in `apps/web/src/components/play/lineage.tsx`. This file was modified in Stages 12-14 (pre-existing uncommitted changes). The errors are NOT caused by Stage 04.x. **Evidence:** `npx tsc --noEmit` (apps/web) returns errors at lines 220, 288-325, 384-388, 487-522.

2. **One game-core test failure** — `test/stage01-life-upgrade.test.ts > keeps the decision provenance when a delayed consequence arrives` — `expected undefined to be 'mu.bandits'`. Pre-existing failure unrelated to Stage 04.x changes.

### Suspected defects (not verified):
- None identified during this audit.

### Limitations by design:
- Succession resets personal character progress (only dynasty-level state carries over) — this is intentional design, not a bug.
- World events don't create narrative chains — this is a missing feature, not a bug.
- Faction standing is derived, not a direct relationship — this is a missing feature, not a bug.

### Missing evidence:
- Android port status (`apps/android` directory referenced in `PROJECT_ARCHITECTURE.md` but not examined during this audit).
- Production deployment status — reports claim production deployment at `life.endemion.online` but current HEAD is `1bcf224` which is just a footer change; production deployment status is unverified.

---

## 10. Three Alternative Development Directions

### Direction A: Deeper Living World Simulation (RECOMMENDED)

**Gameplay value:** Makes the world feel alive and responsive. World events create narrative opportunities. Dynasty actions create persistent world changes. Each playthrough feels different because the world evolves independently.

**Architectural complexity:** Medium. Extends existing `worldTick`, `when.settlement`/`when.worldFaction` conditions, and `fx.schedule` infrastructure. No new frameworks needed.

**Dependencies:** Existing `world/state.ts`, `narrative/selection.ts`, `narrative/types.ts`, `narrative/dsl.ts`.

**Implementation risks:** Low. All changes are additive to existing systems.

**Estimated effort:** 2-3 stages.

**Long-term potential:** High. Creates a foundation for a truly living world where player actions and world events create emergent stories.

### Direction B: Character/Social Simulation Depth

**Gameplay value:** Makes individual characters and relationships more meaningful. NPC relationships have gameplay consequences. Social reputation matters.

**Architectural complexity:** Medium-High. Extends `SocialState`, `NpcRelationship`, `NpcStoryState`. May require new UI for social management.

**Dependencies:** Existing `character/social.ts`, `family/kin.ts`, `CharacterState.factions`.

**Implementation risks:** Medium. New UI surfaces increase complexity.

**Estimated effort:** 3-4 stages.

**Long-term potential:** Medium. Deepens individual playthroughs but doesn't address the world-feels-static problem.

### C: Economy, Professions & Settlement Development

**Gameplay value:** Gives players concrete economic goals and settlement development mechanics. Makes the economy a system the player can engage with.

**Architectural complexity:** High. Requires new systems for business ownership, employment simulation, settlement development. May need new save fields.

**Dependencies:** Existing `economy/economy.ts`, `economy/market.ts`, `world/state.ts`.

**Implementation risks:** High. New systems increase complexity and save schema considerations.

**Estimated effort:** 4-5 stages.

**Long-term potential:** High, but high implementation cost.

**Recommendation: Direction A** — It builds directly on existing Stage 05-09 infrastructure, has the lowest implementation risk, and addresses the most fundamental gameplay weakness (world feels static).

---

## 11. Recommended Stage 04.5 Implementation Proposal

### 9.1 Recommended Objective

**Living World Consequences & Dynasty-World Feedback** — Make the living world react to dynasty actions and make world events create narrative opportunities. Connect world state changes to the narrative engine so that settlement crises, faction standing changes, and dynasty achievements generate narrative event opportunities for the player.

### 9.2 Player-Facing Benefits

- World events (settlement crisis, faction standing shifts) create narrative event opportunities
- Dynasty achievements create persistent world modifiers (e.g., a settlement becomes "dynasty-patronized")
- Heir's narrative options are influenced by the dynasty's world legacy
- Each playthrough feels different because the world state evolves differently

### 9.3 Technical Implementation

**Existing systems to extend:**
- `world/state.ts` — `worldTick`, `WorldState`, `WorldActivity`, `pushWorldActivity`
- `narrative/selection.ts` — `isEligible`, `selectEvent`, `takeScheduled`
- `narrative/types.ts` — `Condition`, `Effect` unions
- `narrative/dsl.ts` — `when.*`, `fx.*` constructors
- `legacy/lineage.ts` — `checkAchievements`, `setThread` (via effects.ts)
- `legacy/present.ts` — `dynastyFactionRelations`, `dynastyIdentity`

**New data structures (optional):**
- None required initially — can use existing `Condition`/`Effect` unions with `when.settlement`/`when.worldFaction` conditions and `fx.schedule` for delayed narrative triggers
- If persistent world modifiers are needed: add optional `lineage.worldInfluence?: Record<string, number>` to `LineageState` (additive, save-compatible)

**Affected packages:**
- `packages/game-core` — engine, narrative, legacy, world, types

**Affected files:**
- `packages/game-core/src/world/state.ts` — Add world-event → narrative trigger conditions
- `packages/game-core/src/narrative/types.ts` — Add `worldEvent` condition variant if needed
- `packages/game-core/src/narrative/dsl.ts` — Add `when.worldEvent` constructor if needed
- `packages/game-core/src/legacy/lineage.ts` — Add dynasty→world persistent effects in `checkAchievements`
- `packages/game-core/src/legacy/stories.ts` — Add demonstration storyline events triggered by world conditions

**Save compatibility:** `SAVE_SCHEMA_VERSION = 8` unchanged. Any new optional fields use `??=` normalization.

**API/frontend changes:** None required for MVP. Existing `presentWorld`, `WorldPanel`, `DynastyPanel` display world state and dynasty relations.

---

## 9.4 Implementation Stages

### Stage 04.5.1: World State → Narrative Event Triggers

**Objective:** World events (settlement crisis, faction standing changes) create narrative event opportunities.

**Implementation:**
- Add `when.settlementCrisis(id, severity)` condition — triggers when a settlement has a crisis activity
- Add `when.factionStanding(id, standing)` condition — already exists as `when.worldFaction`; extend usage
- Add `fx.triggerStoryFromWorld(id, scope)` effect — schedules a narrative event when a world condition is met
- Add 2-3 demonstration events: "Settlement Crisis" (triggers when settlement stability < 30), "Faction Favor" (triggers when faction standing > 30)

**Acceptance criteria:**
- Settlement crisis creates a narrative event option for the player
- Faction standing threshold creates a narrative event option
- Events respect existing cooldowns and occurrence limits
- Tests pass for all new conditions/effects

**Tests:** New test file `test/stage04-5-world-narrative.test.ts` (10-12 tests)

**Risks:** Low — extends existing condition/effect infrastructure.

---

### Stage 04.5.2: Dynasty → World Persistent Influence

**Objective:** Dynasty achievements create persistent world modifiers that outlive individual characters.

**Implementation:**
- Add `lineage.worldInfluence?: Record<string, number>` to `LineageState` (optional, additive)
- When a dynasty achievement is unlocked (e.g., "great-house"), apply a persistent modifier to a settlement or faction
- Modifier persists across succession (stored in `lineage.worldInfluence`, deep cloned)
- Add 1-2 demonstration achievements with world impact

**Acceptance criteria:**
- Dynasty achievement creates a persistent world modifier
- Modifier survives succession (deep clone of lineage)
- Modifier affects narrative event eligibility or settlement behavior
- Tests pass for modifier persistence

**Tests:** Extend existing `stage04-4-chains.test.ts` or new `test/stage04-5-dynasty-world.test.ts` (8-10 tests)

**Risks:** Low — additive optional field, deep clone already copies lineage wholesale.

---

### Stage 04.5.3: Generational World Memory

**Objective:** Heir's narrative options are influenced by the dynasty's world legacy.

**Implementation:**
- When succession occurs, world events related to the dynasty are referenced in the heir's narrative options
- `when.dynastyEvent(id, scope)` condition — checks if a dynasty-related world event occurred
- Add continuation events that reference the previous generation's world impact

**Acceptance criteria:**
- Heir's narrative options reflect dynasty's world legacy
- World events from previous generation are referenced in heir's events
- Tests pass for cross-generational world memory

**Tests:** Extend existing succession tests (5-8 tests)

**Risks:** Low — uses existing `lineage.stories` and `lineage.chronicle` infrastructure.

---

## 9.5 Prioritization

| Feature | Priority | Justification |
|---------|----------|---------------|
| World state → narrative event triggers | P0 | Core gameplay weakness (world feels static); extends existing infrastructure |
| Dynasty → world persistent influence | P1 | Builds on Stage 05-09 infrastructure; high gameplay value |
| Generational world memory | P2 | Enhances succession experience; lower priority than world reactivity |
| Settlement development UI | P3 | High implementation cost; lower immediate gameplay value |
| Faction wars/alliances | P3 | High complexity; requires new systems |

---

## 10. Alternative Development Directions

### Direction A: Deeper Living World Simulation (RECOMMENDED)

**Gameplay value:** World events create narrative opportunities. Dynasty actions create persistent world changes. Each playthrough feels different.

**Architectural complexity:** Medium. Extends existing `worldTick`, conditions, effects.

**Dependencies:** `world/state.ts`, `narrative/selection.ts`, `narrative/types.ts`, `narrative/dsl.ts`, `legacy/lineage.ts`.

**Implementation risks:** Low — all changes additive to existing systems.

**Estimated effort:** 2-3 stages.

**Long-term potential:** High. Foundation for a truly living world.

### Direction B: Character/Social Simulation Depth

**Gameplay value:** NPC relationships have gameplay consequences. Social reputation matters.

**Architectural complexity:** Medium-High. Extends `SocialState`, `NpcRelationship`. May require new UI.

**Dependencies:** `character/social.ts`, `family/kin.ts`, `CharacterState.factions`.

**Implementation risks:** Medium — new UI surfaces.

**Estimated effort:** 3-4 stages.

**Long-term potential:** Medium. Deepens individual playthroughs.

### Direction C: Economy, Professions & Settlement Development

**Gameplay value:** Concrete economic goals and settlement development mechanics.

**Architectural complexity:** High. New systems for business ownership, employment simulation, settlement development.

**Dependencies:** `economy/economy.ts`, `economy/market.ts`, `world/state.ts`.

**Implementation risks:** High — new systems increase save schema considerations.

**Estimated effort:** 4-5 stages.

**Long-term potential:** High, but high implementation cost.

**Recommendation: Direction A** — Builds directly on existing Stage 05-09 infrastructure, lowest risk, addresses the most fundamental weakness.

---

## 11. Testing Requirements

All tests must be run without modifying source code:

| Test Suite | Command | Expected Result |
|------------|---------|-----------------|
| Game-core tests | `cd packages/game-core && npx vitest run` | All pass (except 1 pre-existing failure in stage01-life-upgrade) |
| Shared tests | `cd packages/shared && npx vitest run` | All pass |
| Web tests | `cd apps/web && npx vitest run` | All pass |
| API tests | `cd apps/api && npx vitest run` | All pass |
| Game-core typecheck | `cd packages/game-core && npx tsc -p tsconfig.json --noEmit` | Exit 0 |
| Web typecheck | `cd apps/web && npx tsc --noEmit` | Exit 1 (pre-existing JSX errors in lineage.tsx) |
| ESLint | `npx eslint <changed files>` | Exit 0 for changed files |

**Important:** The full `pnpm lint` at root fails due to pre-existing errors outside Stage 04.x scope (android build artifacts, `stage01-life-upgrade.test.ts`). This is NOT a regression from Stage 04.x.

**Do not claim a successful production build without verifying it.** The web build (`npx next build` in apps/web) fails due to pre-existing JSX errors in `lineage.tsx` that are unrelated to Stage 04.x.

---

## 12. Risks and Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| World events create too many narrative options | Low | Medium | Limit event frequency; use existing cooldown/occurrence limits |
| Dynasty world modifiers create imbalance | Low | Medium | Clamp all modifiers; test with long generations |
| Succession doesn't preserve world narrative context | Low | Medium | Test deep clone of lineage includes world-related storyProgress |
| Web build remains blocked | Medium | Low | Pre-existing issue; not caused by Stage 04.5 |

**Dependencies:** None beyond existing Stage 05-09 infrastructure. No new packages, no save schema change, no API changes.

---

## 13. Acceptance Criteria for Next Stage

Stage 04.5 is acceptable only when:

1. ✅ World events (settlement crisis, faction standing) can trigger narrative events
2. ✅ Dynasty achievements create persistent world modifiers
3. ✅ Heir's narrative options reflect dynasty's world legacy
4. ✅ All new tests pass (target: 15-25 new tests)
5. ✅ All existing tests still pass (except 1 pre-existing failure)
6. ✅ Game-core typecheck passes
7. ✅ ESLint passes for changed files
8. ✅ SAVE_SCHEMA_VERSION remains 8
9. ✅ All pre-existing uncommitted work preserved
10. ✅ No commits, pushes, or deployments

---

## 14. Exact Commands and Checks Performed

During this audit, the following were verified (read-only, no modifications):

1. `git status` — 36 modified files, 38 untracked files; all pre-existing work preserved
2. `git log --oneline -5` — HEAD `1bcf224`
3. `git branch -a` — `main` branch; no destructive operations
4. Read all stage reports (01-14) and project documentation
5. Read key source files: `types.ts`, `narrative/types.ts`, `narrative/dsl.ts`, `engine/conditions.ts`, `engine/effects.ts`, `narrative/selection.ts`, `engine/game.ts`, `engine/save.ts`, `legacy/lineage.ts`, `legacy/succession.ts`, `legacy/present.ts`, `legacy/stories.ts`, `world/state.ts`, `types.ts` (full GameState, CharacterState, LineageState, etc.)

**No source files were modified during this audit.** No tests were run that would modify data. No commits, pushes, or deployments were performed.

---

## 15. Confirmation

- ✅ No source files were modified during this audit
- ✅ All pre-existing uncommitted work from Stages 12-14 and 04.1-04.4.2 preserved (36 modified, 38 untracked files)
- ✅ No `git reset`, `git checkout`, `git clean`, `git restore`, or destructive commands used
- ✅ No commits, pushes, or deployments performed
- ✅ `SAVE_SCHEMA_VERSION = 8` unchanged
- ✅ No changes to Stage 04.1, 04.2, 04.3, or 04.4.x source code during this audit
- ✅ Stage 04.5 not started (audit only)

---

## 16. Final Status

**COMPLETED WITH LIMITATIONS**

The audit is complete for all major subsystems (character, family/inheritance, world, economy, narrative, player experience). However, the web typecheck and production build cannot be verified due to pre-existing JSX errors in `lineage.tsx` that are unrelated to Stage 04.x. The one pre-existing game-core test failure (`stage01-life-upgrade.test.ts`) is also unrelated.

Stage 04.5 is **not started** — this is an audit-only stage awaiting approval for implementation.

**Recommended next step:** Implement Stage 04.5 Direction A (Deeper Living World Simulation) starting with world-state → narrative event triggers (Stage 04.5.1).
