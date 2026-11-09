# Stage 04 Audit Report — Living World & Legacy Engine

**Project:** Endemion Life  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224` (footer: contact email to endemion@internet.ru — deployed to production)  
**Working tree:** clean  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (`packages/game-core/src/engine/game.ts:58`)

---

## 1. Executive summary

The repository already contains a substantial portion of what the user's Stage 04 describes:
- Legacy & inheritance engine (`legacy/succession.ts`, `legacy/lineage.ts`, `legacy/laws.ts`, `legacy/summary.ts`, `legacy/present.ts`)
- Family tree & kin graph (`family/kin.ts`)
- Family chronicle (`legacy/chronicle.ts`, `life/chronicle.ts`)
- Living world simulation (`world/state.ts`, `world/rules.ts`, `world/metrics.ts`)
- Life stages & milestones (`life/stages.ts`, `life/milestones.ts`, `life/aging.ts`)
- Dynamic story/event chain system (`narrative/dsl.ts`, `narrative/selection.ts`, `narrative/people.ts`, `narrative/common.ts`)
- Character biography (`BackgroundState.biography`)
- Temperament/personality dispositions (`character/temperaments.ts`)

**Conflict found:** `PROJECT_STATUS.md` and `STAGE_04_REPORT.md` state Stage 04 (Family, Dynasty & Legacy Engine) is **completed**. The user's new Stage 04 task ("Living World & Legacy Engine", sub-stages 04.1–04.7) is a **broader, separate effort** whose specific additions — player personality traits, player personal goals, family relics, extended dynamic story chains — are **not fully present**.

No code has been modified for this audit. No implementation has begun.

---

## 2. Current architecture overview

Monorepo (pnpm workspaces), one-way dependency flow: `web`/`api` → `shared` → `game-core`. `game-core` is pure TypeScript with no IO.

| Layer | Package | Responsibility |
|---|---|---|
| Game logic (pure, deterministic) | `packages/game-core` | Character, lifespan, events, checks, effects, six universes, legacy, world, economy, adventure, mastery |
| API contracts / views | `packages/shared` | `toLifeView`, zod schemas, `LifeView`, `LineageView`, API error types |
| Persistence | `packages/database` | Prisma + migrations (schema version tracked in `lives.schema_version`) |
| Server API | `apps/api` | NestJS: sessions, accounts, universes, lives, actions, import, social ties |
| Client | `apps/web` | Next.js App Router: play screen, dossier, timeline, lineage, world panel |
| Mobile | `apps/android` | Capacitor wrapper (out of focus) |
| Infrastructure | `infrastructure/` | Docker Compose (dev + prod), Nginx, backup, monitor, deploy scripts |
| CI | `.github/workflows/` | `ci.yml` (lint/typecheck/test/build/migrations/E2E/Docker), `deploy.yml`, `security.yml` |

**Determinism:** `applyAction(state, action)` is pure — same state + action + seeded RNG → same result. No `Math.random()` in simulation. RNG is Mulberry32 (`hashSeed`/`Rng`), state stored in `rngState`.

**Save:** single `GameState` JSON, schema version 8, additive optional fields (`world`, `social`, `economy`, `adventure`, `region`, `mastery`) normalized at action/presentation boundaries; old saves migrate without version bump.

---

## 3. Existing implemented systems (relevant to Stage 04)

| System | Files | Status |
|---|---|---|
| Legacy & inheritance | `packages/game-core/src/legacy/succession.ts`, `laws.ts`, `lineage.ts`, `chronicle.ts`, `summary.ts`, `present.ts`, `achievements.ts`, `stories.ts` | Complete: `heirCandidates`, `succeed`, 6 inheritance laws, regency, estate division, dynasty view, faction relations, 30+ achievements |
| Family tree / kin graph | `packages/game-core/src/family/kin.ts`, `legacy/present.ts` (`presentTree`) | Complete: `KinGraph`, blood relations, spouses, adopted, cycle detection, `MIN_PARENT_AGE=12`, `MAX_DEPTH=12` |
| Family chronicle | `packages/game-core/src/legacy/chronicle.ts`, `packages/game-core/src/life/chronicle.ts` | Complete: 400-entry chronicle with trim, kinds (origin/birth/death/marriage/succession/inheritance/achievement/deed/secret/story/milestone/faction), `toLifeChronicle` projection |
| Life stages & milestones | `packages/game-core/src/life/stages.ts`, `life/milestones.ts`, `life/aging.ts` | Complete: infant/child/teen/adult/middle/elder, milestone ages per universe, milestone events with choices |
| Living world | `packages/game-core/src/world/state.ts`, `world/rules.ts`, `world/metrics.ts` | Complete: 3 settlements × 6 worlds, prosperity/stability/population, factions, `worldTick`, dynasty renown influence, activity feed capped at 24 |
| Dynamic story/event engine | `packages/game-core/src/narrative/dsl.ts`, `selection.ts`, `people.ts`, `common.ts` | Complete: `fx`/`when` DSL, conditions, effects, scheduled events, cooldowns, `maxOccurrences`, `lineageMax`, weighted selection, `eventProblems` validation |
| Character biography | `types.ts` (`BackgroundState.biography`), `engine/game.ts` (`newGame`), `legacy/present.ts` | Complete: set at birth from `character/birth.ts`, presented in tree/chronicle |
| Temperament / disposition | `packages/game-core/src/character/temperaments.ts` | Complete: brave/cunning/kind/ambitious/calm/curious with stat mods and growth bias; used by `common.own-bent` event |
| NPC goals | `types.ts` (`NPC_GOALS`, `NpcState.goal`), `character/npc-life.ts` | Complete but **NPC-only**; player `CharacterState` has no `goal` |
| NPC relationships & social stories | `packages/game-core/src/character/social.ts`, `stories.ts` | Complete (Stage 03): relationships, personal stories (craft-ambition, old-rivalry, family-crisis), interactions (help/invite/court) |
| Economy / market / region | `packages/game-core/src/economy/` | Complete (Stage 04 in repo numbering): economy cycle, market goods, region |

---

## 4. Incomplete / missing systems (gaps vs user's Stage 04 scope)

| User's Stage 04 item | Current state | Gap |
|---|---|---|
| **04.1 Character personality** (Courage, Empathy, Ambition, Discipline, Curiosity, Loyalty influencing gameplay) | `character/temperaments.ts` has 6 dispositions (brave/cunning/kind/ambitious/calm/curious) with stat mods + growth bias; `common.own-bent` event reacts to temperament | Partial. Temperament exists but is disposition, not the user's named trait set; no explicit player personality trait mechanics beyond stat mods |
| **04.1 Personal goals** evolving through life | `NPC_GOALS` exists but only on `NpcState.goal`; `CharacterState` has no `goal` field | Missing for player |
| **04.1 Life stages** | `life/stages.ts`, `milestones.ts`, `aging.ts` | Complete |
| **04.2 Living world simulation** | `world/state.ts`, `world/rules.ts`, `worldTick` | Complete |
| **04.2 World events & consequences** | `narrative/people.ts`, `common.ts`, `world/rules.ts`, `legacy/stories.ts` (`LINEAGE_CONSEQUENCES`) | Complete |
| **04.3 Family tree** | `family/kin.ts`, `presentTree` | Complete |
| **04.3 Inheritance** | `legacy/succession.ts`, `laws.ts` | Complete |
| **04.3 Family relics** | No relic system found | Missing |
| **04.3 Family chronicle** | `legacy/chronicle.ts`, `life/chronicle.ts` | Complete |
| **04.4 Dynamic story chains** | `narrative/dsl.ts`, `selection.ts`, `common.ts`, `legacy/stories.ts` | Complete core; user's "story chains with conditions/follow-ups" exists but could be extended |
| **04.5 Life chronicle & biography** | `life/chronicle.ts`, `BackgroundState.biography` | Complete |
| **04.6 UX & immersion** | `apps/web/src/components/play/` (dossier, lineage, timeline, world-panel, etc.) | Complete UI exists; user's UX improvements are additive |
| **04.7 QA & stabilization** | `pnpm test`, `lint`, `typecheck`, `build` all pass | Complete baseline |

---

## 5. Technical debt relevant to Stage 04

1. **Root `pnpm lint` blocked by pre-existing noise** — `android/app/build/.../native-bridge.js` (45 errors) and `packages/game-core/test/stage01-life-upgrade.test.ts:59` (`prefer-const`, `let state` reassigned via property mutation). Neither blocks Stage 04 code but blocks `pnpm lint` exit 0. Fixed in Stage 13 (android ignore + `const`).
2. **Uncommitted user work** — working tree was clean at HEAD `1bcf224`; all Stage 12–14 changes are committed and deployed. No stray uncommitted changes.
3. **Duplicate stage documentation** — `PROJECT_STATUS.md`/`STAGE_04_REPORT.md` claim Stage 04 completed; the user's new Stage 04 has a different, broader scope. Reports should not be treated as authority for what exists.
4. **No family relics system** — not present anywhere; would be new persisted data (needs care with `SAVE_SCHEMA_VERSION = 8`).

---

## 6. Compatibility risks

| Risk | Assessment |
|---|---|
| **`SAVE_SCHEMA_VERSION = 8` must stay** | Any relic/personality/goal persistence must be additive optional fields normalized at boundaries, OR a migration with `save.ts` `migrateV*` + tests. No schema change preferred for Stage 04. |
| **Determinism** | All new simulation code must use existing `Rng`/`hashSeed`, no `Math.random()`. |
| **Six worlds must stay valid** | `eventProblems()` validates all universe content; any new events/conditions/effects must pass it. |
| **Existing saves remain compatible** | New optional fields default via `normalize*`. |
| **No `Math.random()`** | Verified absent in `game-core/src`; new code must follow. |
| **Web build depends on packages `dist`** | `pnpm build:packages` before `pnpm --filter @endemion/web build` / `lint` / `typecheck` / tests (existing order in `ci.yml`). |

---

## 7. Recommended integration points

| Feature | Integration point | Why |
|---|---|---|
| Player personality traits | `CharacterState` + `character/temperaments.ts` or new `character/personality.ts` | Extends existing disposition system; events already read `when.temperament(...)` |
| Player personal goals | `CharacterState.goal` + new `character/goals.ts` | Mirrors `NPC_GOALS`; checked by `when.goal(...)` condition |
| Family relics | New `character/relics.ts` + `LineageState.relics` | Additive lineage field, normalized for old saves |
| Dynamic story chains | `narrative/dsl.ts`, `selection.ts` (`when.*`, `fx.*`, `schedule`, `lineageLater`) | Existing DSL already supports conditions/follow-ups; extend content |
| Character biography | `BackgroundState.biography` already exists | Generate from actual `HistoryEntry`/`memory` on death, append to `background.biography` |

---

## 8. Systems that must remain unchanged

- `SAVE_SCHEMA_VERSION = 8` (no new version unless migration implemented)
- `legacy/succession.ts` `succeed` (atomic, transactional, tested)
- `family/kin.ts` `KinGraph` (cycle/age validation)
- `world/rules.ts` per-universe yearly rules (deterministic)
- `engine/game.ts` `applyAction` pipeline
- `SAVE_SCHEMA_VERSION` and save normalization approach (additive optional fields)
- Production is **not** to be touched by this stage

---

## 9. Feature duplication risks

| Potential duplication | Existing system | Recommendation |
|---|---|---|
| Player personality | `character/temperaments.ts` | Reuse/extend, don't replace |
| Personal goals | `NPC_GOALS` / `NpcState.goal` | Extend pattern to player, don't duplicate |
| Family tree | `family/kin.ts`, `presentTree` | Reuse, don't rebuild |
| Family chronicle | `legacy/chronicle.ts`, `life/chronicle.ts` | Reuse, don't rebuild |
| Story chains | `narrative/dsl.ts`, `selection.ts` | Reuse DSL, add content |
| Living world | `world/state.ts`, `worldTick` | Reuse, don't rebuild |

---

## 10. Proposed implementation sequence (04.1 → 04.7)

1. **04.1 Life Simulation 2.0** — add player `goal` field + `character/goals.ts`; extend/adapt temperament into explicit player personality traits with gameplay effects (via existing `when.temperament`/`fx` DSL); add goals test.
2. **04.2 Living World Engine** — world simulation already exists; audit `worldTick`/`world/rules.ts` for world-event consequences affecting settlements/factions; add world-event → gameplay-effect tests if gaps found.
3. **04.3 Legacy Engine 2.0** — add family relics (`LineageState.relics`, additive, normalized); verify inheritance/family-tree/chronicle coverage.
4. **04.4 Dynamic Story Engine** — extend `narrative/dsl.ts` conditions/effects if needed; add new story-chain events with conditions/follow-ups; add `eventProblems` coverage.
5. **04.5 Life Chronicle & Memories** — generate biography from real `HistoryEntry`/`memory` on death into `background.biography`; verify chronicle categories/importance.
6. **04.6 UX & Immersion** — additive UI panels in `apps/web/src/components/play/` following existing conventions (no redesign).
7. **04.7 Balancing, QA & Stabilization** — unit/integration/deterministic/performance tests; full `pnpm check`; regression assessment.

Each stage stops for approval before the next begins (per workflow).

---

## 11. Test coverage assessment

| Suite | Current | Stage 04 additions needed |
|---|---|---|
| `packages/game-core` | 34 files / 429 tests pass | Personality, goals, relics, world-event consequences, story-chain validation, biography generation |
| `packages/shared` | 2 files / 12 tests pass | View projection tests for new fields |
| `apps/api` | 3 files / 18 tests pass | Import/save validation for new optional fields |
| `apps/web` | 2 files / 9 tests pass | UI tests for new panels (if added) |
| E2E (Playwright) | 62 tests pass | World-summary, goals, relics scenarios (if UI added) |

Baseline `pnpm check` equivalent passes: typecheck 0, lint 0, tests all green, web build 0. New code must keep this green.

---

## 12. Risks and constraints

- **Documentation conflict:** `PROJECT_STATUS.md` says Stage 04 completed; treat as stale for this new scope. Do not assume features exist based on reports alone — verified by reading source.
- **Schema version:** `SAVE_SCHEMA_VERSION = 8`; relics/personality/goals persistence must be additive optional fields OR an explicit migration with tests. Do not bump version without migration plan.
- **Production:** no deployment, no commit, no push for this audit stage (per scope).
- **Clean-checkout CI:** not yet verified for this branch state; local working-tree validation passed in Stage 14, true clean-checkout/CI validation pending.

---

## 13. Next step

This audit is **complete**. No implementation has been performed. Awaiting approval before beginning Stage 04.1 implementation.

**Report file:** `STAGE_04_AUDIT_REPORT.md`
