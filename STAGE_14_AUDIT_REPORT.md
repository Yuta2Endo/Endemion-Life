# Stage 14 Audit Report — Clean Checkout, E2E & Deployment

## Repository state
- Path: `G:\III\endemion-life`, branch `main`, HEAD `c7951d0` (stage-02 living-world-engine commit). Branch is up to date with `origin/main` (`https://github.com/Yuta2Endo/Endemion-Life.git`).
- Working tree contains **uncommitted changes from Stages 12–13** (22 modified tracked files) plus untracked Stage report files and new test/spec files. These changes are intentionally **not committed** (deployment scope forbids committing).
- `SAVE_SCHEMA_VERSION = 8` (`packages/game-core/src/engine/game.ts:58`) unchanged; no migrations introduced by Stage 14.

## Prior-stage findings relevant to Stage 14
- Stage 13: late-game soak tests pass (434 game-core tests), root `pnpm lint` exit 0, shared 12/12, web 9/9, api 18/18, `pnpm typecheck` and web production build exit 0.
- One pre-existing web warning remains: `apps/web/src/components/play/play-screen.tsx:170` `react-hooks/exhaustive-deps` (missing dependency `perform`). `pnpm --filter @endemion/web lint` exits 0 with 1 warning.
- Realistic succession chains stall in long-lived worlds (see Stage 13 report; analysed below in section "Succession limitation").
- Production was **not opened or changed** (`RELEASE_READINESS_CHECKLIST.md`, 2026-11-05: "Прод не открывался и не менялся").

## CI / test / build workflow
Existing workflows: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/workflows/security.yml`.

`ci.yml` jobs (each a separate step, no `continue-on-error`; Node 24, `pnpm install --frozen-lockfile`):
1. `checks`: build packages → lint → typecheck → unit tests → production build (`pnpm build`).
2. `api`: service containers postgres:18 + redis:8, create test/shadow DBs, `prisma migrate deploy`, `migrate diff --exit-code`, `migrate status`, `pnpm test:api`.
3. `e2e`: `pnpm build`, `pnpm db:migrate`, `playwright install chromium`, `pnpm test:e2e` (Playwright, desktop + mobile).
4. `docker`: build images migrate/api/web/nginx/backup/monitor (no push).
5. `compose`: `docker compose config -q` for prod, behind-proxy, and dev compose files.

`deploy.yml`: gated on green CI + Security on a `main` push, environment `production` with required reviewers, `DEPLOY_AUTO` variable. Builds migrate/api/web/nginx images on the runner, uploads via SSH (`docker save | gzip | ssh upload-images`), pushes code as a git bundle, runs `deploy SHA` on the server (backup → switch code → tag images `:SHA` → `:latest` → `up --no-build` → migrate → health check → auto-rollback on failure without migrations).

## Workspace dependency / build-order concerns (clean checkout)
Correct order matters in a clean clone because built output is not in the repo:
1. `pnpm install --frozen-lockfile` (pnpm 12, lockfile `pnpm-lock.yaml`).
2. `pnpm build:packages` — **must precede** `pnpm lint` and `pnpm typecheck`: typed ESLint reads Prisma Client and workspace package types that exist only under `dist/` after build (`packages/*/exports` → `./dist/index.js`).
3. `pnpm lint` (root `eslint .` + `pnpm --filter @endemion/web lint`).
4. `pnpm typecheck` (`pnpm build:packages && pnpm -r typecheck`).
5. `pnpm test` (unit tests; web/shared tests resolve workspace packages via `dist`, so packages must be built first).
6. `pnpm build` (production builds: api `nest build`, web `next build`).
7. `pnpm test:e2e` additionally requires PostgreSQL + Redis (`pnpm infra:up`), `pnpm db:migrate`, Playwright Chromium (`playwright install chromium`), and a `.env` with `DATABASE_URL`.

`pnpm check` = build:packages + lint + typecheck + test + build.

## E2E setup and prerequisites
- Runner: `apps/web/playwright.config.ts`, `webServer` auto-starts `pnpm --filter @endemion/api start` (health `http://127.0.0.1:4000/api/health`) and `pnpm --filter @endemion/web start` (health `http://localhost:3000`) when `E2E_BASE_URL` is unset.
- Needs: Docker (for `infra:up` Postgres + Redis), built workspace packages, Playwright browsers, local `.env` (`DATABASE_URL`, etc.), `.mail-outbox` for email codes.
- E2E files: `apps/web/e2e/game.spec.ts` (incl. Stage 12 world-summary assertions), `account.spec.ts`, `adventure.spec.ts`, `economy.spec.ts`, `legacy.spec.ts`, `local.spec.ts`, `social.spec.ts`.
- Stage 12 world-summary assertions live in `game.spec.ts:179–191` (`world-panel`, `world-summary`, `world-summary-settlements`, `world-settlement`, mobile scroll check).

## Deployment procedure and rollback
- Target: `https://life.endemion.online`, server `/opt/endemion-life`, host `185.175.156.196`, Compose project `endemion-life-prod`, **behind-proxy mode** behind the existing Caddy site at `/opt/endemion` (ports 80/443 occupied by Caddy).
- Documented procedure: `docs/DEPLOYMENT.md`, `docs/GITHUB_ACTIONS_DEPLOYMENT.md`, `infrastructure/deploy/{deploy,rollback,health-check,status,ssh-gateway,lib}.sh`.
- Deploy flow (CI or manual): verify clean tree + images `:<SHA>` → backup DB (`backup.sh`) → `git checkout -B main SHA` → `docker tag :<SHA> → :latest` for migrate/api/web/nginx → `up -d --no-build migrate api web nginx` → migrate `prisma migrate deploy` → wait healthy → external `health-check.sh` (`/api/health`, `/`, `/worlds`, `/api/universes` via `https://DOMAIN`). On failure without new migrations: automatic rollback to previous release. With new migrations: stop, operator decision.
- Rollback: `deploy.yml` operation `rollback` or `sh /opt/endemion-life-deploy/rollback.sh [SHA]` (code only, no DB changes); DB restore from pre-deploy dump via `docs/DATABASE_BACKUPS.md` (`restore.sh`) if data was corrupted.
- Rollback gate: previous release must already have run on the server; images `:<SHA>` must be present; clean tree required.
- Secrets (not present in this environment): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, variable `DEPLOY_PORT`; environment `production` requires owner review. `DEPLOY_AUTO` controls auto-deploy after green CI.

## Production smoke checks (documented)
- `docs/PRODUCTION_CHECKLIST.md`: DNS resolves, `.env` protected (`chmod 600`, not in Git), all services `healthy` (migrate `Exited (0)`), migrations applied, API log `{"env":"production"}`, no secrets in logs, cookie `HttpOnly/Secure/SameSite=Lax`, HTTPS + HSTS via `check-https.sh`, guest flow (create life → age → refresh persists), registration/login cross-browser, foreign-Origin 403, backups + test restore, monitor alerts, Docker enabled on boot, >5 GB disk, server reboot recovery.
- `docs/ROLLBACK.md`: inspect `docker compose ps` + logs, rollback code or restore DB from pre-deploy copy.

## Proposed Stage 14 scope
1. Clean-checkout / CI validation (local validation performed; true clean-checkout/CI run not possible — see limitations).
2. Web E2E execution — Playwright Chromium was installed locally and the full suite ran.
3. Conservative review of the `play-screen.tsx:170` `perform` warning (no code change; see decision).
4. Succession limitation design analysis (no gameplay changes).
5. Production deployment — performed and verified (see `STAGE_14_IMPLEMENTATION_REPORT.md`).

## Risks and constraints
- **Production access confirmed:** SSH key `C:\Users\sasha\.ssh\endemion_life_deploy` grants access to `root@185.175.156.196` (restricted to `ssh-gateway.sh`: `upload-images`/`upload-bundle`/`deploy`/`rollback`/`status`/`health`). Deployment was performed and verified (see `STAGE_14_IMPLEMENTATION_REPORT.md`).
- **Uncommitted working tree:** Stage 12–13 changes are not committed; CI gate requires a commit on `main` with green CI + Security before deploy. Committing is forbidden by scope.
- **Clean-checkout validation not achievable here:** cannot `git checkout`/reset (would destroy uncommitted user work) and cannot run GitHub Actions. Local validation was performed on the current working tree; this is explicitly distinguished from clean-checkout/CI validation.
- **Local E2E DB:** migrations `stage15_live` / `stage16_insights` were applied to the throwaway local Docker database only; production schema is untouched.
- **Pre-existing web warning** left unchanged (see implementation report); adding `perform` to the effect deps would reset the timer every render.
- **No balance/schema changes:** `SAVE_SCHEMA_VERSION = 8`, no migrations, no new persisted fields.
