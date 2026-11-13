# Property, Household & Business — Stage 02.3 model

This document describes the implementation in `packages/game-core` and the shared/web views. It is intentionally focused: the report in `STAGE_02_3_REPORT.md` covers scope, tests and risks.

## 1. One household state

```ts
interface HouseholdState {
  residence: "homeless" | "rent" | "own";
  homeId: string | null;   // catalogue id of the one home, null when homeless
  since: number;           // age when the current arrangement began
  condition: number;       // 0..100, meaningful only for an owned home
  arrears: number;         // consecutive years with a shortfall, capped at 2
}
```

There is no second list of “properties”: the current life has one home. This keeps residence, quality, capacity, costs and condition in one place. A house is defined by the world catalogue (`life/household.ts`, two homes per universe); the save stores only the id plus mutable condition/arrears. Quality, capacity, rent, upkeep and property tax are derived from the catalogue.

`householdMembers()` is derived from existing `state.npcs` and never invents people:

- spouse (alive, not missing);
- minor children (under 18) as dependents;
- for a minor character: parents and siblings.

`householdSize` includes the character; `crowded` is true when the derived size exceeds the home capacity. A family that grows after moving in therefore becomes visibly crowded without rewriting the residence state.

### Annual costs and loss

- Rented home: one `rent` economy line.
- Owned home: one `upkeep` line (scales up as condition falls) and one `propertyTax` line.
- Owned homes lose `PROPERTY_DECAY = 2` condition per year.
- A repair event restores `+35` condition for `max(3, round(price * 0.12))` gold.
- `arrears` increments once per year in which the total economy year has a shortfall. At `MAX_ARREARS = 2` the home is lost: an owned home is repossessed, a rented one is evicted. A home whose condition reaches 0 is also lost (uninhabitable).
- Loss is a history change (`property: lost` / `housing: evicted`), so it appears in the year entry without a separate action type.

## 2. Business

```ts
interface BusinessVenture {
  id: string;              // catalogue id
  foundedAge: number;
  level: number;           // 0..2
  capital: number;         // working capital of the venture, 0..WEALTH_MAX
  years: number;
  losses: number;          // consecutive loss years
  lastNet: number | null;  // last completed year
}

interface BusinessState {
  ventures: BusinessVenture[]; // at most MAX_BUSINESSES = 2
}
```

`capital` is not a second currency. It is not spendable on living costs and never appears in player wealth; only the annual economy lines and one-time purchases/sales touch `character.wealth`. Selling a venture converts part of its capital back into gold.

Each world has two definitions (a small stall and a larger workshop/shop). A definition provides startup cost, initial capital, base revenue, base costs, the skill that improves revenue, bad-year risk and the maximum growth level. The opportunity event offers the definitions that are affordable and not already active. Up to two ventures can be held.

### Annual result

For each venture:

```
revenue = round((baseRevenue * levelRevenueFactor + min(6, floor(skill / 15))) * badYearFactor)
costs   = round(baseCosts * levelCostsFactor)
net     = revenue - costs
```

A bad year is a deterministic per-venture hash roll (`seed`, `rngState`, age, venture id); it is not taken from the main life RNG, so it does not shift later life outcomes. Revenue enters the economy as the `business` line and costs as `businessCosts`; both are included in the same annual net application.

`capital += net`. A negative year increments `losses`; a positive year resets them. Growth is deliberately simple: every `BUSINESS_GROWTH_YEARS = 3` profitable years without a loss, the venture rises one level. A venture closes when capital reaches 0, or when the character has three years of general hardship and the venture has at least one loss year. Voluntary sale returns `round(capital * 0.5 + cost * 0.1)`; voluntary closure returns nothing.

## 3. Economy integration

New economy lines:

| Line | Sign | When |
|---|---|---|
| `rent` | expense | rented home |
| `upkeep` | expense | owned home, condition-scaled |
| `propertyTax` | expense | owned home |
| `business` | income | sum of active venture revenue |
| `businessCosts` | expense | sum of active venture operating costs |

All lines are calculated once in `yearLines()` and applied once by `economyYear()` through `applyEffect({ type: "wealth", delta: net })`, which clamps to `0..WEALTH_MAX`. Buying, selling, repairing and investing are one-time `wealth` effects; they are not repeated in the annual lines. Career wages remain the `wage` line; the legacy profession line stays suppressed whenever a career track exists, so a job is never counted twice. Business revenue is an independent source, not a second profession line.

## 4. Events and content

`narrative/estate-events.ts` builds per-universe events from the property and business catalogues:

- `home.choice.<universe>` — rent or buy one of the two homes, or stay with kin;
- `property.maintenance.<universe>.<home>` — repair, sell or defer;
- `property.sale.<universe>.<home>` — sell under hardship or hold;
- `business.opportunity.<universe>` — start one of the two ventures or decline;
- `business.trouble.<universe>.<venture>` — invest, sell, close or hold after a loss.

All use the existing event/choice mechanism; no `GameAction` was added. Conditions and effects are described in `narrative/types.ts`; content validation in `narrative/selection.ts` checks every referenced home and venture id.

## 5. Save, migration and bounds

- Schema **10 → 11** adds `household` and `business`; `seed`, `rngState`, education/career and every existing field are preserved.
- Migrated lives start with no separate home and no ventures. No home, rent, family member or business is invented retroactively.
- `normalizeHouseholdState` / `normalizeBusinessState` guard action and restore boundaries.
- `parseSave` rejects unknown homes/ventures, duplicate ventures, impossible residence combinations, condition outside 0–100, arrears above 2, more than 2 ventures, level above the definition, capital outside `0..WEALTH_MAX`, impossible age/years and non-integer money.
- `prepareImport` clamps forged venture capital by the same age-based wealth cap as player gold.
- Bounds: one home, two ventures, condition 0–100, arrears 0–2, level 0–2, capital 0–`WEALTH_MAX`, `years <= age - foundedAge`.
