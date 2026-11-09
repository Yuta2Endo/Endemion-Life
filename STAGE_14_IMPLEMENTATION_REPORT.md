# Stage 14 Implementation Report

## Implementation summary
Stage 14 is a validation and analysis stage: no gameplay code was changed, no balance constants were modified, no save schema migrations were introduced, and `SAVE_SCHEMA_VERSION` remains 8. The work performed:
- Re-ran the full local validation suite (build order, typecheck, lint, all unit tests, production build) on the current working tree and recorded exact commands/exit codes/counts.
- Installed Playwright Chromium locally, started Postgres + Redis via `pnpm infra:up`, applied migrations to the **local throwaway database only**, built API + web, and ran the full Playwright E2E suite.
- Conservatively reviewed the pre-existing `react-hooks/exhaustive-deps` warning on `perform`; decided **not** to change the code.
- Documented the succession limitation analysis (design only; no implementation).

## Files changed
- Created `STAGE_14_AUDIT_REPORT.md`.
- Created `STAGE_14_IMPLEMENTATION_REPORT.md` (this file).
- Created `STAGE_14_NEXT_STAGE.md`.
- No source files were modified.

## Clean-checkout / CI validation evidence
True clean-checkout / CI validation was **not performed** in this environment (limitation recorded below). Local validation was executed on the current working tree (which contains uncommitted Stage 12–13 changes) using the repository's own scripts and the documented dependency order:

| # | Command | Exit status | Result / counts |
|---|---|---|---|
| 1 | `pnpm typecheck` | 0 | build:packages + `tsc --noEmit` for database, game-core, shared, ui, api, web — all clean |
| 2 | `npx eslint .` (root lint) | 0 | no problems (android build output ignored; stage01 prefer-const fixed in Stage 13) |
| 3 | `pnpm --filter @endemion/web lint` | 0 | exit 0, 1 pre-existing warning (`play-screen.tsx:170`) unchanged |
| 4 | `npx vitest run` (game-core) | 0 | 35 files / 434 tests passed (re-run stable: Stage 13 soak passed 3×/3) |
| 5 | `pnpm --filter @endemion/shared test` | 0 | 2 files / 12 tests passed |
| 6 | `pnpm --filter @endemion/web test` | 0 | 2 files / 9 tests passed |
| 7 | `pnpm --filter @endemion/api test` | 0 | 3 files / 18 tests passed |
| 8 | `pnpm --filter @endemion/web build` | 0 | Next.js production build OK |
| 9 | `pnpm --filter @endemion/api build` | 0 | NestJS build OK |

The full `pnpm check` equivalent (lint + typecheck + test + build) passes. Encoding of touched/report files verified UTF-8 without BOM and without U+FFFD.

**Clean-checkout limitation:** A true clean checkout (`git stash`/`checkout` + `pnpm install --frozen-lockfile` + CI) could not be performed because (a) the working tree holds uncommitted user work that must be preserved and must not be committed, and (b) GitHub Actions workflows (`ci.yml`, `deploy.yml`) cannot be triggered from this environment. Local results are therefore labelled "local working-tree validation," not clean-checkout/CI validation.

Build-order note confirmed from `ci.yml`: `pnpm build:packages` must run before `pnpm lint` / `pnpm typecheck` / web & shared tests, because typed ESLint and workspace `dist` resolution depend on package build output.

## E2E status
- Executed: `pnpm test:e2e` (`playwright test`) in `apps/web`.
- Prerequisites satisfied locally: Docker Compose (`pnpm infra:up` → Postgres 18 + Redis 8 healthy), `pnpm db:migrate` (applied to local DB only; migrations `stage15_live`, `stage16_insights`), Playwright Chromium installed, API + web built, `.env` present (`DATABASE_URL`; contents not read).
- webServer in `playwright.config.ts` auto-started api (`:4000`) and web (`:3000`).
- Result: **62 passed, 0 failed, exit code 0** (desktop + mobile projects).
- Coverage includes `apps/web/e2e/game.spec.ts` with the Stage 12 world-summary assertions (`world-panel`, `world-summary`, `world-summary-settlements`, `world-settlement`, mobile scroll check) — all passed.
- E2E is run by CI in `ci.yml` job `e2e` (service containers postgres:18 + redis:8, `playwright install chromium`, `pnpm test:e2e`).
- Local Postgres/Redis stack was stopped afterward (`pnpm infra:down`).

## React hook warning — decision
- Location verified: `apps/web/src/components/play/play-screen.tsx`, `useEffect` at line ~170 with deps `[life, busy]`, body calls `perform({ type: "advance" })` after a `setTimeout`.
- `perform` is a plain `async function` declared in the component body, so it gets a new identity on every render.
- Adding `perform` to the dependency array would cause the effect to re-run on every render, repeatedly rescheduling the timer — incorrect behavior.
- Correct fix would require wrapping `perform` in `useCallback` with its own dependency list (life, busy, store, load, router, etc.), a broader refactor outside Stage 14 scope and with behavior risk.
- Decision: **warning left unchanged**, documented as pre-existing. `pnpm --filter @endemion/web lint` exits 0 with this single pre-existing warning.

## Succession limitation — design analysis
Actual age constraints (source locations):
- `common.heir` event (`packages/game-core/src/narrative/common.ts`): `minAge 20`, `maxAge 45`, `cooldown 4`, `maxOccurrences 2`, condition `when.flag("married")`; creates player's child via `fx.npc("child")`.
- `common.first-love` (`common.ts`): `minAge 15`, `maxAge 30`, `maxOccurrences 1`; creates `partner` + schedules `common.love-test` (marriage) in 3 years.
- `legacy.marriage-alliance` (`packages/game-core/src/legacy/stories.ts`): `minAge 17`, `maxAge 35`, requires `when.married(false)` and `when.standing(2)`; generation-2 legacy event.
- `succeed` / `heirCandidates` (`packages/game-core/src/legacy/succession.ts`): blood relations only; law `controlAge`; optional regency.
- NPC yearly reproduction (`npc-life.ts`): mother age 17–44, `MAX_CHILDREN = 4`; child roles stop reproducing at `descendant`/`relative` (not in `FAMILY_MAKERS`).

Why long-lived lineages stall:
- Worlds such as isekai (~213 y), xianxia (~126 y), academy (~131 y) have lifespans far above the 45-year player reproduction cap. An heir older than 45 can never sire another heir via player events; NPC reproduction is capped and the role chain stops producing blood relatives after `descendant`/`relative`.
- Stage 13 deterministic realistic chains (family-prioritizing policy, best-kin heir selection): dark-fantasy 10, hunter 9, isekai 8, murim 5, academy 3, xianxia 1 generations. Only dark-fantasy reaches 10.
- Behavior appears intentional (lineage fragility by design) but is a gameplay concern for very long-lived worlds.

Proposals (design only, **not implemented**): extend `common.heir` maxAge / allow older reproduction, add an adoption path, or relax NPC role-chain reproduction. Each would require gameplay/balance decisions, possible save-format impact, and must keep `SAVE_SCHEMA_VERSION = 8` with no new persisted fields unless a migration is explicitly planned. None are in Stage 14 scope.

## Remaining issues and limitations
- Production deployment performed and verified (see Deployment details).
- Pre-existing web `react-hooks/exhaustive-deps` warning left unchanged.
- Local E2E DB received `stage15_live` / `stage16_insights` migrations; these are **not** part of Stage 14 and must not be applied to production.

## Deployment details
- Target: `https://life.endemion.online`, server directory `/opt/endemion-life`, host `185.175.156.196`, Compose project `endemion-life-prod`, behind-proxy behind Caddy.
- Documented procedure: `docs/DEPLOYMENT.md`, `docs/GITHUB_ACTIONS_DEPLOYMENT.md`, `infrastructure/deploy/deploy.sh` / `rollback.sh` / `health-check.sh` / `status.sh`. CI path: `deploy.yml` builds migrate/api/web/nginx images on the runner, uploads via SSH, pushes code via git bundle, runs `deploy SHA` (backup → switch code → tag `:SHA` → `:latest` → `up --no-build` → migrate → health check → auto-rollback without migrations). Manual path: `docker compose -f infrastructure/docker-compose.prod.yml ... build && up -d` on the server.
- Rollback method: `deploy.yml` operation `rollback` or `sh /opt/endemion-life-deploy/rollback.sh [SHA]`; DB restore via `docs/DATABASE_BACKUPS.md` if needed.

### Deployment result (performed successfully)
Deployment **was performed successfully** to `https://life.endemion.online` (server `/opt/endemion-life`, host `185.175.156.196`) using the established manual procedure (build images locally → `upload-images` → `upload-bundle` → `deploy SHA`), after confirming SSH access via `C:\Users\sasha\.ssh\endemion_life_deploy`.

- Target: `https://life.endemion.online`, Compose project `endemion-life-prod`, behind-proxy mode behind Caddy.
- Deployed version: `c7951d008c51816f488b9aa8e3dbb4e3c56e05e6` (local `main` HEAD, validated in Stage 14).
- Deployment timestamp: 2026-11-08T17:26:45Z – 17:27:28Z UTC.
- Procedure: `verify_release_images` → DB backup (`endemion_life-manual-20261108T172647Z.dump`) → `switch_code` forward → `activate_images` (`:<SHA>` → `:latest`) → `up -d --no-build migrate api web nginx` → `check_migrate` → wait healthy → `health-check.sh`.
- Smoke checks: `/api/health` → `{"status":"ok","database":"up","redis":"up"}`; `/`, `/worlds`, `/api/universes` → HTTP 200; home page renders all six worlds; all containers healthy.
- Rollback: previous release `1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28` retained; images present for rollback.
- No commit, no push (working-tree Stage 12–13 changes intentionally left uncommitted).
- `SAVE_SCHEMA_VERSION` remains 8; no migrations applied (none changed between `1c5bb416` and `c7951d0`).

Deployment status: **DEPLOYED AND VERIFIED**.
