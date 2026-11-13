# Stage 05 — Security and Moderation

**Status:** implemented locally, not committed or deployed.
**Scope:** account gate for shared systems, contribution integrity, account export and
deletion, player reports, abuse boundaries.
**Production:** unchanged at Stage 04 (`cf7d098`, save schema 14).

## 1. Account boundary

Stage 05 separates two modes:

| Mode | Identity | Allowed |
|---|---|---|
| Solo | guest `Player` without `Account` | create/play/succeed/import own lives, read public world |
| Shared | `Player` with `Account` | presence, SSE, world contribution, reports, export/delete |

`SessionService.requireAccount(request)` resolves the session, loads the `Account` by
`playerId`, and throws `403 ACCOUNT_REQUIRED` for guests. It returns
`{ session, player, account }` for controllers. Guest solo play is deliberately not
blocked; only shared mutations and presence require an account.

All shared endpoints derive the player id from the session cookie. No endpoint accepts
a `playerId` or `accountId` from the request body as the actor. `targetId` for a report
or contribution is a target, never an identity claim.

## 2. Contribution integrity

`POST /api/world/:universeId/contribute` accepts only:

```json
{
  "actionId": "uuid",
  "expectedSeason": 1,
  "targetKind": "settlement",
  "targetId": "neo-seoul"
}
```

Server rules:

- account required;
- strict zod schema, unknown fields rejected;
- world and target must exist and belong to the declared universe;
- row-level advisory lock on `world:<universeId>` serializes the write;
- unique `(playerId, actionId)` makes retries idempotent;
- `expectedSeason` mismatch returns `409 WORLD_CONFLICT`;
- one contribution per player per world per season returns
  `409 ALREADY_CONTRIBUTED`;
- the server computes the effect: settlement `+1 prosperity/+1 stability`, faction
  `+1 influence/+1 standing`, clamped by the pure shared-world engine;
- the client cannot submit gold, rewards, season increments, or arbitrary deltas;
- `WorldCommand`, `WorldAudit`, `WorldContribution`, season snapshot, and projections
  are written in the same transaction;
- the SSE notification is emitted only after commit.

Replay behavior returns the current world with `replayed: true`. A replay is authorized
only for the same player and `actionId`; it cannot be used to apply a second effect.

## 3. Moderation

`POST /api/social/reports` (account required):

```json
{
  "playerId": "target uuid",
  "reason": "harassment | spam | cheating | other",
  "details": "optional, max 500 chars"
}
```

- self-report returns `400`;
- missing target returns `404`;
- guest returns `403 ACCOUNT_REQUIRED`;
- duplicate reports are allowed but not deduplicated (operational review can group);
- `PlayerReport.status` defaults to `open`; no admin review endpoint exists yet.

Reports are stored in `player_reports` with `reporterId`, `targetId`, `reason`,
`details`, `status`, `createdAt`. The target is not notified. There is no automated
mute, ban, or shadow-ban in this stage; reports are evidence for manual review.

## 4. Account export and deletion

`GET /api/auth/export` returns the authenticated player's export payload:

- player identity (`id`, timestamps, public name fields);
- account metadata (`email`, verification time) without `passwordHash`;
- lives, sessions, and related summary data;
- no session token hashes, refresh tokens, or password hashes.

`DELETE /api/auth/account` requires JSON body `{ "confirm": "DELETE" }`.

- deletes the `Player` aggregate; cascades lives, snapshots, history, actions, sessions,
  contributions, reports made/received, and social ties;
- clears the `el_session` cookie;
- is irreversible; there is no cooling-off period or export-on-delete bundle;
- is protected by the existing same-origin/JSON mutation guard and session cookie.

Deletion is intentionally not exposed to unauthenticated requests and does not accept a
player id from the client. It deletes only the caller's account.

## 5. Abuse and threat review

| Scenario | Control | Residual risk |
|---|---|---|
| Guest tries to contribute | `ACCOUNT_REQUIRED` | None for shared mutation; guest can still solo |
| Client submits fake gold/reward | Server computes fixed effect; body has no reward field | None |
| Double-click / retry contribution | Unique `(playerId, actionId)`; replay returns current state | Replay returns current world, not historical snapshot (documented) |
| Two tabs contribute same season | Unique `(worldId, playerId, season)`; second gets `ALREADY_CONTRIBUTED` | One contribution per season by design |
| Concurrent contributions from many accounts | Advisory lock + conditional rows | Throughput bounded by world lock; expected low volume |
| Stale season | `expectedSeason` check | Client must refetch after `WORLD_CONFLICT` |
| Spam reports | Account required; 500-char details; rate limit global | No per-target report cap yet |
| Export leaks secrets | Explicit field selection; hashes/tokens omitted | Verify response in e2e (done) |
| Deletion misses data | Cascades from `Player`; e2e asserts deletion | Live-window contribution rows have no FK to life; see risk below |
| SSE credential leak | Cookie only; no token in URL | Browser extensions/proxies can still observe traffic |
| Presence enumeration | Public display names only; max 50 | Names are already public in social search |

## 6. Known security and data risks

1. **In-process SSE fan-out.** A second API replica would not deliver notifications to
   clients connected to another replica. Presence remains shared through Redis, but
   notifications are per-process. This is an availability/scaling limitation, not an
   authorization bypass.
2. **No report administration.** Reports are write-only from the product; staff must
   query the database manually. A protected moderation queue is future work.
3. **Deletion and live parts.** `live_parts` has no FK to `lives`; deletion of a player
   removes live parts by player cascade, but world progress already granted is not
   rolled back. This is the same irreversible-reward model as Stage 01, not a new
   escalation.
4. **No per-stream connection cap.** Each open `/worlds` tab holds one SSE connection.
   A malicious account could open many; the global IP rate limit does not govern
   long-lived connections. Add a per-account stream cap before public launch.
5. **No CSRF token.** Shared mutations rely on the existing same-origin `Origin` check,
   JSON content type, and `SameSite=Lax` cookie. This matches the rest of the API but
   remains a defense-in-depth gap; CSP does not replace a CSRF token.
6. **Contribution replay returns current state.** A retry after later world changes
   returns the latest projection, not the projection at the original action. It does
   not duplicate the effect, but it can confuse a client that expects exact historical
   replay. The client should always refetch after replay.

## 7. Verification evidence

`apps/api/test/stage05.e2e-spec.ts` covers guest denial, contribution authorization,
idempotency, season conflict, one-per-season, concurrent same-account and multi-account
writes, audit actor, report validation, export secret exclusion, deletion cascade, and
SSE notification delivery.

- targeted Stage 05 e2e: **9/9 passed**;
- full API e2e: **132/132 passed** (15 files, 75.6s);
- API unit: **74/74**;
- web unit: **25/25**;
- typecheck, lint (0 errors, 1 pre-existing warning), web build: pass.

## 8. Required before production

1. Fresh production backup and trial restore.
2. Apply additive Stage 05 migration; verify migration count 12.
3. Confirm Nginx SSE location and Caddy buffering behavior.
4. Run a two-account presence/contribution smoke test against production.
5. Verify export omits hashes and deletion removes a disposable test account.
6. Keep portal integration out of this release (owner decision still pending).
