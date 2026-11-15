# R4.11 — In-App Player Notifications

**Status:** COMPLETE AND DEPLOYED (2026-11-15 15:43 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** 26, additive

## 1. What was added

### Durable notifications

- New `player_notifications` table: player, kind, optional contract, JSON payload, read time, creation time.
- Notifications survive restarts and are scoped to one player account.
- The client stores no notification state locally.

### API

- `GET /api/notifications` — latest 50 notifications plus an unread count.
- `POST /api/notifications/:id/read` — marks one owned notification read; another player's id returns 404.
- `POST /api/notifications/read-all` — marks every unread notification of the current player read.
- All routes require an account session.

### Auction events

- Outbid: the previous highest bidder is notified when another player raises the bid.
- Won: the winner is notified after settlement with the paid amount.
- Sold: the seller is notified after settlement with the net amount after the 5% market fee.
- Ended without bids: the seller is notified and told whether the escrowed goods were returned.
- Notifications are written inside the same transaction as the bid or settlement, so a successful auction always has its events recorded.

### Web

- A bell with an unread badge sits in the life header.
- The dropdown lists localized auction outcomes with time and an unread dot.
- Opening the panel refreshes the list; the badge also polls once a minute.
- Clicking an item marks it read; “Mark all read” clears the badge.
- The bell is hidden for guests and during an authentication failure.
- Notification messages are localized in Russian and English in `messages.ts`.

## 2. Verification

| Check | Result |
|---|---|
| Stage 06 contracts/notifications API e2e | **9/9** |
| Outbid notification | PASS |
| Winner and seller settlement notifications | PASS |
| Auction ended without bids notification | PASS |
| Ownership isolation for marking read | PASS |
| Mark all read | PASS |
| API typecheck | PASS |
| Web lint | PASS |
| Web typecheck | PASS |
| Web production build | PASS |

## 3. Limitations

- Only auction outcomes are covered; families, guilds and social events do not notify yet.
- No push, email or SSE delivery; the badge polls, and the list loads on demand.
- Only the latest 50 notifications are returned; the unread count still covers all of them.
- There is no delete or retention policy yet.
- Notifications do not link to the contract or life history.
- Settlement remains lazy: notifications appear after the contract board is read.
- A settlement that keeps failing is retried on later board reads and does not notify participants.

## 4. Deployment

- Code commit `15f9873`; production runtime **`15f9873`**.
- Deploy run **43728646058**, success; history `15:42:41Z deploy-start` → `15:43:10Z deploy ok`.
- Production now has **26 migrations**; save schema 14.
- `/api/health` 200; `/api/contracts?universeId=hunter` 200; `/api/notifications` 401 for guests; web `/` 200.
- CI **43726944167** success after rerunning one flaky Playwright adventure test; Security **43726944159** success.
- Previous runtime `b23ca79` is the rollback target.

## 5. Rollback

Migration 26 only creates a new table. Application rollback is safe; the table can stay unused.
