# R4.8 — Contract Expiry and Escrow Return

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** 24, additive

## 1. What was added

- Expired open contracts are now swept lazily when the contract board is opened.
- The seller's escrowed goods are returned to the seller life when:
  - the life is alive;
  - adding the goods stays within `MAX_STOCK`.
- Life version, history and snapshot are updated on return.
- Contract status becomes `expired`.
- If the seller is dead or the stock is full, the contract is marked expired and the goods are not returned.
- `player_contracts.status` check now allows `expired`.

## 2. Verification

| Check | Result |
|---|---|
| Stage 06 contracts API e2e | **8/8** |
| Expired contract hidden from board | PASS |
| Escrow returned to seller | PASS |
| Status set to expired | PASS |
| API typecheck | PASS |

## 3. Limitations

- Sweep is lazy (on contract board read), not a background worker.
- At most 20 expired contracts are processed per board read.
- Dead seller or full stock loses the escrowed goods; no compensation.
- No notification to seller.
- Auctions and bids remain out of scope.

## 4. Rollback

Migration 24 only widens a check constraint. Application rollback is safe.
