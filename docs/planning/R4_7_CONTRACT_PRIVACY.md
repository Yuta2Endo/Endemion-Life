# R4.7 — Private Contracts, Expiry and Escrow Restore Guard

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** 23, additive

## 1. What was added

- Optional `targetPlayerId` on player contracts:
  - private contract visible only to the target player;
  - other players receive `403` on acceptance.
- Contract expiry:
  - 72 hours from creation;
  - expired contracts disappear from the open board;
  - acceptance of expired contract returns `409 OFFER_CLOSED`.
- Escrow restore guard:
  - restoring a seller below the version after contract creation is blocked with `MARKET_RESTORE_BLOCKED`;
  - restoring a buyer below the version after acceptance is blocked;
  - cancellation records the seller’s return version.
- Contract versions now record `sellerVersionAfter` and `buyerVersionAfter`.
- Existing open contracts remain valid; new fields default to 0/null.

## 2. Data model

Migration `20261116000000_r4_7_contract_privacy`:

- `player_contracts.target_player_id`;
- `player_contracts.seller_version_after`;
- `player_contracts.buyer_version_after`;
- `player_contracts.expires_at`;
- index on target player + status.

## 3. Verification

| Check | Result |
|---|---|
| Stage 06 market/contracts API e2e | **8/8** |
| Existing public contract flow | PASS |
| API typecheck | PASS |
| Restore guard query compiles | PASS |

## 4. Limitations

- No auction/bid mechanics yet.
- Expired contracts keep escrowed goods; no automatic return job.
- No UI field for choosing a private recipient yet; API supports it.
- No dedicated contract ledger.
- Restore guard blocks any contract version, including cancelled ones.

## 5. Rollback

Migration 23 is additive. Application rollback is safe; keep the new columns.
