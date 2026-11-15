# R4.2 — Price History and Event Influence

**Status:** COMPLETE AND DEPLOYED (2026-11-15 10:30 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

- `GET /api/world/:universeId/prices?seasons=1..24`
  - current season average buy/sell/supply per good;
  - previous-season comparison and percentage change;
  - up to 24 season snapshots of average prices;
  - recent price-moving events: trade, crisis, unrest, festival.
- Web `WorldPricePanel` under the shared world view:
  - average buy/sell/supply table;
  - up/down change indicator;
  - recent event influence feed;
  - data test ID `world-prices`.

Prices are averaged across settlements for readability; per-settlement prices remain in the existing settlement cards.

## 2. Verification

| Check | Result |
|---|---|
| Shared-world API e2e | **8/8** |
| Price endpoint assertions | PASS |
| `seasons=0` validation | 400 |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS |

## 3. Limitations

- Price history is derived from season snapshots, not a dedicated series table.
- Event influence is explanatory; prices are still computed from base/supply and do not yet apply event modifiers.
- Average prices hide settlement-specific differences; per-settlement data remains available.
- No historical chart component, only a table and comparison.

## 4. Deployment

- Code commit `e1d8142`, accessibility fix `6b2aacd`; production runtime **`6b2aacd`**.
- Deploy run **43703492460**, success; history `10:29:48Z deploy-start` → `10:30:18Z deploy ok`.
- No migration; DB remains **19** migrations, save schema 14.
- Production `/api/world/dark-fantasy/prices?seasons=3` returns **season 10, 3 goods, 3 history points**; health 200.
- Rollback target `c834a72`.

## 5. Rollback

No migration. Reverting the application code removes the prices endpoint and panel.
