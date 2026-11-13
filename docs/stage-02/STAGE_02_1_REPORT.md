# STAGE 02.1 — Implementation Report

**Status:** COMPLETE  
**Date:** 2026-11-13  
**Scope:** first slice of STAGE 02 — health, illness, injury and cause of death.  
**Production:** not changed. No commit, push, deploy, DB migration or production command was run.

## 1. Outcome

The deterministic player health model is implemented in `game-core`:

- persistent `GameState.health` with a 0–100 life-health value;
- capped, de-duplicated active conditions (`illness`, `injury`, `wound`, `curse`) with severity, source, onset age, duration/recovery rule, yearly damage and lethality;
- yearly worsening, recovery, condition damage, age/vitality drift and lethal crisis;
- death remains the existing single `kill()` path; cause is stored in `life.deathCause` **and** mirrored to `health.deathCause`;
- death history entry includes the cause and active condition names;
- `LifeView` exposes `health` (value, conditions, cause of death);
- play `CharacterSheet` shows the existing design with a compact Life health panel, RU/EN strings;
- save schema is **9** with an additive, RNG-preserving 8→9 migration;
- strict `parseSave` validation and bounded arrays.

## 2. Files

### New

- `packages/game-core/src/life/health.ts` — catalog, state helpers, yearly simulation, view.
- `packages/game-core/src/narrative/health-events.ts` — shared `common.wound` and one world-specific event per world.
- `packages/game-core/test/stage02-health.test.ts` — 10 tests for the required behaviours.
- `packages/game-core/test/fixtures/saves-v8.ts` — schema-8 alive/dead fixtures (health removed).
- `docs/stage-02/HEALTH_SIMULATION.md` — model, migration, events, UI, tests, risks.
- `docs/stage-02/STAGE_02_1_REPORT.md` — this report.

### Modified — core

- `packages/game-core/src/types.ts` — `HealthState`, `HealthCondition`, kind union, `GameState.health`.
- `packages/game-core/src/engine/game.ts` — schema 9, new-life health, action normalization, death entry, fatal-cause handling.
- `packages/game-core/src/engine/save.ts` — 8→9 migration, `checkHealth`.
- `packages/game-core/src/engine/effects.ts` — `condition`/`cure` effects, health-aware resource damage, `kill` mirrors cause.
- `packages/game-core/src/engine/conditions.ts` — `health` and `condition` condition types and descriptions.
- `packages/game-core/src/life/aging.ts` — yearly `healthYear` step, passive rest no longer refills life health.
- `packages/game-core/src/legacy/succession.ts` — heir starts with fresh health.
- `packages/game-core/src/narrative/types.ts` — DSL effect/condition unions.
- `packages/game-core/src/narrative/dsl.ts` — `fx.condition`, `fx.cure`, `when.health`, `when.condition`, `when.noCondition`.
- `packages/game-core/src/narrative/selection.ts` — content validation for condition effects/conditions.
- `packages/game-core/src/narrative/common.ts` — shared health event; condition effects on fever/old-wound.
- `packages/game-core/src/universes/registry.ts` — append world health events.
- `packages/game-core/src/index.ts` — public health exports.

### Modified — shared / web

- `packages/shared/src/views.ts` — `LifeView.health` and `toLifeView` mapping.
- `packages/shared/test/schemas.test.ts` — view coverage for health and death cause.
- `apps/web/src/components/play/character-sheet.tsx` — Life health panel and condition cards.
- `apps/web/src/lib/messages.ts` — RU/EN health strings.

### Modified — test expectations only

`packages/game-core/test/save.test.ts`, plus schema-version assertions/equality checks in:

- `stage04-3-relics.test.ts`
- `stage04-5-2-dynasty-world-influence.test.ts`
- `stage04-5-3-generational-memory.test.ts`
- `stage04-5-4-world-feedback.test.ts`
- `stage04-5-world-narrative.test.ts`
- `stage04-dynasty.test.ts`
- `stage04-economy.test.ts`
- `stage04-market.test.ts`
- `stage05-adventure.test.ts`
- `stage06-balance.test.ts`
- `stage06-region.test.ts`
- `stage07-dynasty.test.ts`
- `stage08-dynasty.test.ts`
- `stage09-world.test.ts`
- `stage10-mastery.test.ts`
- `stage10-world-integration.test.ts`

These changes only move hard-coded schema 8 to the current version and account for the additive `health` field. No production code was affected by them.

**Not touched:** `apps/api/src/portal/`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `.env.example`. Existing portal/untracked work was left intact.

## 3. Schema decision

Used **schema 9**, not an optional field at schema 8, because the shape and semantics of `GameState` changed and the task explicitly asks for an additive migration when the shape changes.

`migrateV8`:

- does not read or modify `seed` or `rngState`;
- derives alive `health.value` from the existing `resources.health / maxResources.health` share, clamped to 1–100;
- sets dead lives to value 0 and copies `life.deathCause` into `health.deathCause`;
- leaves all other fields untouched and adds no invented conditions.

`parseSave` remains strict: 0–100 value, max 6 unique conditions, bounded severity/duration/damage, boolean flags, localized death cause.

## 4. Commands and results

Run from `G:\III\endemion-life`:

| Command | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **PASS** — 43 files, 620 tests |
| `pnpm --filter @endemion/shared test` | **PASS** — 2 files, 13 tests |
| `pnpm --filter @endemion/web test` | **PASS** — 2 files, 9 tests (extra check) |
| `pnpm typecheck` | **PASS** — packages, API and web |
| `pnpm lint` | **PASS** — 0 errors; 1 pre-existing warning in untouched `play-screen.tsx` (`react-hooks/exhaustive-deps`) |

The full game-core suite includes the new `stage02-health.test.ts` (10 tests) and all pre-existing tests after schema-version expectation updates.

## 5. Determinism and bounds

- All health randomness uses `ctx.rng`; no wall clock, network, DB or filesystem access in `game-core`.
- Conditions are capped at 6, unique by id, and re-application worsens rather than duplicates.
- Death remains the existing single path; `healthYear` returns a cause and `life/aging.ts` calls `kill()` once.
- `applyAction` normalizes `health` at the action boundary; `parseSave` rejects malformed arrays.

## 6. Remaining work / follow-ups

Outside this slice (explicitly deferred): education/career, property, business, travel, multiplayer, broad balance pass.

Specific known gaps:

1. Two health pools are intentional (`resources.health` short-term, `health.value` long-term); this should be watched in playtesting and may be renamed or unified in a later balance pass.
2. No treatment inventory or clinic system; curing is only a narrative effect.
3. No pregnancy, childbirth risk or disability model.
4. No content currently creates a true chronic condition (`duration: 0` is supported but unused).
5. Long-term damage from pre-existing `fx.health` events is proportional; a soak/balance pass may still adjust values.
6. Migrated old saves begin with no active conditions because schema ≤ 8 had no condition history; this is intentional and documented.

## 7. Review safety

The working tree is safe to review. All changes are additive or test-expectation updates; no portal, config, database or production file was modified. Nothing was staged or committed.
