# R4.10 — Auction UI, Automatic Settlement, Safer Stock Writes

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none (R4.9 columns reused)

## 1. What was added

### Auction UI

`apps/web/src/components/play/player-contracts-panel.tsx` now supports both contract kinds.

- Creation:
  - type selector: fixed price / auction;
  - fixed price keeps the existing price field;
  - auction uses the price field as the starting bid and adds a duration in hours (1–168, default 24);
  - the request sends `kind: "auction"`, `minBid`, and `auctionHours`.
- Board:
  - auctions show the starting bid, the current bid (or “no bids”), and the end time;
  - non-owners can enter a bid and submit it;
  - the bid input starts at `minBid` for a lot without bids and at `currentBid + 1` afterwards;
  - owners see “bids placed” instead of a cancel button once the first bid exists;
  - owners see a settle button for an ended auction that is still on the board.
- Fixed-price contracts keep the existing accept/cancel controls.

### Automatic settlement

- Opening the contract board now settles ended auctions before listing the board.
- At most 20 ended auctions are processed per board read.
- Settlement failures are swallowed and retried on the next board read, so a winner without enough gold does not block the board.

### Auction cancellation guard

- The API rejects cancelling an auction that already has a bid.
- The UI hides the cancel button in the same state.

### Stock write fix

Listing or delivering goods used to write a zero quantity into `economy.goods`, which fails save validation (`INVALID_SAVE`). The key is now deleted when the remaining quantity reaches zero in:

- player market listing;
- player contract listing;
- world order delivery.

Production and local databases currently contain **0** saved lives with zero-valued goods, so no data migration was needed.

## 2. Verification

| Check | Result |
|---|---|
| Stage 06 contracts/market API e2e | **8/8** |
| Auction bid, settlement, buyer payment | PASS |
| Automatic settlement on board read | PASS |
| Cancel auction with bids rejected | PASS |
| Full-stock listing keeps a valid save | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS |

## 3. Limitations

- No separate notification transport. Participants learn about results from the contract board and life history entries.
- No “outbid” history entry for the previous highest bidder.
- Bid history is not stored; only the highest bid is kept.
- Bids do not reserve gold; the winner is charged at settlement.
- Settlement is lazy, not a background worker.
- A permanently failing settlement stays open and hidden from the board while it keeps retrying.
- No minimum bid increment beyond “one gold above the current bid”.

## 4. Rollback

No migration. Reverting the application commit is sufficient; the database keeps the R4.9 auction columns.
