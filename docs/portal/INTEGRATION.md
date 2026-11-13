# Portal ↔ Life Integration

**Status:** **ACTIVE in production**; Portal JWKS live, Life endpoint verified for 401 paths.
**Date:** 2026-11-14
**Life production:** `3f35fdc`; `/api/portal/profile` returns `401 UNAUTHORIZED` without a token.
**Portal production:** `GET https://endemion.online/.well-known/jwks.json` returns `200` with one public ES256 key.

This document supersedes the earlier "Option B: keep portal out of the release" decision for the
Life code. The code may ship dark; activation still requires the Portal-side key and flag.

## 1. Purpose

The Endemion Portal backend can request a minimal, read-only Life profile for the
authenticated Endemion ID. The browser never calls the integration endpoint and never
supplies an identity.

```text
Browser → Portal session → Portal backend
  → short-lived ES256 JWT (120 s, aud=life)
  → GET https://life.endemion.online/api/portal/profile
  → Life verifies JWT via Portal JWKS
  → players.endemion_sub → counts + display name
  → { exists, displayName, lives: { total, alive } }
```

No email, username, playerId, GameState, seed, history, or session data is exposed.

## 2. Life-side implementation

| Component | Path | Responsibility |
|---|---|---|
| Controller | `apps/api/src/portal/portal.controller.ts` | `GET /api/portal/profile`, read-only |
| Guard | `apps/api/src/portal/portal-auth.guard.ts` | Bearer parsing, per-`sub` limit, no-store |
| Token validator | `apps/api/src/portal/portal-token.service.ts` | ES256, exact claims, lifetime/skew |
| JWKS cache | `apps/api/src/portal/portal-jwks.service.ts` | fixed URL, TTL, timeout, blocked kids |
| Profile service | `apps/api/src/portal/portal.service.ts` | `endemion_sub` lookup, counts |
| Audit | `apps/api/src/portal/portal-audit.service.ts` | structured events without tokens/raw sub |
| Cache middleware | `apps/api/src/portal/portal-cache.middleware.ts` | `private, no-store` before guards |
| Config | `apps/api/src/config.ts` | fail-fast validation, disabled by default |
| Shared type | `packages/shared/src/views.ts` | `PortalProfileView` |

### Disabled behavior

`PORTAL_INTEGRATION_ENABLED=false` (default) means:

- `/api/portal/profile` returns `404 NOT_FOUND`;
- `Cache-Control: private, no-store`;
- no JWKS fetch, no database lookup, no key requirement;
- the rest of the API is unchanged.

### Enabled behavior

With `PORTAL_INTEGRATION_ENABLED=true`:

- missing/malformed bearer → `401 UNAUTHORIZED`;
- invalid signature/claims → `401 INVALID_TOKEN`;
- expired token beyond 30 s skew → `401 TOKEN_EXPIRED`;
- valid token without a linked player → `404 NO_LIFE_PROFILE`;
- valid linked token → `200` minimal profile;
- per-`sub` limit → `429 RATE_LIMITED`;
- Redis outage skips the per-`sub` limit but does not fail the request.

## 3. Required Life environment

| Variable | Value |
|---|---|
| `PORTAL_INTEGRATION_ENABLED` | `true` only after Portal JWKS is verified |
| `PORTAL_JWT_ISSUER` | `https://endemion.online` |
| `PORTAL_JWT_AUDIENCE` | `https://life.endemion.online` |
| `PORTAL_JWKS_URL` | `https://endemion.online/.well-known/jwks.json` |
| `PORTAL_JWKS_CACHE_TTL_SECONDS` | `300` |
| `PORTAL_JWKS_TIMEOUT_MS` | `3000` |
| `PORTAL_JWKS_MIN_REFRESH_MS` | `10000` |
| `PORTAL_JWKS_BLOCKED_KIDS` | empty unless emergency |
| `PORTAL_SUBJECT_RATE_LIMIT_PER_MINUTE` | `60` |

Production startup rejects non-HTTPS issuer/audience/JWKS URLs.

## 4. Security properties

- ES256 only; `none`, HS256 and other algorithms are rejected.
- `kid` pattern is bounded; JWKS URL is fixed in config and never read from the token.
- JWKS accepts only EC P-256, `alg=ES256`, `use=sig`, 32-byte coordinates, max 32 keys.
- Exact `iss` and single-string `aud`; array audience rejected.
- Exact `scope=portal:read`; canonical UUID `sub`; mandatory `jti`.
- Token lifetime ≤120 s, clock skew 30 s.
- `jti` is audited but **not single-use**; a captured token can be replayed inside its
  short window. TLS is the primary control.
- `sub` is hashed for logs; tokens, raw `sub` and key material are never logged.
- Profile response is `private, no-store`.
- Only `GET /api/portal/profile` exists; no write path.

## 5. Verification

| Check | Result |
|---|---|
| API unit suite (including 39 portal tests) | **74/74 passed** |
| New AppModule e2e: disabled route 404 + no-store | passed |
| New AppModule e2e: enabled missing bearer 401 | passed |
| New AppModule e2e: enabled malformed bearer 401 | passed |
| API typecheck | passed |
| Portal production JWKS check | `503` (disabled) |

The e2e tests prove the feature is wired through `AppModule`, not only through the
controller test module.

## 6. Activation record (completed 2026-11-14)

Production activation was completed with the Portal key stored only in the Portal
server `.env` (mode 600, backed up root-only outside the repository).

| Step | Evidence |
|---|---|
| Portal key generated (ES256, P-256) | `kid=life-2026-11`; private key never printed or committed |
| Portal app recreated | `endemion-app-1` healthy |
| Portal JWKS | `200`, one EC P-256 key, `alg=ES256`, `use=sig`, no `d` |
| Life compose passes `PORTAL_*` | commit `3f35fdc`, production HEAD `3f35fdc` |
| Life health | `/api/health` 200, DB/Redis up |
| Life portal route, no token | `401 UNAUTHORIZED`, `Cache-Control: private, no-store` |
| Life portal route, malformed token | `401 INVALID_TOKEN`, no-store |
| API logs | `PortalController {/api/portal}` mapped; expected `portal.auth.failed` reasons `missing_authorization`, `malformed`; no config/JWKS/startup errors |
| Containers | all seven `endemion-life-prod-*` healthy |

The full `200` profile response was **not** smoke-tested with a real Endemion ID session
because no disposable production identity was available. The 401/404/429 contract is
covered by unit and AppModule e2e tests; a joint 200 smoke remains an operational
follow-up.

### Historical prerequisites (all completed)

1. Portal: generate an ES256 signing key offline and store it in the production secret
   store. Do not put it in git or chat.
2. Portal: set `ENDEMION_LIFE_ASSERTION=1`, `ENDEMION_LIFE_JWT_KID`, and
   `ENDEMION_LIFE_JWT_PRIVATE_KEY`.
3. Portal: deploy and verify
   `https://endemion.online/.well-known/jwks.json` returns `200`, one or more public
   keys, `alg=ES256`, `use=sig`, and **no `d` field**.
4. Life: deploy this dark code and confirm `/api/portal/profile` still returns `404`.
5. Life: set `PORTAL_INTEGRATION_ENABLED=true` and the exact issuer/audience/JWKS
   values; restart.
6. Joint smoke test with a designated Endemion ID test account:
   `200`, correct display name and life counts; no internal identifiers in the body.
7. Verify `401`, `404 NO_LIFE_PROFILE`, `429`, and disabled `404`.
8. Observe `portal.auth.*` and Portal `life.*` events for at least 5 minutes.

## 7. Rollback

1. Set `PORTAL_INTEGRATION_ENABLED=false` on Life; endpoint returns 404.
2. Optionally disable Portal issuance (`ENDEMION_LIFE_ASSERTION=0`); JWKS returns 503.
3. If a key is compromised, add its `kid` to `PORTAL_JWKS_BLOCKED_KIDS` before the code
   rollback.
4. No database migration or data cleanup is required.

## 8. What is explicitly not included

- Portal UI widget/page that calls `requestLifeProfile`.
- Write operations, life creation, or character control from the Portal.
- Single-use `jti` replay protection.
- Staging environment.
- A verified production `200` profile smoke with a disposable Endemion ID session.
