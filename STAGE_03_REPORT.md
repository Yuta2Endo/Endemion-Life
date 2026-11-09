# Endemion Life - Stage 03: NPC Life & Social Simulation

**Status:** implementation and local verification completed; production deployment is not authorized and was not performed.
**Base:** `main` at `c7951d008c51816f488b9aa8e3dbb4e3c56e05e6`
**Scope:** additive Stage 03 slice on top of the existing life, family, world and dossier systems.

## 1. Executive summary

Stage 03 extends the existing simulation with persistent NPC-to-NPC relationships, three multi-year personal story lines for significant NPCs, three new player interactions, settlement- and relationship-aware NPC behaviour, a compact dossier projection for people, and RU/EN presentation. All new state is optional, bounded, deterministic and backward compatible with older saves. No existing NPC, family, event or world engine was replaced.

## 2. Starting point and audit

The audit confirmed that the repository already contains life stages, NPC lifecycle ticks, family/kin graphs, world settlements and factions, a chronicle, a dossier and cloud/local saves. Stage 03 therefore integrates with those systems instead of creating parallel ones. The work is based on the existing `GameState`, `NpcState`, `EngineContext`, `presentProfile` and dossier tab structure.

## 3. Architecture overview

- `packages/game-core/src/character/social.ts` owns NPC-to-NPC relationship records, validation/normalization, settlement derivation, relationship logging and social influence.
- `packages/game-core/src/character/stories.ts` owns personal story definitions, eligibility, stage progression, completion, failure and abandonment.
- `packages/game-core/src/character/interactions.ts` owns the player-facing rules and now also advances or fails a personal story.
- `packages/game-core/src/character/npc-life.ts` remains the single yearly NPC lifecycle pipeline and calls the social/story systems.
- `packages/game-core/src/engine/profile.ts` projects the new data into the existing `LifeView` / `NpcView`.
- `apps/web/src/components/play/dossier.tsx` renders the new projection in the existing People section.

## 4. Data model

`GameState.social?: SocialState` contains:

- `relationships: NpcRelationship[]` - stored NPC-to-NPC ties only;
- `stories: NpcStoryState[]` - personal story records for significant NPCs;
- `nextRelationshipId` / `nextStoryId` - monotonic identifiers.

Relationship types are `family`, `friend`, `rival`, `romantic`, `mentor`, `colleague`, `enemy`, `acquaintance`. Story statuses are `active`, `done`, `failed`, `abandoned`. Player-to-NPC relations remain derived from role and affinity, so there is still a single source of truth for how an NPC feels about the player.

## 5. Save compatibility and migration

- `SAVE_SCHEMA_VERSION` remains `8`; no migration is required.
- `social` is optional. Old saves without it load and receive a normalized empty social state on the next action.
- `checkSocial` validates identifiers, types, numeric bounds, duplicate pairs, duplicate story keys and counters; malformed optional entries are discarded instead of corrupting a life.
- Normalization runs at action boundaries (`newGame`, `applyAction`, `advance`); presentation uses the pure `readSocialState` reader.
- Bounds: 120 relationships, 48 story records, 3 concurrently active stories.

## 6. Determinism

All stage/story decisions use `hashSeed` and the existing seeded `Rng` derived from the game seed, character age and current RNG state. No `Math.random()` was introduced. `storyTick` reads the RNG state but does not consume it, so it cannot desynchronize other systems. The same seed and choices produce the same social history.

## 7. NPC-to-NPC relationship engine

- `relationshipBetween`, `relationshipsOf` and `otherSide` provide read access.
- `setRelationship` / `adjustRelationship` update strength and trust while keeping one record per unordered pair.
- `ensureKinRelationships` seeds family ties from the existing kin graph.
- `ensureSocialTies` creates deterministic colleague ties for NPCs in the same faction when a year passes.
- Marriage creates a strong family tie; divorce downgrades it to a strained acquaintance; rivalries and mentorship can be recorded by existing systems.
- Relationship names and all generated text are localized RU/EN.

## 8. Social influence on NPC behaviour

`socialInfluence()` counts trusted support ties and hostile ties for an NPC. These values modulate existing yearly weights:

- promotion and class-up are more likely with trusted support;
- job loss and illness are more likely with active friction.

The effect is bounded and additive; it does not bypass the existing yearly NPC decision pipeline.

## 9. Settlement and world integration

- Each NPC's settlement is derived deterministically from the NPC id and the universe settlement seeds.
- `settlementFactor` uses world prosperity/stability to modulate promotion, job loss, illness, class-up and class-down.
- Important NPC changes publish entries through the existing world activity feed via the exported `pushWorldActivity` wrapper.
- Missing and returning NPCs also leave world-level activity, connecting personal outcomes to the living world.

## 10. Personal stories

Three definitions are implemented:

- `craft-ambition` - a career/mastery line for working adults;
- `old-rivalry` - a feud line for rivals or NPCs with negative affinity;
- `family-crisis` - a health/wealth crisis for close kin.

Each line has three stages, a deterministic yearly chance to advance (0.7) and to start (0.24), at most one active line per NPC, and a global cap of three active lines. Successful play interactions advance the line; failed interactions can fail it; death abandons it.

## 11. Story outcomes

- `craft-ambition` completion raises career rank, power and wealth.
- `old-rivalry` completion improves affinity and records a truce.
- `family-crisis` completion restores health and family affinity.
- Failure breaks the line, applies a small penalty for the family crisis and writes a localized log entry.
- Completion and failure are stored in the NPC log and shown in the dossier; they do not misuse the world chronicle's `story` kind, which is reserved for named world events.

## 12. New player interactions

The interaction registry now includes:

- `help` - help an adult NPC with their affairs; available from age 12 with sufficient affinity or an active story;
- `invite` - invite an adult NPC over; available from age 10 at higher affinity;
- `court` - court an unrelated, unmarried adult NPC from age 16.

Success advances a personal story when one is active and updates affinity/logs; failure can fail the story. Existing `talk`, `gift`, `confront` and `ask-help` interactions also record relationship log entries. The shared interaction schema picks up the new ids automatically.

## 13. NPC yearly lifecycle integration

`npc-life.ts` remains the only yearly NPC pipeline. It now:

- applies settlement and social factors to existing behaviour weights;
- records relationship logs on promotion, class change, marriage and divorce;
- emits world activity for promotion, class change, missing and return;
- initializes kin and colleague ties;
- runs `storyTick` before forgotten NPC archiving.

No second NPC tick or duplicate event engine was added.

## 14. Dossier and presentation

`NpcView` now includes life stage, goal, social class, settlement, relationships, stories and recent events. `LifeProfile` now includes player connections and recent relationship changes. The People section of the dossier displays:

- a Connections panel with derived player ties and recent changes;
- per-NPC life stage, class, settlement and goal;
- personal story progress;
- NPC-to-NPC relationships;
- recent NPC events.

The new fields are optional projections, so existing consumers and saves remain valid.

## 15. Localization

All new user-visible strings use the existing `t(ru, en)` mechanism, including relationship names, stages, goals, story titles and texts, event descriptions and dossier labels. No new hardcoded UI strings were added. RU and EN are covered by the core test and the browser test.

## 16. UI and responsive behaviour

The new blocks reuse existing dossier panels and responsive styles. Story, relationship and event blocks are compact text lists, and the People section keeps its existing mobile tab path. The added E2E test verifies both desktop and mobile projects.

## 17. Core tests

New file `packages/game-core/test/stage03-social.test.ts` contains 8 tests:

- empty social state and compatibility with a save without `social`;
- unique NPC-to-NPC pairs and round-trip stability;
- deterministic story progression;
- completion and abandonment;
- availability of `help` / `invite` / `court`;
- dossier RU/EN projection;
- all six universes;
- failed-story outcome.

Full core result: **25 files, 331 tests passed**.

## 18. API, shared and web tests

- `packages/shared`: 2 files, 11 tests passed.
- `apps/api`: 3 files, 18 tests passed.
- `apps/web` unit: 1 file, 5 tests passed.
- New Playwright file `apps/web/e2e/social.spec.ts`: 2 scenarios x desktop/mobile.

## 19. Playwright verification

The browser suite was executed locally against a production build with a local PostgreSQL database and Redis:

- **60 of 62 tests passed** across desktop and mobile, including all 4 new social scenarios.
- The only failures are the two existing "milestone mode" cases. At `HEAD`, the test expects the text "Возрастной рубеж", but the `play.milestone` message key is not rendered anywhere in the application; the test therefore fails independently of this Stage 03 change.
- The new scenario confirms that Connections, NPC life stage and NPC cards render after several simulated years and that the new labels switch to English.

## 20. Build, typecheck and lint

| Check | Result |
| --- | --- |
| `pnpm --filter @endemion/game-core typecheck` | passed |
| `pnpm --filter @endemion/web typecheck` | passed |
| `pnpm --filter @endemion/api typecheck` | passed |
| `pnpm --filter @endemion/game-core test` | 25 files / 331 tests passed |
| `pnpm -r test` | all package tests passed |
| `pnpm build:packages` | passed (ui, database, game-core, shared) |
| `pnpm --filter @endemion/web build` | passed |
| Targeted ESLint on all changed source/test files | passed |
| `pnpm --filter @endemion/web lint` | passed with one pre-existing hook warning in `play-screen.tsx` |

Repository-wide `pnpm lint` remains blocked by pre-existing noise: a generated `android/app/build/.../native-bridge.js` artifact and a `prefer-const` issue in `test/stage01-life-upgrade.test.ts`. Neither file was modified for Stage 03.

## 21. Additional fix

While running the full core suite, an existing negative-zero serialization edge case in `economy.ts` became reachable: `expenses` could be `-0`, which survives in memory but becomes `0` after a JSON round trip. The calculation was changed to sum negated amounts, producing `+0`. This is a small serialization-stability fix required to keep succession round-trip tests green.

## 22. Security, privacy and constraints

- No secrets, credentials or production data were added to the repository.
- New save fields are validated and bounded before use.
- All new output is localized and derived from existing state.
- No package versions were changed.
- No production deployment, upload or remote mutation was performed.
- The local E2E environment used a temporary PostgreSQL container on port 5433 because the developer machine already had a service on 5432; that temporary container was removed after verification.

## 23. Deployment guidance and next stage

Deployment remains **not authorized** for this stage. When authorization is given, the existing release path applies: build the production images, run database migrations, start the updated API and web containers, and verify `/api/health` plus the dossier flows. No schema migration is needed for the optional `social` field, but normal backup and rollback procedures still apply.

Recommended next stage: **Stage 04 - Family, Dynasty and Legacy**, building on the stored NPC relationships, story outcomes and settlement linkage to carry family memory across generations without duplicating the existing lineage system.
