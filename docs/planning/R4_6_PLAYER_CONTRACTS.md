# R4.6 — Player Contracts with Escrow

**Status:** COMPLETE AND DEPLOYED (2026-11-15 12:39 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** 22, additive

## 1. What was added

- Escrowed player-to-player goods contracts.
- `GET /api/contracts?universeId=...` — open contracts + own.
- `POST /api/contracts` — seller lists goods; goods are removed from the seller life immediately.
- `POST /api/contracts/:id/accept` — buyer pays gold, receives escrowed goods; seller receives net after 5% market fee.
- `DELETE /api/contracts/:id` — seller cancels and goods return to the seller life if alive and stock permits.
- Contract is atomic; both life versions, histories and snapshots are written.
- Seller family reputation +1 when a contract is accepted.
- Web `PlayerContractsPanel` inside the economy tab:
  - create contract;
  - browse open contracts;
  - accept/cancel;
  - `data-testid="player-contracts"`.

## 2. Data model

Migration `20261115230000_r4_6_player_contracts`:

- `player_contracts` with seller/buyer player and life, universe, good, qty, price, status, action IDs, timestamps;
- unique `(seller_life_id, action_id)`;
- unique `(buyer_life_id, accept_action_id)`;
- status `open/accepted/cancelled`, qty 1..5, price > 0;
- FKs to players, lives and world.
- Escrow is represented by removing goods from the seller life at listing time.

## 3. Verification

| Check | Result |
|---|---|
| Stage 06 market/contracts API e2e | **8/8** |
| Create escrow + accept + payment + cancel return | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS |

## 4. Limitations

- No expiry; open contracts stay until accepted or cancelled.
- Seller must be alive to cancel and receive goods back.
- If seller life dies, escrow remains in the contract and cannot be returned.
- No targeted private contracts; all open contracts are public.
- No dedicated contract ledger beyond life history and family reputation.
- No restore guard specifically for escrow yet.

## 5. Deployment

- Code commit `c5d1db4`, list-relation fix `4f1d67d`; production runtime **`4f1d67d`**.
- Deploy run **43714628172**, success; history `12:39:11Z deploy-start` → `12:39:41Z deploy ok`.
- Production has **22 migrations**, `player_contracts` table exists.
- `/api/health` 200; `/api/contracts?universeId=hunter` returns 200 with an empty board.
- Rollback target `cd9835b`; migration 22 is additive.

## 6. Rollback

Migration 22 is additive. Application rollback is safe; keep `player_contracts`.
