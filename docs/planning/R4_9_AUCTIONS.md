# R4.9 — Contract Auctions

**Status:** COMPLETE AND DEPLOYED (2026-11-15 13:55 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** 25, additive

## 1. What was added

- Auction contracts as a second contract kind alongside fixed-price contracts.
- Seller escrows goods at creation.
- `POST /api/contracts/:id/bid` — place a bid with a bidder life.
- `POST /api/contracts/:id/settle` — settle after `auctionEndsAt`.
- Bid validation:
  - auction kind;
  - not seller;
  - adult living life in the same universe;
  - enough wealth at bid time;
  - bid ≥ starting bid and above current bid.
- Settlement:
  - winning bidder pays current bid;
  - receives escrowed goods;
  - seller receives bid minus 5% market fee;
  - both life versions, histories and snapshots are written;
  - contract becomes `accepted`.
- No bids after expiry returns goods to the seller life if alive and stock permits; auction becomes `expired`.
- Fixed-price contracts keep the existing 72-hour lazy expiry; auctions are excluded from that sweep.
- Existing API still supports private recipient and restore guard.

## 2. Data model

Migration `20261116020000_r4_9_auctions`:

- `kind` (`fixed`/`auction`);
- `min_bid`, `current_bid`;
- `current_bidder_player_id`, `current_bidder_life_id`;
- `auction_ends_at`.

## 3. Verification

| Check | Result |
|---|---|
| Stage 06 contracts API e2e | **8/8** |
| Auction create, bid, settle, buyer payment | PASS |
| Existing fixed contract flow | PASS |
| API typecheck | PASS |

## 4. Limitations

- No UI toggle/bid form yet; API only.
- No outbid notifications.
- No automatic settlement worker; settlement is manual after end time.
- No minimum bid increment.
- Bids do not reserve gold; settlement re-checks funds.
- No bid history table; only the current highest bid is stored.

## 5. Deployment

- Code commit `f74de0c`; production runtime **`f74de0c`**.
- Deploy run **43720614457**, success; history `13:54:59Z deploy-start` → `13:55:35Z deploy ok`.
- Production now has **25 migrations**; save schema 14.
- `/api/health` 200; `/api/contracts?universeId=hunter` 200.
- Rollback target `185b659`; migration 25 is additive.

## 6. Rollback

Migration 25 is additive. Application rollback is safe; keep auction columns.
