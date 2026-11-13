# STAGE 02.3 — Property, Household & Business — Implementation Report

**Status:** COMPLETE in the working tree
**Date:** 2026-11-13
**Scope:** third slice of STAGE 02 — housing, one owned home, household composition, sole proprietorships, annual economy integration and world-appropriate events.
**Production:** not changed. No commit, push, deploy, reset, clean or production command was run. Production remains `b634a67`, schema 8.

## 1. Outcome

- **Housing** is one coherent state: `homeless`, `rent` or `own`, with one catalogue home, condition, arrears and move-in age. Quality, capacity, rent, upkeep and property tax are derived from two world-specific homes per universe.
- **Household members** are derived from existing NPCs: spouse, minor children, and for a minor character parents/siblings. No family member is invented or stored twice.
- **Property** can be bought and sold, pays annual upkeep and property tax, decays, is repaired, and is lost after two consecutive years of shortfall or when its condition reaches zero.
- **Business** supports up to two sole proprietorships per life. Each has a startup cost, working capital, annual revenue and operating costs, deterministic bad years, simple three-profitable-year growth, voluntary sale/closure and forced closure on capital exhaustion or bankruptcy.
- **Economy:** five new lines — `rent`, `upkeep`, `propertyTax`, `business`, `businessCosts`. They are calculated once in `yearLines()` and applied once by `economyYear()` through the existing wealth clamp. Career wages and the legacy profession line remain mutually exclusive.
- **Events:** rent/buy, maintenance crisis, property sale, business opportunity and business loss/closure. All are ordinary event/choice content; no new `GameAction` type was added. Content exists for all six universes.
- **UI:** compact “House and business” panel in the dossier’s Finances tab, plus a one-line housing/business summary in the character sheet. RU/EN strings and component render tests.
- **Save:** schema **11**, additive 10→11 migration, preserving seed, rngState, education, career and all existing data.

## 2. Design summary

### State

```ts
interface HouseholdState {
  residence: "homeless" | "rent" | "own";
  homeId: string | null;
  since: number;
  condition: number; // 0..100, owned home only
  arrears: number;   // 0..2
}

interface BusinessState {
  ventures: BusinessVenture[]; // at most 2
}
```

The detailed model, catalogues and formulas are in `PROPERTY_HOUSEHOLD_BUSINESS.md`.

### Housing and property

- Two homes per universe (modest and spacious) with purchase price, annual rent, upkeep, property tax, quality and capacity.
- Rent: one `rent` line. Own: `upkeep` (scaled by condition) plus `propertyTax`.
- Owned condition decays by 2/year. Repair event restores 35 for `max(3, round(price * 0.12))`.
- `arrears` increments when the annual economy result has a shortfall. At 2 the home is repossessed/evicted. Condition 0 also forces loss.
- Sale returns `round(price * (0.55 + condition / 400))`, always below an immediate purchase price.

### Business

- Two definitions per universe, each with cost, initial capital, base revenue/costs, skill, bad-year risk and max level 2.
- Revenue and costs are separate annual economy lines; capital is internal working capital, not a second currency.
- Bad years use a separate deterministic hash stream; the main life RNG is not shifted.
- Growth: one level every three profitable years without a loss (max 2).
- Failure: capital reaches 0, or three years of general hardship with at least one loss year. Sale returns half the capital plus a small share of the invested cost; closure returns nothing.
- Imported saves have venture capital clamped by the same age-based wealth cap as player gold.

## 3. Files

### New

- `packages/game-core/src/life/household.ts` — residence state, two-home catalogue for six worlds, costs, repair/sale, derived members, yearly settlement, view.
- `packages/game-core/src/life/business.ts` — two-venture catalogue for six worlds, capital/revenue/cost calculations, bad years, growth, failure, sale/close, yearly settlement, view.
- `packages/game-core/src/narrative/estate-events.ts` — per-universe rent/buy, maintenance, sale, opportunity and trouble events.
- `packages/game-core/test/stage02-household-business.test.ts` — 17 tests.
- `packages/game-core/test/fixtures/saves-v10.ts` — schema-10 alive/dead/employed fixtures.
- `apps/web/src/components/play/estate-panel.tsx` — compact household/property/business panel.
- `apps/web/src/components/play/estate-panel.test.tsx` — 3 render tests (empty, owned/business, EN).
- `docs/stage-02/PROPERTY_HOUSEHOLD_BUSINESS.md` — focused model document.
- `docs/stage-02/STAGE_02_3_REPORT.md` — this report.

### Modified — core

- `packages/game-core/src/types.ts` — `HouseholdState`, `BusinessState`, `BusinessVenture`, residence kinds, `GameState.household/business`, new change kinds and economy lines.
- `packages/game-core/src/engine/game.ts` — schema 11, new-life state, action/restore normalization.
- `packages/game-core/src/engine/save.ts` — 10→11 migration and strict household/business validation.
- `packages/game-core/src/engine/effects.ts` — rent/buy/sell/repair/neglect home and start/invest/sell/close business effects, all using the existing wealth clamp.
- `packages/game-core/src/engine/conditions.ts` — housing/home/property-condition/business/count/loss conditions and descriptions.
- `packages/game-core/src/engine/import.ts` — venture capital import cap.
- `packages/game-core/src/economy/economy.ts` — five lines, business revenue in gross income, household/business yearly settlement, line names.
- `packages/game-core/src/narrative/types.ts` — new condition/effect unions.
- `packages/game-core/src/narrative/dsl.ts` — `fx.rentHome/buyProperty/sellProperty/repairProperty/neglectHome/startBusiness/investBusiness/sellBusiness/closeBusiness`; `when.housing/home/propertyCondition/business/businessCount/businessLosses`.
- `packages/game-core/src/narrative/selection.ts` — content validation for home and business references.
- `packages/game-core/src/legacy/succession.ts` — heir starts with an empty household/business state.
- `packages/game-core/src/universes/registry.ts` — appends generated estate events.
- `packages/game-core/src/index.ts` — public exports.

### Modified — shared / web

- `packages/shared/src/views.ts` — `LifeView.household` and `LifeView.business`.
- `packages/shared/test/schemas.test.ts` — view coverage for owned home and venture.
- `apps/web/src/components/play/economy-panel.tsx` — renders the estate panel.
- `apps/web/src/components/play/character-sheet.tsx` — one-line housing/business summary.
- `apps/web/src/lib/format.ts` — history-change labels for housing/property/business.
- `apps/web/src/lib/messages.ts` — RU/EN estate and change strings.

### Modified — tests / fixtures

- `stage02-education-career`, `stage04-3-relics`, `stage04-5-2`, `stage04-5-3`, `stage04-5-4`, `stage04-5-world-narrative`, `stage04-dynasty`, `stage04-economy`, `stage04-market`, `stage05-adventure`, `stage06-balance`, `stage06-region`, `stage07-dynasty`, `stage08-dynasty`, `stage09-world`, `stage10-mastery`, `stage10-world-integration` — schema expectations moved to 11; migration-equality tests exclude the two additive fields.
- `fixtures/saves-v8.ts`, `fixtures/saves-v9.ts` — historical fixtures no longer leak newer household/business fields.
- `stage04-5-3-generational-memory.ts` — artificial age rewind also clamps service dates.

### Explicitly not touched

`apps/api/src/portal/`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `.env.example`. These were already modified/untracked before this task and were left exactly as found.

## 4. Verification

Run from `G:\III\endemion-life`:

| Command | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **PASS** — 45 files, 652 tests |
| `pnpm test:api` | **PASS** — 12 files, 111 tests |
| `pnpm --filter @endemion/shared test` | **PASS** — 2 files, 15 tests |
| `pnpm --filter @endemion/web test` | **PASS** — 3 files, 12 tests |
| `pnpm typecheck` | **PASS** — packages, API and web |
| `pnpm lint` | **PASS** — 0 errors; 1 pre-existing warning in untouched `play-screen.tsx` (`react-hooks/exhaustive-deps`) |
| `pnpm --filter @endemion/web build` | **PASS** — Next.js production build |

The API e2e log contains intentional injected 500/503 responses from failure-path tests; the summary is 111/111 passed.

## 5. Acceptance mapping

| Criterion | Evidence |
|---|---|
| Rent/buy housing | `home.choice.*` event; rent and buy tests; wealth price deducted once |
| Pay upkeep/property tax | `yearLines` rent/upkeep/propertyTax tests; annual net equals applied wealth |
| Start/acquire business | `business.opportunity.*`; startup cost and capital tests; up to two ventures |
| Business earns or loses | Revenue/cost lines, bad-year capital loss, growth test, profit-line tests |
| Forced loss/failure | Two-year arrears repossession test; unrecoverable condition; capital/hardship closure test |
| Household consistent with kin | Derived from live NPCs only; spouse/child/parents test; no invented members |
| Costs/incomes once and visible | Per-line count tests, `economy.last` net comparison, estate panel and economy table |
| No double income | Career `wage` plus business; legacy `profession` absent; exactly one `business` line |
| Wealth clamp | Every transaction uses `applyEffect({ type: "wealth" })`; soak checks `0..WEALTH_MAX` |
| Old saves 1/2/5/8/9/10 | v10 fixture plus v1/v2/v5/v8/v9 migration test |
| Determinism | Same seed/action test compares household, business, wealth and `rngState` |
| Events all six worlds | `eventProblems()` empty; home/maintenance/sale/opportunity/trouble events found per universe |
| Strict save validation | Invalid home/rent/own/arrears/venture cases rejected by `parseSave` |

## 6. Risks and remaining gaps

- **Arrears are global, not housing-only.** Any annual shortfall (including tuition) counts as unpaid housing. This is intentionally simple; a future refinement can separate arrears by bill.
- **Balance:** home prices, rents, startup costs and business margins are first-pass values. Automated soak tests enforce bounds and invariants, not a target standard of living. A longer manual economy soak is still worthwhile.
- **Growth is deterministic by tenure**, not random. This keeps tests and replay stable and satisfies “simple growth”; it is less varied than a skill-weighted growth roll.
- **One home per life.** The scope required at least one meaningful property type per world, not a property portfolio. Land/workshop investment property can be added later without changing the annual line contract.
- **No generational transfer of the house or ventures.** An heir starts with an empty household/business state; existing inheritance gold, relics and laws are unchanged. This avoids inventing a second inheritance path in this slice.
- **Migrated lives start without housing.** A schema-10 adult is treated as having no separate home rather than being retroactively charged rent or given a house. This preserves data and avoids surprise costs.
- **Business capital is internal bookkeeping.** It is capped and clamped, but it is not a spendable currency and never bypasses the player wealth clamp.

## 7. Review safety

The working tree is safe to review: changes are additive state, new content/catalogues, views and test-expectation updates. Nothing was staged, committed, pushed, reset, cleaned or deployed. Production remains on `b634a67` schema 8; local code is schema 11. Do not deploy until the migration is reviewed.
