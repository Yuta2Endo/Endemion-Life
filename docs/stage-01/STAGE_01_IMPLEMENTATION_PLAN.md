# STAGE 01 Implementation Plan

**Status:** completed as planned, with documented blockers  
**Scope:** stabilization only; no new gameplay, save schema change, multiplayer, or production deployment.

## 1. Baseline

| Area | Audit baseline | Verified before changes |
|---|---|---|
| Git | `main`, HEAD `cda9a39`, `origin/main` `c7951d0`, 3 ahead | Same |
| Production | `ca72b8b` (audit evidence) | Not contacted for writes |
| game-core | 606/609 | 606/609: one provenance failure, two 5s timeouts |
| API unit | 74/74 | 74/74 |
| Shared | 12/12 | 12/12 |
| API e2e | not run | Requires PostgreSQL/Redis; run in this stage |
| Web E2E | not run | Requires built app + API; run in this stage |
| Android | not buildable from clean checkout | Confirmed missing Capacitor deps/lock entries |

## 2. Execution order

1. **Safety and provenance** — record Git state; preserve portal work and untracked reports.
2. **A. Data integrity** — live claim/restore, guest merge, dynasty provenance.
3. **B. Security** — OIDC grace, block ownership, link race, alive cap, import bounds, rate policy, CSP.
4. **C. Portal decision** — preserve, document, do not integrate or deploy without owner approval.
5. **D. Frontend** — Dossier, overflow, loading/error states.
6. **E. Android** — dependencies, reproducible sync/build, safe area, local-mode block.
7. **F. Tests/docs** — regression coverage, schema 5–8 fixtures, reconcile live docs.

## 3. Design decisions

### Live rewards are irreversible across restore

A live claim is account-level history, not a branch of a save. Restoring a save must not erase the fact that a reward was already paid. On restore:

- `claimedAt` is never cleared.
- Claimed window flags are re-added to the restored state.
- Contributions are never repeated for the same or an earlier life-year.
- Live window progress and part counts are not decremented.

Consequence: restoring to before a claim forfeits the gold for that branch but cannot duplicate it. This is explicit and test-covered, not accidental.

### Rate limiting is fail-closed for game routes

When Redis is unavailable:

- `/api/health` reports `503 degraded`.
- Game mutations return `503 UNAVAILABLE`.
- `/api/auth/*` remains usable through the existing in-memory `AuthThrottle`, so login/registration are not taken down by a Redis outage.

This trades availability for abuse resistance on the game API. The decision is documented in `SECURITY_FIX_REPORT.md`.

### Android is a remote shell, not an offline client

The WebView must not create a locally authoritative life when the API is unreachable. Existing local lives remain readable, but new local lives are blocked in the Android shell with a clear network error.

### Portal remains out of the release

The portal is preserved in place. No deletion, archival, compose change, or deployment was performed. Integration requires product-owner approval and staging verification.

## 4. Out of scope

- Save schema changes or destructive migrations.
- Multiplayer, shared world, player families, guilds, trade, player economy.
- New gameplay content or balance changes.
- Production deployment, database writes, or environment changes.
- Session rotation, `__Host-` cookie migration, nonce-based CSP, and full ops-token separation (documented follow-ups).

## 5. Verification gates

- Every fixed defect has a regression test.
- Existing save formats 5–8 migrate to schema 8 and pass `parseSave`.
- `pnpm lint`, `pnpm typecheck`, game-core, API unit/e2e, shared, web Playwright all pass.
- Android debug APK and release AAB build from the clean dependency graph.
- CSP present on the production build and Playwright still passes.
- No commit, push, or production change.
