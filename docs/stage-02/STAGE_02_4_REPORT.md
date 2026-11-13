# STAGE 02.4 — Travel & Settlements — Implementation Report

**Status:** COMPLETE in the working tree
**Date:** 2026-11-14
**Scope:** fourth slice of STAGE 02 — persistent location, server-authoritative travel between existing settlements, location-gated events/weights, local economy modifiers and save evolution 11 → 12.
**Production:** not changed. No commit, push, deploy, reset, clean or production command was run. Production remains `b634a67`, schema 8.

## 1. Outcome

- Every life has exactly one current settlement, stored as an id into the **existing** per-universe settlement catalogue (`world/state.ts`). No second settlement catalogue exists.
- New lives start in the first settlement of their universe. Schema-11 saves migrate to the first settlement already present in their `world.settlements` (or the catalogue fallback).
- A new `travel` `GameAction` moves between any two existing settlements in all six universes. It is server-authoritative, deterministic, costs wealth, and rejects dead lives, unresolved events, unknown/current destinations and insufficient gold.
- Travel appends a bounded move history and a timeline entry (`kind: "travel"`), with a `location` change chip.
- Each universe has a settlement-tagged event whose eligibility changes with location, and tagged events receive a location weight multiplier.
- The annual economy applies a local wage line and local cost-of-living multiplier once, through the existing economy pipeline. No market simulation was duplicated.
- `LifeView.location` exposes current settlement, tags, local modifiers, move history and server-priced travel choices. The play screen has a mobile-safe `TravelPanel`; the dossier’s Living world tab shows the current location.
- Save schema is **12**; schema 11 migrations preserve `seed`, `rngState` and all existing fields. This is a JSON save-state change only — no Prisma/database migration was needed.

## 2. Design summary

### State

```ts
interface LocationState {
  settlementId: string;
  since: number;
  history: LocationMove[]; // bounded, oldest first
}

interface LocationMove {
  from: string;
  to: string;
  age: number;
  cost: number;
}
```

The catalogue entries themselves gained `kind`, `tags`, `wageFactor`, `costFactor` and `travelCost`. The first settlement in every universe has neutral `wageFactor`/`costFactor`, so old balance and old saves are unchanged until travel actually happens.

### Travel

```ts
{ type: "travel", settlementId: string }
```

`world/location.ts::travel()` checks, in order: alive (also guarded by `applyAction`), no pending event, destination belongs to the character’s universe, destination is not current, and `wealth >= cost`. Cost is symmetric:

```
max(3, round((from.travelCost + to.travelCost) / 2))
```

The cost is charged exactly once through `applyEffect({ type: "wealth" })`, preserving the `0..WEALTH_MAX` clamp. Travel does not advance age or touch the main RNG. The API’s existing `actionId` replay and row-lock transaction provide idempotency and concurrency; no second action system was introduced.

### Location effects

- `Condition` gains `{ type: "location"; ids?: string[]; tags?: string[] }`; DSL has `when.location(...tags)` and `when.settlementAt(...ids)`.
- One gated event per universe: `df.location.mist-road`, `is.location.frontier-survey`, `mu.location.black-market`, `xx.location.mortal-harvest`, `hu.location.gate-district`, `ac.location.rose-salon`.
- `EventDefinition.locationTags` multiplies selection weight by `1.6` in a matching settlement and `0.55` elsewhere; untagged events keep weight `1`.
- `locationWageFactor` produces one `location` economy line (post-thrift earnings difference); `livingCost` applies `locationCostFactor` once. Tax and the world cycle still run once.

## 3. Files

### New

- `packages/game-core/src/world/location.ts` — location state, validation, travel, view and location helpers.
- `packages/game-core/test/stage02-travel-settlements.test.ts` — 10 tests covering all six universes, guards, economy/events, migration, determinism and strict save validation.
- `packages/game-core/test/fixtures/saves-v11.ts` — schema-11 alive/dead/employed fixtures.
- `apps/api/test/stage02-travel.e2e-spec.ts` — API travel, reuse and parallel replay tests.
- `apps/web/src/components/play/travel-panel.tsx` — current location, modifiers, destinations, history.
- `apps/web/src/components/play/travel-panel.test.tsx` — 3 render tests (RU, pending, EN/no-gold).
- `docs/stage-02/TRAVEL_SETTLEMENTS.md` — focused model document.
- `docs/stage-02/STAGE_02_4_REPORT.md` — this report.

### Modified — core

- `packages/game-core/src/types.ts` — `LocationState`/`LocationMove`, `GameState.location`, `travel` action, `travel` history kind, `location` change kind, `location` economy line.
- `packages/game-core/src/world/state.ts` — metadata for the existing settlement records (`kind`, tags, wage/cost/travel factors), lookup/tag helpers.
- `packages/game-core/src/engine/game.ts` — schema 12, new-life location, action/restore normalization, `travel` dispatch.
- `packages/game-core/src/engine/save.ts` — 11 → 12 migration and strict location validation.
- `packages/game-core/src/economy/economy.ts` — local wage line and local cost-of-living factor.
- `packages/game-core/src/engine/conditions.ts` — location condition and player-facing description.
- `packages/game-core/src/narrative/types.ts`, `dsl.ts`, `selection.ts` — condition variant, helpers, location weight and content validation.
- `packages/game-core/src/errors.ts` — `INSUFFICIENT_WEALTH`.
- `packages/game-core/src/legacy/succession.ts` — heir starts in the predecessor’s valid settlement.
- `packages/game-core/src/life/chronicle.ts` — `travel` chronicle category/importance.
- `packages/game-core/src/index.ts` — public exports.
- `packages/game-core/src/universes/{dark-fantasy,isekai,murim,xianxia,hunter,academy}.ts` — one location-gated event per universe.

### Modified — shared / API / web

- `packages/shared/src/views.ts` — `LifeView.location`.
- `packages/shared/src/schemas.ts` — `travel` zod action.
- `packages/shared/test/schemas.test.ts` — travel schema and view coverage.
- `apps/api/src/common/error-response.ts` — maps `INSUFFICIENT_WEALTH` to 409.
- `apps/api/src/common/error-response.spec.ts` — mapping test.
- `apps/api/src/lives/lives.controller.ts` — action doc comment only.
- `apps/web/src/components/play/play-screen.tsx` — travel action feedback and panel.
- `apps/web/src/components/play/world-panel.tsx` — current location in the dossier.
- `apps/web/src/components/play/timeline.tsx` — travel marker.
- `apps/web/src/components/play/event-card.tsx` — shows the travel text when there is no separate outcome.
- `apps/web/src/lib/format.ts`, `messages.ts` — location change chip and RU/EN strings.

### Modified — tests / fixtures

- Schema expectations moved from 11 to 12 in the existing stage/regression tests.
- Migration-equality tests exclude the additive `location` field where fixtures are historical.
- `fixtures/saves-v9.ts`, `saves-v10.ts` no longer leak the newer field.
- Test descriptions updated where they named the old schema version.

### Explicitly not touched

`apps/api/src/portal/`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `.env.example` were already modified/untracked before this task and were left exactly as found.

## 4. Verification

Run from `G:\III\endemion-life`:

| Command | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **PASS** — 46 files, 662 tests |
| `pnpm test:api` | **PASS** — 13 files, 114 tests |
| `pnpm --filter @endemion/shared test` | **PASS** — 2 files, 16 tests |
| `pnpm --filter @endemion/web test` | **PASS** — 4 files, 15 tests |
| `pnpm --filter @endemion/api test` | **PASS** — 7 files, 74 tests (extra unit run) |
| `pnpm typecheck` | **PASS** — packages, API and web |
| `pnpm lint` | **PASS** — 0 errors; 1 pre-existing warning in untouched `play-screen.tsx` (`react-hooks/exhaustive-deps`) |
| `pnpm --filter @endemion/web build` | **PASS** — Next.js production build |
| `pnpm --filter @endemion/api build` | **PASS** — Nest build (extra check) |

The API e2e log contains intentional injected 500/503 responses from failure-path tests; the summary is 114/114 passed. No test was skipped to obtain these results.

## 5. Acceptance mapping

| Criterion | Evidence |
|---|---|
| One current settlement tied to existing data | `LocationState.settlementId`; catalogue is the existing `settlementSeeds`; no second list |
| Default home on creation/migration | `newLocationState`; `migrateV11`; test v11 fixture |
| Move between two settlements in all six universes | Loop over `UNIVERSE_IDS` in `stage02-travel-settlements.test.ts` |
| Real cost, no negative wealth | Exact cost deduction; insufficient-gold test; existing wealth clamp |
| Invalid states rejected | Unknown/current destination, dead life, pending event tests |
| Location changes an event outcome | Six gated events; eligibility tests in every universe |
| Location changes weight | `eventLocationWeight` > 1 matching, < 1 elsewhere |
| Location changes economy | One `location` line and local living-cost difference in test |
| Travel history and UI feedback | `location.history`, `travel` timeline entry, `location` change chip, travel panel |
| Old schema 11 loads without loss | v11 migration equality test |
| Old schemas 1/2/5/8/9/10/11 | Combined migration test |
| Determinism and idempotency | Same-state/same-action equality; API `actionId` replay + parallel replay |
| API contract | Shared zod travel schema, API e2e success/rejection, `INSUFFICIENT_WEALTH` status |
| Mobile-safe UI | Single-column travel grid, `sm:` two columns, truncated names, 44px button rows |

## 6. Risks and remaining gaps

- **Travel is instant and costs wealth only.** The requirement allowed wealth and/or time; adding a year would interact with pending events and auto-advance, so this slice deliberately avoids it.
- **Cost and local modifiers are first-pass balance values.** The first settlement is neutral to preserve existing balance; the other two per universe demonstrate the difference. A longer economy soak is still worthwhile.
- **Location-gated adventures are not added.** Existing adventure places have no settlement association, so inventing one would create a second, parallel location model. Events and economy are the existing content surfaces used here.
- **Migration assigns the first settlement.** Origins have no settlement mapping, so a deterministic fallback is safer than inventing per-origin homes.
- **Location `since` is informational.** It is not used for eligibility or costs; artificial age rewinds in old tests therefore do not invalidate a save.
- **Concurrency relies on the existing API row lock.** The new parallel-replay e2e covers it, but it is not a database-level uniqueness constraint on location moves.
- **Tags are free-form strings in content.** Content validation rejects unknown tags through `SETTLEMENT_TAG_NAMES`, but the type system cannot fully prevent a future typo until `eventProblems()` runs.

## 7. Review safety

The working tree is safe to review: changes are additive state, a new server action, catalogue metadata, event content, views and test-expectation updates. Nothing was staged, committed, pushed, reset, cleaned or deployed. Production remains on `b634a67` schema 8; local code is schema 12. Do not deploy until the migration is reviewed.
