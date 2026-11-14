# Stage 06.2 — Player Market

**Status:** deployed to production 2026-11-14 15:14 UTC.
**Save schema:** 14 (unchanged). The market is server-owned data and is not part of `GameState`.
**Database migration:** 14 (`20261114150000_stage06_player_market`), additive.
**Production:** `0661018`, save schema 14, 14 applied migrations.

## Scope

The first player-to-player economy slice lets an account list one of the three world goods carried by a living character and lets another account buy it with character gold. It adds no new gameplay in `packages/game-core`; the deterministic engine remains free of database and network access.

Implemented:

- public market board per universe;
- account-only offer creation, purchase, and cancellation;
- atomic settlement of goods and gold between two characters;
- an append-only market ledger;
- market history entries and snapshots for both characters;
- restore protection across completed trades;
- cancellation of a dead character's active offers during succession.

Not implemented in this slice: escrow, auctions, bundles, notifications, market search/filtering beyond universe, guild treasuries, taxation, or administration tools.

## Data model

### `market_offers`

A listing is an ask, not an escrow. The seller keeps the goods until a buyer completes a purchase.

| Field | Meaning |
|---|---|
| `sellerPlayerId`, `sellerLifeId` | owner and character |
| `universeId`, `goodId` | world and good identity |
| `qty`, `unitPrice` | 1–5 units, positive integer price |
| `status` | `active`, `sold`, `cancelled`, `expired` |
| `actionId` | client idempotency key, unique per seller life |
| `sellerVersion` | character version at listing time |
| `expiresAt` | 72 hours after creation |
| `soldAt` | completion timestamp |

### `market_trades`

One completed purchase. `offerId` is unique, so an offer can settle at most once. `sellerVersionAfter` and `buyerVersionAfter` record the character versions produced by settlement and are used by the restore guard.

### `market_ledger`

Append-only records for each side and asset: gold and goods, with the signed amount and balance after settlement. A unique key per trade, player, and kind prevents duplicate ledger rows.

All three tables use cascade deletes for player and life references, except the trade-to-offer reference, which is `RESTRICT`. Offers and trades are additive database objects; no existing table is altered destructively.

## API

| Method | Route | Access | Behaviour |
|---|---|---|---|
| GET | `/api/market?universeId=` | public; optional session | Active offers for the universe, newest first, plus the caller's recent offers |
| POST | `/api/market/offers` | account | Create an ask from a living, adult character |
| POST | `/api/market/offers/:offerId/buy` | account | Buy an active offer for a living, adult character |
| DELETE | `/api/market/offers/:offerId` | account | Cancel the caller's own active offer |

All mutations require `actionId` and the expected character version. Request bodies are strict Zod objects. Guest sessions receive `403 ACCOUNT_REQUIRED`; public reads remain available without an account.

### Settlement

A purchase runs in one PostgreSQL transaction:

1. lock the offer by id;
2. reject missing, inactive, expired, self-owned, or cross-universe offers;
3. lock the buyer and seller characters in deterministic id order;
4. re-read both saves and verify the seller still has the quantity and the buyer has enough gold and stock capacity;
5. transfer goods and gold;
6. increment both character versions;
7. write `market` history entries and snapshots for both characters;
8. insert the trade and four ledger rows;
9. mark the offer sold.

The offer lock makes settlement single-winner. Idempotent replay is keyed by `(buyerLifeId, buyerActionId)`. A failed validation or database error rolls back the entire transaction: neither character changes and no trade or ledger row exists.

### Restore and succession

- Restoring a character to a version older than a completed trade that involved it returns `409 MARKET_RESTORE_BLOCKED`. This prevents duplicating goods, gold, or sales across a restore.
- Succession cancels the dead character's active offers inside the succession transaction. There is no escrow to refund because goods stay with the seller until settlement.

## Web

`PlayerMarketPanel` is rendered in the economy tab below the existing local market. It:

- reads `/api/auth/me` and the public board;
- shows the caller's account state and offers;
- lets an account choose a good, quantity, and unit price, then list it;
- lets another account buy or cancel;
- reports localized errors for insufficient goods, insufficient gold, closed offers, self-trade, full stock, minor characters, stale versions, and guest access;
- refreshes the character view after a successful purchase.

The panel is responsive and uses the existing Living Chronicle surfaces. There is no dedicated market route; the economy tab is the entry point.

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @endemion/api typecheck` | pass |
| `pnpm --filter @endemion/web typecheck` | pass |
| `pnpm --filter @endemion/api test` | 74 unit tests pass |
| `pnpm test:api` | 148 tests across 18 files pass |
| `pnpm --filter @endemion/game-core test` | 775 tests pass |
| `pnpm --filter @endemion/shared test` | 18 tests pass |
| `pnpm --filter @endemion/web test` | 28 tests pass |
| `pnpm --filter @endemion/web build` | pass, 12 routes |
| `pnpm lint` | 0 errors, one pre-existing `play-screen.tsx` warning |

The new `stage06-market.e2e-spec.ts` covers guest access, a public board, an atomic buy with both characters and the ledger, idempotent replay, self-buy and insufficient goods, restore blocking, succession cancelling offers, and cancellation ownership.

## Known limitations

- Listing does not reserve goods. A buyer can fail if the seller traded the stock locally or through another sale first; the error is explicit and the transaction is unchanged.
- Expiry is applied lazily when the board is read or an offer is touched. There is no background worker.
- Active offers are capped at eight per character and quantity at five per offer.
- No notification or live update for a new listing or a sale.
- No web E2E test specifically drives the market panel; API E2E covers the settlement rules.
- The buyer and seller characters must both be alive and adult; the seller's account is not otherwise checked at purchase time.
- The public board returns at most 50 active offers per universe and performs lazy expiry; there is no pagination yet.

## Production deployment

- Code and migration: `0661018b9d6513643180cc0df687bd03f4e21c9b`.
- Previous production release: `db44e82`.
- Deploy workflow run: `43608818425`, manual dispatch with `allow_migrations=true`; both jobs succeeded.
- Deploy history: `2026-11-14T15:14:04Z deploy-start 0661018 from db44e82` → `2026-11-14T15:14:33Z deploy 0661018 ok from db44e82`.
- PostgreSQL: 14 applied migrations; `market_offers`, `market_trades`, and `market_ledger` exist.
- Public `GET /api/market?universeId=hunter` returns 200; unauthenticated `POST /api/market/offers` returns 401; `/api/health` reports database and Redis up.
- Pre-deploy backup `endemion_life-manual-20261114T151034Z.dump` (12 MB) passed checksum, table-of-contents, and full trial restore, and was uploaded externally.

## Rollback

The migration is additive. Rolling back to `db44e82` before any market data exists leaves three unused tables. After trades exist, rolling back removes the API surface and web panel; trade and ledger rows remain as an audit record. Rolling back the database migration itself would destroy that record and is not part of the release plan.
