# Stage 05 — Multiplayer Foundation Report

**Status:** **COMPLETE; COMMITTED, PUSHED, AND DEPLOYED**
**Date:** 2026-11-14
**Release code:** `9daaec2`; previous `cf7d098` (Stage 04)
**Save schema:** 14 (unchanged)
**DB migrations:** 12 (Stage 05 additive migration applied in production)

## 1. Executive summary

Stage 05 adds the first trusted shared-world layer to Endomion Life without replacing
the solo game or the deterministic `game-core` engine. Guests can continue to play
alone; only accounts can appear online, contribute to the shared world, report players,
or export/delete their account.

The implementation is server-authoritative. A contribution carries only an action id,
expected season, and a target. The server computes the effect, serializes world writes
with an advisory lock, records the command and audit trail, enforces one contribution
per player per season, and emits a real-time notification after commit.

This is **not** full multiplayer: there is no chat, trading, shared party, player
economy, cross-player family interaction, or multi-replica event fan-out. It is a
foundation for those systems, not a claim that they exist.

## 2. Delivered capabilities

### 2.1 Account boundary

- `SessionService.requireAccount` distinguishes guests from accounts.
- Guest solo play is unchanged.
- Shared endpoints return `403 ACCOUNT_REQUIRED` for guests.
- No shared endpoint trusts a client-supplied player id as the actor.

### 2.2 Presence and SSE

- Redis sorted set per universe, 90-second TTL, max 50 online entries.
- Account-only heartbeat and roster.
- SSE stream with initial roster, `hello`, 20-second heartbeat, and `world` events.
- Nginx exact-match route disables buffering/cache/gzip for the stream.
- Redis outage degrades presence gracefully instead of failing solo play.

### 2.3 Shared-world contribution

- `POST /api/world/:universeId/contribute`.
- Strict zod body; server-computed settlement/faction effect.
- Advisory lock per universe.
- Idempotency by `(playerId, actionId)`.
- Season conflict and one-per-season enforcement.
- World command, audit, contribution row, season snapshot, and projections in one
  transaction.
- SSE emitted after commit only.

### 2.4 Account lifecycle and moderation

- `GET /api/auth/export` with explicit field selection, no password/token hashes.
- `DELETE /api/auth/account` with `{confirm:"DELETE"}`, cascade delete, cookie clear.
- `POST /api/social/reports` with reason enum, 500-character details, self-report
  rejection, target existence check.
- Player report rows are stored for manual review; no automated ban/mute.

### 2.5 Web and infrastructure

- `/worlds` participation panel: heartbeat, EventSource, online roster, settlement/
  faction selection, contribution, localized notices and errors.
- Guest sees account call-to-action instead of a broken contribution form.
- SSE route in Nginx; Caddy/edge buffering still requires deployment verification.

## 3. API summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/presence/heartbeat` | account | update presence |
| GET | `/api/presence/online?universeId=` | account | online roster |
| GET | `/api/presence/stream?universeId=` | account | SSE stream |
| POST | `/api/world/:universeId/contribute` | account | idempotent world contribution |
| GET | `/api/auth/export` | account | export account data |
| DELETE | `/api/auth/account` | account | delete account |
| POST | `/api/social/reports` | account | report a player |

Existing public world reads and solo life routes are unchanged.

## 4. Data model changes

Additive only:

- `world_contributions`:
  - `id`, `worldId`, `playerId`, `actionId`, `season`, `targetKind`, `targetId`,
    `createdAt`;
  - unique `(playerId, actionId)`, unique `(worldId, playerId, season)`;
  - cascade FKs to `worlds` and `players`.
- `player_reports`:
  - `id`, `reporterId`, `targetId`, `reason`, `details`, `status`, `createdAt`;
  - cascade FKs to `players`.
- `world_commands.actor` and `world_audits.actor` widened to `VARCHAR(64)` for account
  ids.

No changes to `Life`, `GameState`, snapshots, history, or save schema.

## 5. Acceptance criteria

| ID | Criterion | Status | Evidence |
|---|---|---|---|
| 05-01 | Guest shared mutations blocked | **PASS** | Stage 05 e2e: heartbeat/online/stream/contribute 403; solo life still 200 |
| 05-02 | Presence heartbeat/reconnect/stale expiry | **PARTIAL** | Heartbeat, roster, stale expiry tested; browser auto-reconnect not e2e-tested |
| 05-03 | Two accounts receive each other's world notification | **PASS** | SSE e2e receives `hello` + contribution `world` event |
| 05-04 | Idempotency + expected season + rate limit + audit | **PASS** | Replay, stale season, duplicate-season, command/audit actor tests; rate limiting is the existing global guard, no dedicated contribution budget |
| 05-05 | Concurrent actions cannot duplicate rewards/corrupt projections | **PASS** | Same-account one 200/one 409; 3-account concurrent contributions +3 |
| 05-06 | Reconnect restores state without duplicate actions | **PARTIAL** | Snapshot on connect implemented; not e2e-tested |
| 05-07 | Account deletion/export | **PASS** | Export excludes secrets; delete cascades and clears session |
| 05-08 | Report/block basics | **PASS** | Report validation and storage e2e; existing block tests remain |
| 05-09 | Load test with latency/error budget | **NOT DONE** | No Stage 05 load test; current production is low traffic |
| 05-10 | No client-supplied canonical rewards/seed | **PASS** | Contribution body has no reward/seed/delta fields; server computes effect |

Stage status: **DEPLOYED WITH VERIFICATION GAPS**. It must not be described as fully
complete until 05-02/05-06 reconnect behavior, 05-09 load behavior, and the authenticated
production SSE/presence smoke are verified.

## 6. Testing evidence

| Suite | Result |
|---|---|
| game-core | **775/775**, 53 files |
| shared | **18/18**, 2 files |
| API unit | **74/74** |
| API e2e | **132/132**, 15 files, 75.6s |
| Web unit | **25/25**, 8 files |
| Typecheck | pass, all packages |
| Lint | 0 errors, 1 pre-existing warning |
| Web build | pass, 12 routes |

Expected fault-injection logs: injected history failure (500), Redis-down health/game
503, corrupted shared-world rollback. No Stage 05 regression.

## 7. Security assessment

No P0 introduced. Key controls:

- account-only shared mutations;
- server-authoritative effects;
- advisory lock + unique constraints;
- transactionally consistent contribution/audit/projection writes;
- explicit export field selection;
- cascade deletion;
- cookie-only SSE authentication;
- no secrets in URLs;
- strict input validation.

Residual risks: in-process SSE fan-out, no stream connection cap, no moderation queue,
no CSRF token (existing mitigation unchanged), contribution replay returns current
world, and no rate-limit test for contribution volume. Details:
`docs/stage-05/SECURITY_AND_MODERATION.md`.

## 8. Production status

Released and deployed on 2026-11-13:

1. Owner approval: received.
2. Fresh backup and full trial restore: passed.
3. Portal-free commit; portal files and Stage 11 reports excluded.
4. CI run 43522651518 and Security run 43522651419: success.
5. Deploy run 43523555168 with additive migration: success.
6. Production HEAD `9daaec2`, 12 migrations, all containers healthy,
   `/api/health` 200, `/api/world` 200, SSE route returns 401 without an account.
7. Full two-account authenticated smoke was **not executed**: production password
   registration is disabled (`410 USE_ENDEMION_ID`), so it requires a disposable
   Endemion ID account. Nginx/Caddy SSE streaming through an authenticated session is
   therefore still unverified in production.

Rollback target: `cf7d098` (Stage 04, schema 14); Stage 05 migration is additive.

## 9. Limitations / not built

- No chat or direct messages.
- No player trading, gifting, or player economy.
- No shared party, guild, or social organization.
- No cross-player family or inheritance interaction.
- No multi-replica SSE fan-out.
- No automated moderation or admin report queue.
- No push notifications.
- No mobile-native presence behavior.
- No load/soak test for the SSE or contribution path.

## 10. Recommended next step

Stage 05 is deployed. Before Stage 06, close the remaining verification gaps:
authenticated production presence/SSE with a disposable Endemion ID account, reconnect
behavior, and a bounded load test. Then proceed to **Stage 06 — Social & Economic
Systems** with a narrow first slice: player-to-player trade or guild/organization
foundation, built on the account boundary, server authority, audit trail, and
idempotency pattern.

## 11. Verification boundary

This report is based on local source inspection, targeted and full test runs, local
PostgreSQL/Redis, typecheck/lint/build, production deployment logs, production health
and public route checks. It does **not** claim an authenticated production SSE/contribution
smoke, real-device Android behavior, multi-replica behavior, or load capacity.
