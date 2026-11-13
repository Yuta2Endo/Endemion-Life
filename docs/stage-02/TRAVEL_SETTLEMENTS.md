# Travel & Settlements — Stage 02.4 model

This document describes the implementation in `packages/game-core` and the shared/web views. The report in `STAGE_02_4_REPORT.md` covers scope, tests and risks.

## 1. One current settlement per life

```ts
interface LocationState {
  settlementId: string;   // id from the existing per-universe settlement catalogue
  since: number;          // age when the character moved here
  history: LocationMove[]; // last MAX_LOCATION_HISTORY moves, oldest first
}

interface LocationMove {
  from: string;
  to: string;
  age: number;
  cost: number;
}
```

There is no second settlement catalogue. `world/state.ts` already owned the only one (`settlementSeeds`), used by `world.settlements` and by `lineage.worldInfluence`. Stage 02.4 only adds metadata to those same records:

- `kind` — `capital`, `city`, `frontier`, `market`, `sect`, `fortress` or `academy`;
- `tags` — event/economy taxonomy such as `frontier`, `gate`, `underworld`, `court`, `academy`;
- `wageFactor` and `costFactor` — local economy multipliers;
- `travelCost` — the settlement's component of the road price.

The first settlement of each universe is the default home. It has neutral `wageFactor`/`costFactor` of `1`, so existing saves and balance do not change until the character actually travels. A migration from schema 11 chooses the first settlement already present in `world.settlements`, falling back to the first catalogue entry. A new life and an heir use the same first settlement unless the predecessor already lived somewhere valid.

## 2. Travel action

`GameAction` gains:

```ts
{ type: "travel", settlementId: string }
```

The client only names the destination. The server (`world/location.ts::travel`) validates and applies:

1. the life is alive (`LIFE_ENDED` otherwise, also guarded by `applyAction`);
2. no event is waiting (`EVENT_PENDING`);
3. the destination exists in **this** universe's catalogue (`INVALID_INPUT`);
4. the destination is not the current settlement (`INVALID_INPUT`);
5. `character.wealth >= cost` (`INSUFFICIENT_WEALTH`).

Cost is symmetric and deterministic:

```
cost = max(3, round((from.travelCost + to.travelCost) / 2))
```

The movement spends wealth once through the existing `applyEffect({ type: "wealth" })`, so the `0..WEALTH_MAX` clamp is preserved. It does not advance the age, does not read or advance the main RNG, and records:

- `state.location.history` (the last 24 moves);
- a `travel` history entry in the life timeline;
- a `location` change chip carrying the destination id.

The API already provides idempotency and concurrency control by `actionId` and row locking; no second action system was introduced. Repeating the same `actionId` returns the previous result without charging twice.

## 3. Location effects

### Events

`narrative/types.ts` adds a `location` condition:

```ts
{ type: "location", ids?: string[]; tags?: string[] }
```

`when.location(...tags)` and `when.settlementAt(...ids)` build it. It matches the current settlement against either list. Every universe has one location-gated event:

| Universe | Event | Home tag |
|---|---|---|
| dark-fantasy | `df.location.mist-road` | `frontier` |
| isekai | `is.location.frontier-survey` | `frontier` |
| murim | `mu.location.black-market` | `underworld` |
| xianxia | `xx.location.mortal-harvest` | `mortal` |
| hunter | `hu.location.gate-district` | `gate` |
| academy | `ac.location.rose-salon` | `social` |

`EventDefinition.locationTags` also changes selection weight without hard-gating an event: matching settlement tags multiply the weight by `1.6`, non-matching by `0.55`. Events without the field keep weight `1` and behave exactly as before. Content validation in `narrative/selection.ts` rejects unknown settlement ids or tags.

### Economy

The existing annual economy is the only place the local modifier is applied:

- `locationWageFactor(state)` produces one `location` line in `yearLines()` — the difference between the local wage factor and `1`, applied to post-thrift earnings once;
- `livingCost(state)` multiplies the existing cost-of-living formula by `locationCostFactor(state)` once;
- tax and the economy cycle still run once over the resulting income.

The new line is additive to `ECONOMY_LINES`; old saves and old `economy.last` rows remain valid. At the default settlement both factors are `1`, so no line appears and previous balance tests are unchanged.

## 4. Save compatibility

- `SAVE_SCHEMA_VERSION` is **12**.
- Migration `11 → 12` only adds `location`; `seed`, `rngState`, `world`, `household`, `business`, career, education and every other field are copied unchanged.
- `parseSave` strictly validates the current settlement id against the universe catalogue and every history move's ids, age and cost.
- Schema 1/2/5/8/9/10/11 fixtures still migrate; the focused test covers all of them.
- The API import path uses `SAVE_SCHEMA_VERSION` and therefore accepts schema 11 while rejecting anything newer.

## 5. Presentation

`presentLocation(state)` returns the current settlement name/kind/tags, local wage and cost percentages, the last moves and all destinations with server-computed price and affordability.

- `LifeView.location` exposes this to the portal and local browser mode.
- The play screen renders a compact `TravelPanel` under the yearly actions; it is disabled while busy, dead or waiting for an event, and destination buttons show the price or “not enough”.
- The dossier's Living world tab shows the current settlement and its modifiers.
- The timeline recognises the `travel` history kind and the `travel` chronicle category.
- All strings are RU/EN and the layout uses a single-column mobile grid that becomes two columns on `sm`.

## 6. Deliberate non-goals

- **No time cost.** Travel is instant and costs wealth only. This keeps the action usable between yearly events and avoids inventing an extra year tick.
- **No parallel settlement list.** A location is only an id plus mutable state.
- **No retroactive relocation or charge on migration.** Schema-11 lives get their first settlement with `since = age` and no history.
- **No new adventure gate.** Existing adventure places have no settlement association, so none was invented; location affects events and the economy, which is what the existing content supports.
