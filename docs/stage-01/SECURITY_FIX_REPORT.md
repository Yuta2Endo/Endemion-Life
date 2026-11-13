# Security Fix Report — STAGE 01

**Scope:** B1–B7. No production access, deployment, secret change, or database migration.
**Baseline:** STAGE 00 `docs/audit/SECURITY_AUDIT.md`.

---

## B1 — OIDC offline grace could revive revoked sessions

**Original problem.** Refresh attempts advanced `refreshedAt` before the provider call. During a provider outage, a session could keep serving for the one-hour grace, and when grace expired the revocation was not persisted consistently. A revoked/blocked session could become valid again after the provider recovered.

**Root cause.** `EndemionIdService.refresh` treated the claim timestamp as a successful refresh and only updated `lastOkAt` on success; the transient path never wrote `revokedAt` when grace was exhausted.

**Files changed.**
- `apps/api/src/auth/endemion-id.service.ts`
- `apps/api/src/auth/endemion-id.controller.ts`
- `apps/api/test/endemion-id-provider.ts`
- `apps/api/test/endemion-id.e2e-spec.ts`

**Solution.**
- The conditional `refreshedAt` update remains the concurrency claim (`refreshedAt = claimedAt`, `revokedAt = null`).
- On success, `lastOkAt` and the rotated refresh token are written.
- On provider rejection (`ResponseBodyError`, subject mismatch), the session is revoked immediately.
- On transient failure, if `now − (lastOkAt ?? createdAt) >= 1h`, `revokedAt` is persisted and the result is `ended`.
- Otherwise, `refreshedAt` is rolled back to its previous value (conditional on the claim), so the next request retries the provider. A failed refresh is never counted as a successful check.
- `IDENTITY_CONFLICT` and `EMAIL_TAKEN` now redirect to `?idError=linked` instead of producing a 500.

**Tests.**
- Outage longer than grace → session revoked; after provider recovery it remains revoked.
- Short outage → session remains, `refreshedAt` is not advanced, next request retries and succeeds after recovery.
- Second verified-email Endemion ID cannot take over an already linked legacy account.
- Existing blocked-account and callback-replay tests remain green.

**Residual risk.** The offline grace is still one hour. `lastOkAt` is only updated on successful refresh, not every request; this is intentional. Session rotation and `__Host-` cookie migration remain follow-up work (P3).

---

## B2 — Social block ownership overwrite

**Original problem.** `social.block()` used `upsert` with `update: { status: "blocked", askedById: playerId }`. If A blocked B, B could call block on A and become the recorded blocker, potentially changing visibility semantics.

**Root cause.** The update path did not preserve the original `askedById`.

**Files changed.**
- `apps/api/src/social/social.service.ts`
- `apps/api/test/stage07.e2e-spec.ts`

**Solution.**
- Block runs in a transaction.
- Both player rows are locked in deterministic ID order with `SELECT id ... ORDER BY id FOR UPDATE`.
- If a blocked tie already exists and was created by the other player, return 403.
- Otherwise create the tie, or update the existing row with the current player as blocker.
- Concurrent opposite blocks serialize; one wins with 200, the other receives 403, and exactly one tie remains.

**Tests.** Reverse block returns 403; `askedById` stays the original blocker; blocked profile remains 404. Concurrent opposite blocks produce one 200 + one 403.

**Residual risk.** An advisory-lock variant was attempted and rejected because Prisma cannot deserialize `pg_advisory_xact_lock` returning `void`; row locks are now the established pattern.

---

## B3 — OIDC account-link race

**Original problem.** The same-email account lookup occurred outside the transaction, and the conditional `updateMany` did not verify which request actually linked the identity. Two concurrent callbacks with different `sub` values and the same verified email could issue sessions for the same owner.

**Root cause.** TOCTOU between account lookup, `endemionSub` check, and update.

**Files changed.**
- `apps/api/src/auth/auth.service.ts`
- `packages/shared/src/views.ts`

**Solution.**
- Same-email account lookup moved inside the transaction.
- `SELECT ... FOR UPDATE` on the matching `accounts` row and its owner player.
- Re-read and reject a non-null `endemionSub` that differs from the incoming `sub`.
- Lock the current guest player before adoption and the target player before linking.
- After `updateMany`, re-read and require `endemionSub === claims.sub`; otherwise throw `409 IDENTITY_CONFLICT`.
- Added `IDENTITY_CONFLICT` to `ApiErrorCode`.

**Tests.** A second verified-email identity cannot take over a legacy account; owner's `endemionSub` remains the first identity. The callback redirects to `?idError=linked`.

**Residual risk.** A true simultaneous two-request race is protected by row locks and the unique `players.endemion_sub` index, but the e2e test is sequential. A database-level unique violation still maps to a safe conflict.

---

## B4 — Alive-life cap was not transactionally enforced

**Original problem.** `create()` counted alive lives before opening the transaction. Concurrent requests could each observe 19 and create a 20th/21st life.

**Files changed.**
- `apps/api/src/lives/lives.service.ts`
- `apps/api/test/lives.e2e-spec.ts`

**Solution.** New `lockPlayer(tx, playerId)` (`SELECT id FROM players ... FOR UPDATE`). `create`, `succeed`, and alive `importLife` lock the player before counting and inserting. The count and insert now share one transaction.

**Tests.** Baseline life establishes the guest session, then 24 concurrent creates: exactly 19×201 and 5×409 `LIMIT_REACHED`; database has 20 alive lives.

**Residual risk.** The lock serializes all life creation for one player, which is correct for a cap of 20 and acceptable load.

---

## B5 — Import validation could produce 500 and trusted unbounded data

**Original problem.** Malformed imports could reach `prepareImport` or Prisma and surface as 500. Age, name, state size, schema version, and history volume were not bounded at the API boundary.

**Files changed.**
- `apps/api/src/lives/lives.service.ts`
- `apps/api/test/stage04.e2e-spec.ts`

**Solution.** `checkImportBounds` now enforces:
- serialized state ≤ 512 KB;
- character name 1–64 characters;
- age integer 0–200;
- schemaVersion integer 1–8;
- history ≤ 2,000 entries;
- total history changes ≤ 20,000 and estimated total ≤ 2 MB;
- no silent truncation.

`prepareImport` mapping: `ApiError` preserved; `LINEAGE_CONTINUED` → 409; other `GameRuleError` → 400 `INVALID_SAVE`; unknown error → 400 `INVALID_SAVE`.

**Tests.** Age 201, 65-character name, 600 KB state, missing history, and excessive changes all return 400. Existing schema-8 acceptance and replay tests remain green.

**Residual risk.** `state` is still accepted as a generic record and deeply validated by game-core; optional lineage/world/social sections remain shallowly checked (D-01). No schema change was made.

---

## B6 — Rate-limit failure policy

**Original problem.** The global Redis limiter skipped when Redis was not ready and returned allow on errors (fail-open). Under Redis outage, game routes were unprotected.

**Files changed.**
- `apps/api/src/redis/rate-limit.guard.ts`
- `apps/api/src/health/health.controller.ts`
- `apps/api/test/reliability.e2e-spec.ts`

**Decision.** **Fail closed for game routes, preserve login availability.**
- Health is always excluded.
- `/api/auth/*` falls through to the in-memory `AuthThrottle` (login/register remain available).
- All other limited routes return `503 UNAVAILABLE` if Redis is unavailable or a Redis command fails.
- Health returns 503 when database or Redis is down.

**Tests.** With Redis stopped: health 503 degraded; game POST 503 `UNAVAILABLE`; repeated bad logins still 401,401,401,429,429. Full API e2e is green.

**Residual risk.** A Redis outage now makes gameplay unavailable by design. This is documented as an availability/security tradeoff and should be reviewed before horizontal scaling.

---

## B7 — Content Security Policy

**Original problem.** No CSP header; only nosniff, referrer policy, frame deny, and permissions policy.

**Files changed.**
- `apps/web/next.config.ts`

**Solution.**
`default-src 'self'`; `script-src 'self' 'unsafe-inline'` (plus `'unsafe-eval'` only in development); `style-src 'self' 'unsafe-inline'`; `img-src 'self' data: blob: https://endemion.online`; `font-src 'self' data:`; `connect-src 'self'` (plus localhost/ws in development); `worker-src 'self' blob:`; `manifest-src 'self'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'`; `upgrade-insecure-requests` in production.

**Verification.** Production build serves the CSP; all 62 Playwright tests pass with it. Next.js requires inline scripts/styles, so `'unsafe-inline'` remains in `script-src`/`style-src`. A nonce-based CSP is follow-up work, not a Stage 01 requirement.

---

## Security status

| Item | Result |
|---|---|
| P0 | None found or introduced |
| P1 OIDC revival | Fixed and regression-tested |
| P1 live duplication | Fixed (data-integrity report) |
| P2 block overwrite | Fixed |
| P2 OIDC link race | Guarded transactionally |
| P2 alive cap | Fixed |
| P2 import bounds | Fixed |
| P2 rate-limit fail-open | Explicit fail-closed decision |
| CSP | Implemented and verified |
| Portal | Unchanged; decision pending owner approval |
| Production | Not modified |

No secrets, tokens, passwords, or personal data are included in this report.
