# Endemion Life — Security Audit

**Stage:** 00 — Complete Project Audit  
**Date:** 2026-11-13  
**Scope:** `apps/api`, `apps/web`, `packages/shared`, Prisma schema/migrations, deployment and edge configuration, and the Android shell.  
**Method:** static source review, read-only inspection of live production responses and database aggregates, review of existing tests. No penetration test, fuzzing, load test, or credential attack was performed. No secret values are reproduced in this document.

## 1. Executive summary

No P0 vulnerability was proven. The security baseline is materially better than a typical prototype:

- The server is authoritative for life actions, trades, adventures, succession, live contributions, and rewards.
- Session tokens are 32 random bytes; only SHA-256 hashes are stored; cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Passwords use scrypt with a per-password salt and a dummy-hash timing equalizer.
- OIDC uses Authorization Code + PKCE S256, state, nonce, exact issuer/audience, and encrypted refresh tokens.
- Life routes derive the player from the session and query by `(lifeId, playerId)`; no route accepts a client-supplied owner ID.
- Prisma and raw SQL are parameterized; request bodies are bounded; auth has per-IP/email throttling and a 15-minute lockout; errors are generic; logs redact secrets.
- Production sends HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, and a restrictive permissions policy.

The main risks are lifecycle and operational, not a direct auth bypass:

1. **OIDC sessions are not hard-revoked when provider-offline grace expires** (P1).
2. **The Stage 11.2 portal exists only as uncommitted code and has no production deployment path** (P1 release/ops, not currently exploitable).
3. **Live-window rewards can be duplicated through save restore** (P1 data/economy; latent because production has no live windows).
4. **Guest→account transfer deletes live parts**, and the social block can be overwritten by the blocked party (P2).
5. **Rate limiting and import validation degrade under Redis failure or hostile input** (P2/P3).
6. **Backups are unencrypted**, and a stolen backup exposes PII, password hashes, and refresh-token ciphertext (P2).

## 2. Assets and trust boundaries

| Asset | Location | Trust boundary |
|---|---|---|
| Session cookie `el_session` | Browser/WebView | Untrusted client; DB stores hash only |
| Password hashes | `accounts.password_hash` | Server/DB; scrypt |
| Endemion ID refresh token | `sessions.refresh_token` encrypted | Server/DB; AES-256-GCM |
| Player life state | `lives.state` JSON | Client sends intent only; server applies |
| History/snapshots | `history_entries`, `life_snapshots` | Server-written; import is client-authored but validated |
| Live ops token | `LIVE_OPS_TOKEN` | Shared secret; admin surface |
| Portal JWT/JWKS | Portal issuer | External identity; verified ES256 |
| Backups | Host volume/S3 | Infrastructure; currently unencrypted |

Browser → Next.js/edge → NestJS API → PostgreSQL/Redis is the primary request path. The Android shell loads the production HTTPS origin in a WebView, so cookies remain first-party.

## 3. Positive controls to preserve

- `RequestGuard` rejects mutation requests without JSON content type and, when `Origin` is present, requires an allowed origin. SameSite=Lax provides a second CSRF barrier.
- `RateLimitGuard` is global; auth has a separate per-IP and per-email limiter with an in-memory fallback.
- `LivesService.act` uses `SELECT ... FOR UPDATE`, `expectedVersion`, and a unique `(lifeId, actionId)` key. Concurrency tests cover 10 simultaneous actions and 8 duplicate action IDs.
- `succeed` uses a server-generated salt, a unique predecessor constraint, and a single transaction.
- `prepareImport` regenerates the seed/RNG and strips unverified hidden values; imported lives are marked `local-import`.
- OIDC verifies signature, issuer, audience, expiry, nonce, state, and PKCE; it rejects subject mismatch and allows avatars only from the issuer’s `/avatars/` prefix.
- Error responses do not expose stack traces or SQL; request logs omit query strings, bodies, cookies, and authorization headers.
- Production `/api/health` returned `database: up`, `redis: up`; homepage and API were reachable over HTTP/2 with HSTS.

## 4. Findings

### 4.1 Summary table

| ID | Sev | Finding | Status |
|---|---|---|---|
| S-01 | **P1** | OIDC offline grace does not persist revocation | CONFIRMED |
| S-02 | **P1** | Portal code uncommitted; no compose/env/JWKS operational wiring | CONFIRMED |
| S-03 | P2 | Guest→account transfer deletes `live_parts` via cascade | CONFIRMED |
| S-04 | P2 | Social block ownership can be overwritten | CONFIRMED |
| S-05 | P2 | OIDC account-link race can attach a session to a concurrently linked player | LIKELY |
| S-06 | P2 | Global/portal rate limits fail open on Redis outage | CONFIRMED |
| S-07 | P2 | Alive-life cap has TOCTOU across create/import/succession | CONFIRMED |
| S-08 | P2 | Import trusts age/version/history; long name can cause 500 | CONFIRMED |
| S-09 | P2 | Portal JWT `jti` is not replay-protected | CONFIRMED |
| S-10 | P2 | Backups are unencrypted and contain PII/auth material | CONFIRMED |
| S-11 | P3 | No Content-Security-Policy | CONFIRMED |
| S-12 | P3 | 365-day session, no rotation, no `__Host-` prefix | CONFIRMED |
| S-13 | P3 | One shared `LIVE_OPS_TOKEN` for insights and live management | CONFIRMED |
| S-14 | P3 | Portal no-store middleware path likely mismatched with global prefix | LIKELY |
| S-15 | P3 | JWKS fetch follows redirects without size/type cap | CONFIRMED |
| S-16 | P3 | Health endpoint is unthrottled; `GET /api/live` has side effects | CONFIRMED |
| S-17 | P3 | Production config permits insecure CORS/cookie/proxy values | CONFIRMED |
| S-18 | P3 | Sentry exception messages may contain PII | LIKELY |
| S-19 | P3 | Auth throttle memory map can grow during Redis outage | CONFIRMED |
| S-20 | P3 | Import parsing is synchronous and CPU-unbounded beyond 2 MB | CONFIRMED |
| S-21 | P3 | Social search uses case-insensitive Prisma query without matching index | LIKELY |
| S-22 | P3 | `live_parts` has no FK to `lives`; orphan rows possible | CONFIRMED |
| S-23 | P3 | No account-deletion path (privacy/product compliance) | CONFIRMED |

No P0 item is listed because no unauthenticated RCE, direct auth bypass, current-route IDOR, SQL injection, or production secret exposure was found.

### 4.2 S-01 — OIDC offline grace does not hard-revoke (P1)

**Evidence:** `apps/api/src/auth/endemion-id.service.ts:193-225`. `refresh()` first returns `"ok"` when `now - refreshedAt < REFRESH_MS`. It then claims the refresh by writing `refreshedAt` **before** contacting the provider. If the provider is unreachable and `now - lastOkAt >= OFFLINE_GRACE_MS`, it returns `"ended"` but does not set `revokedAt`. `session.service.ts:64-68` only rejects the current request; the next request within five minutes gets `"ok"` from the early return.

**Impact:** a session that the provider has revoked or blocked can remain usable as long as the attacker keeps making requests. The grace mechanism intended to tolerate outages becomes an indefinite extension.

**Fix:** on grace expiry, set `revokedAt` (and log a security event). Advance `refreshedAt` only after a definite provider result, or store a separate `lastRefreshAttemptAt` with backoff. Add a time-controlled test: provider fails, grace expires, next request must be unauthenticated and the session row revoked.

**Dependencies:** none; can ship independently.

### 4.3 S-02 — Portal is not deployable (P1, release/ops)

**Evidence:** `apps/api/src/portal/` is untracked; `app.module.ts` and `config.ts` are modified; `.env.example` adds `PORTAL_*`, but `infrastructure/docker-compose.prod.yml` passes no portal variables and production `.env` has none. The deploy workflow builds the committed SHA, not the dirty tree. Portal tests use fake Prisma/Redis.

**Impact:** CI and production cannot reproduce or enable the feature. If enabled manually without the expected env, the route stays 404; if enabled without tests against real PostgreSQL, tenant/isolation behavior is unproven. The feature is read-only and fail-closed today, so this is not an active exploit, but it blocks Stage 11.3.

**Fix:** commit only after the D1–D14 decisions; add env/compose/secret-manager wiring, a real staging database test, audit-log retention, and a kill switch. Do not enable by default.

### 4.4 S-03 — Guest→account transfer loses live participation (P2)

**Evidence:** `auth.service.ts:221-228` moves `lives` and `game_actions` from the guest player, then deletes the guest. `live_parts.playerId` is a FK with `ON DELETE CASCADE`; `live_parts` has no FK to `lives`. A guest’s contributions and `claimedAt` are deleted. An active window can then accept contributions from the same life again, and unclaimed rewards disappear.

**Impact:** data loss and possible duplicate rewards after login. Production has 0 live windows, so no current loss; the code is deployed.

**Fix:** transfer `live_parts` in the same transaction, or re-key them by `lifeId` and add a Life FK. Add a transfer test with an active window and a claimed part.

### 4.5 S-04 — Social block ownership overwrite (P2)

**Evidence:** `social.service.ts:148-153` upserts a pair and overwrites `askedById`. `remove` only lets the recorded asker remove the tie (`:136-139`), while `profile` hides based on `askedById` (`:177`). If A blocks B, B can call `block` on A, become the recorded blocker, view A’s profile, and remove the block. A can no longer remove B’s block.

**Impact:** harassment/block evasion and incorrect visibility. No privilege escalation beyond social visibility.

**Fix:** model blocks directionally (`blockedById` + `blockedPlayerId`) or reject a re-block by the already-blocked side; prevent the blocked party from removing the block. Add tests for both directions.

### 4.6 S-05 — OIDC account-link race (P2, likely)

**Evidence:** `auth.service.ts:87` reads `sameEmail` outside the transaction; `:110-111` runs `updateMany` on `endemionSub: null` but ignores `count`; `:117-120` proceeds to create a session. Two verified identities with the same email can race: the loser may still receive a session tied to the winner’s player after the winner linked a different `sub`.

**Impact:** narrow account takeover requiring control of two verified identities with the same email and precise timing. Not observed.

**Fix:** perform the read and conditional update in one transaction; require `count === 1`; otherwise return 409 and re-authenticate. Add a concurrency test.

### 4.7 S-06 — Rate limits fail open on Redis outage (P2)

**Evidence:** `redis/rate-limit.guard.ts:20,28-30` allows the request when Redis is not ready or throws; `portal-auth.guard.ts:72-87` behaves similarly. Only `auth-throttle.ts:41-51` has an in-memory fallback.

**Impact:** a Redis outage removes general and portal abuse protection. An attacker who can cause or exploit the outage can flood imports, actions, JWKS refreshes, or health checks.

**Fix:** fail closed for expensive/sensitive routes, or use a bounded in-process token bucket per IP/subject; keep the auth fallback. Alert on Redis unavailability.

### 4.8 S-07 — Alive-life cap TOCTOU (P2)

**Evidence:** `lives.service.ts:150-152` counts alive lives outside the create transaction; succession (`:249-251`) and import (`:313-316`) count without a player-level lock. `MAX_ALIVE_LIVES = 20` (`shared/views.ts:181`).

**Impact:** concurrent requests can exceed the cap, increasing storage and gameplay edge cases. No direct privilege escalation.

**Fix:** serialize by player (row lock or advisory lock) or enforce the limit with a transactional count/constraint in all three paths. Add a concurrent-create test.

### 4.9 S-08 — Import trust boundary (P2)

**Evidence:** `prepareImport` caps wealth by age but accepts arbitrary `age` (no upper bound), arbitrary `version`/`nextSeq`, and a fabricated history. `state.character.name` only has to be non-empty, while `lives.name` is `VARCHAR(64)`. A long name can produce a Prisma error/500 rather than a 400.

**Impact:** fabricated high-age/high-wealth lives within caps; anti-cheat/provenance weakness; minor DoS/Sentry noise. Imported lives are visibly marked `local-import` but still progress.

**Fix:** bound age/name/version; clamp or reject implausible combinations; return 400; consider making imported lives non-competitive or requiring an attestation. Add boundary tests.

### 4.10 S-09 — Portal JWT replay (P2)

**Evidence:** `portal-token.service.ts:112` validates `jti` syntax but never stores it; tokens last up to 120 s; only per-subject rate limiting exists.

**Impact:** a leaked portal bearer token can be replayed within its lifetime to read a profile (display name, life counts). Limited data, but violates one-time-token expectations.

**Fix:** Redis seen-set keyed by `jti` with TTL ≥ token lifetime; reject duplicates. Add a replay test.

### 4.11 S-10 — Unencrypted backups (P2)

**Evidence:** `infrastructure/backup/lib.sh:88-103` creates `pg_dump --format=custom --compress=6`, checksums, read-only files. No encryption before host storage or S3 upload. Backups contain emails, password hashes, encrypted refresh tokens, session hashes, and all game state.

**Impact:** a backup/S3 compromise exposes PII and offline-crackable password hashes; refresh-token encryption keys may also be on the same host.

**Fix:** encrypt with age/GPG/KMS before upload; store the key outside the backup host; restrict the backup directory; test restore; rotate DB and OIDC secrets after any suspected exposure.

### 4.12 Lower-severity findings

- **S-11 / CSP:** Next.js sets nosniff, referrer policy, frame deny, and permissions policy, but no Content-Security-Policy (`next.config.ts:26-39`; Nginx entrypoint). XSS impact is higher. Add a tested CSP with Next.js/avatar allowances.
- **S-12 / sessions:** 365-day absolute lifetime, no rotation, no `__Host-` prefix (`session.service.ts:11-12`). Use a shorter lifetime, rolling refresh, and `__Host-el_session`.
- **S-13 / ops token:** one shared `LIVE_OPS_TOKEN` authorizes insights and live management; no rotation/audit/scopes. Split tokens or add scoped service credentials.
- **S-14 / portal cache:** `forRoutes("portal")` is registered while the global prefix is `api`; the controller spec mounts `/api/portal` manually. Verify through the full app; ensure `Cache-Control: private, no-store` on 401/404/429 as well.
- **S-15 / JWKS:** fetch follows redirects and has no size/content-type cap (`portal-jwks.service.ts:71-78`). Use `redirect:"error"`, a byte cap, content-type check, and optional address allowlist.
- **S-16 / health and GET side effects:** `/api/health` bypasses the global limiter and performs DB+Redis work; `GET /api/live` sweeps windows and creates templates. Rate-limit health separately and move simulation to a scheduled job.
- **S-17 / config:** production allows `COOKIE_SECURE=false`, `TRUST_PROXY=true`, HTTP `PUBLIC_URL`, and `CORS_ORIGINS=*`/HTTP. Reject insecure values in production.
- **S-18 / Sentry:** `beforeSend` strips request data and redacts `extra`, but raw exception messages/stacks can contain PII. Redact messages and disable default PII.
- **S-19 / throttle memory:** the in-memory map is pruned only above 10k entries; unique keys can grow during a Redis outage. Use a bounded LRU.
- **S-20 / import CPU:** 2 MB/2000-entry synchronous parse/validate; no dedicated quota. Add a dedicated import limit and depth/size limits.
- **S-21 / search index:** Prisma `mode:"insensitive"` against plain btree indexes may seq-scan. Add expression indexes or normalized columns.
- **S-22 / live_parts FK:** no FK to `lives`; add one and a cleanup job.
- **S-23 / account deletion:** no API/UI found. Required for Play/privacy expectations; implement export and deletion with a grace period.

## 5. Production header and exposure evidence

Observed on `https://life.endemion.online` (read-only):

- HTTP/2 200; HSTS `max-age=63072000; includeSubDomains`; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` disables camera, microphone, geolocation; `server: nginx`, `via: Caddy`.
- No `Content-Security-Policy` header observed.
- `/api/health` returned `status: ok`, `version: 0.1.0`, database and Redis up.
- Production `.env` contains `ENDEMION_ID_*`, `SENTRY_DSN`, SMTP, backup/S3, alerting, and rate-limit keys, but no `PORTAL_*` and no `LIVE_OPS_TOKEN` in the compose environment. Values were not read or recorded.
- Production database had 0 accounts, 29 sessions, 18 players, 0 ties, 0 live windows. This means email/OIDC/live/social paths are largely unexercised in production.

## 6. Threat scenarios and residual risk

1. **Stolen session cookie:** valid up to 365 days; revocation requires explicit session revoke or provider `"ended"`. S-01 can extend a revoked OIDC session. Mitigate with shorter lifetimes, rotation, device/session UI, and hard revocation.
2. **Provider outage:** intended 1-hour grace; current implementation can be bypassed by request timing. Fix S-01 before enabling OIDC broadly.
3. **Guest data merge:** lives/actions transfer, but live parts and social ties do not. Loss/duplication risk for future social features. Fix S-03 and test.
4. **Live economy:** claim→restore→claim is a repeatable gold faucet. Production has 0 windows, but the code is live. Fix TD-03 before enabling live ops.
5. **Imported saves:** a client can author a past state within caps. This is acceptable for a preservation feature only if imports are non-competitive; otherwise add provenance/attestation. Fix S-08.
6. **Social harassment:** block overwrite allows evasion. Fix S-04.
7. **Ops token leakage:** shared token gives insights + live management. Split and rotate. Fix S-13.
8. **Backup theft:** PII/password hashes exposed. Encrypt and isolate. Fix S-10.

## 7. Not verified

- No dynamic penetration test, fuzzing, dependency exploit test, or OIDC provider integration test was run.
- API e2e and Playwright were not executed because they require a disposable PostgreSQL/Redis/browser environment; the audit rules prohibit production writes.
- Android WebView cookie/backup behavior was not tested on a device.
- Production backup restore was not performed.
- No secrets were printed, extracted, or committed during this audit.

## 8. Release gate recommendation

Do not expose portal, live ops, player trading, or Android release builds until the P1 items are closed and the P2 data-integrity items have regression tests. The existing server-authoritative core is a strong base; the priority is to make revocation, restore, transfer, and reward lifecycles correct before adding shared-world features.
