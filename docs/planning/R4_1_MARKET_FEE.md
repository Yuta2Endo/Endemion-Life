# R4.1 — Market Fee Sink and Dynamic Prices

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** 19, additive

## 1. What was added

- Seller-side market fee: **5%** of each completed player-to-player trade.
- Buyer pays the listed total; seller receives `total - fee`.
- Fee is not credited to anyone — it is a true economic sink.
- `MarketTrade.fee` persists the burned amount for audit and UI.
- Ledger records the seller's net gold and the buyer's full payment.
- Shared-world prices remain dynamic through `sharedGoodPrices`:
  - base price;
  - settlement supply 0–100;
  - buy markup 1.2;
  - sell discount 0.7;
  - prices recalculated on every season tick and stored per settlement.

## 2. Example

Offer: 2 goods × 50 = **100**.

- buyer wealth: −100;
- seller wealth: +95;
- fee burned: **5**.

## 3. Data model

Migration `20261115200000_r4_1_market_fee`:

- `market_trades.fee` integer default 0.

No save schema change.

## 4. Verification

| Check | Result |
|---|---|
| Stage 06 market API e2e | **7/7** |
| Fee value and seller net | PASS |
| Existing buyer payment and ledger count | PASS |
| API typecheck | PASS |

## 5. Limitations

- Fee is fixed at 5%; no world/faction modifier yet.
- Fee is burned, not routed to a city treasury.
- Local single-player market already has a spread sink via 1.25 buy / 0.8 sell.
- Price history is available through season snapshots but not yet a dedicated chart.

## 6. Rollback

Migration 19 is additive. Application rollback is safe; keep the `fee` column.
