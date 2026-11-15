# R4.3 — Event-Driven World Prices

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

World events now directly move the prices of the affected settlement for one season.

- `SHARED_EVENT_PRICE_INFLUENCE` in `packages/game-core/src/world/shared.ts`:
  - trade: buy ×0.95, sell ×1.05;
  - politics: buy ×1.05, sell ×0.95;
  - crisis: buy ×1.30, sell ×1.15;
  - discovery: buy ×0.92, sell ×1.08;
  - festival: buy ×0.90, sell ×1.10;
  - unrest: buy ×1.18, sell ×1.08;
  - admin: neutral.
- `applyEventPriceInfluence(state, event)`:
  - targets the event settlement when present;
  - otherwise applies to all settlements;
  - clamps `buy ≥ 1`, `sell ≥ 0`;
  - enforces `buy > sell`.
- Tick applies influence after the event is selected and pushed.
- Because the influence is part of canonical shared-world state, it is included in checksums and season snapshots.
- Next tick recalculates prices from supply, so the event pressure lasts one season.

## 2. Verification

| Check | Result |
|---|---|
| Game-core shared-world tests | **9/9** |
| Crisis event changes target prices | PASS |
| `buy > sell` invariant | PASS |
| Game-core typecheck/build | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |

## 3. Limitations

- Influence is a flat multiplier by event kind, not severity-scaled.
- Only one event per tick; no stacking.
- Price pressure affects all goods in the target settlement equally.
- UI already shows event and price history; no dedicated “event pressure” badge yet.

## 4. Rollback

No migration. Reverting the application code removes event influence; existing season snapshots retain their historical prices.
