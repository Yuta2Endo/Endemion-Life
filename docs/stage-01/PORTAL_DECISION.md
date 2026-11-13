# Portal Integration Decision — STAGE 01

**Status:** DEFERRED — product-owner approval required  
**Decision:** **Option B — keep the portal out of the STAGE 01 release.** No portal file was deleted, moved, archived, or deployed.

---

## 1. Current evidence

| Check | Result |
|---|---|
| Portal source | `apps/api/src/portal/` exists only as untracked working-tree code |
| Wiring | `app.module.ts` registers controller/providers/guard; `config.ts` defines `PortalConfig` |
| Env | `.env.example` documents `PORTAL_*`; production compose/env does **not** pass them |
| Production routes | Portal disabled (no `PORTAL_*` in production) |
| Tests | Portal unit specs exist; no e2e against real Prisma/Redis/JWKS |
| Deployment | No staging environment; STAGE 11.2 reports describe plans, not verification |
| Release SHA | Production `ca72b8b` does not contain the portal |

## 2. Option comparison

| | Option A — integrate now | Option B — keep out of release |
|---|---|---|
| Scope | Commit portal code, compose/env, staging, e2e, security review | Leave files/reports untouched; release without portal |
| Risk | High: identity/JWT surface lacks e2e and staging proof | Low: production behavior unchanged |
| Benefit | Portal profile appears in Life | None in STAGE 01; portal can ship later |
| Blockers | Owner approval, JWKS contract, secrets, staging, browser flow, rate limits | None for STAGE 01; working tree remains dirty |

## 3. Why Option B

1. Portal is not needed for any STAGE 01 acceptance criterion.
2. It changes authentication-adjacent behavior and exposes a new public endpoint.
3. It has no real-infrastructure e2e or staging verification.
4. Shipping it would mix a new feature into a stabilization release.
5. The files are preserved; integration can be a dedicated stage.

## 4. Conditions to revisit Option A

- Product owner explicitly approves the portal profile contract.
- JWKS issuer/audience/kid rotation and blocked-kid operations are agreed.
- `PORTAL_*` secrets are provisioned without exposing them in Git.
- Staging is available and portal e2e covers valid, expired, wrong-audience, wrong-issuer, unknown-kid, blocked-kid, replay, and provider-outage cases.
- Security review confirms `jti` replay handling and no-store coverage.

Until then, the portal stays out of the release, and its uncommitted state is recorded in `REPOSITORY_PROVENANCE.md`.
