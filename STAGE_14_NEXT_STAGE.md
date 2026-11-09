# Stage 14 Next Stage

## Stage 14 completion status (from actual results)
Stage 14 is **complete, including production deployment**:
- Local working-tree validation passed: typecheck 0, lint 0, game-core 434/434, shared 12/12, web 9/9, api 18/18, web build 0, api build 0.
- Playwright E2E: **62 passed, exit 0** (desktop + mobile), including Stage 12 world-summary assertions; Prisma/migrations applied only to the throwaway local Docker database.
- React hook warning: reviewed, **left unchanged** (behavior risk; pre-existing).
- Succession limitation: analysed, design-only, no implementation.
- Production deployment: **DEPLOYED AND VERIFIED** — `https://life.endemion.online` now runs `c7951d008c51816f488b9aa8e3dbb4e3c56e05e6`; `/api/health`, `/`, `/worlds`, `/api/universes` all HTTP 200; pre-deploy backup created; previous release `1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28` retained for rollback.

## Recommended next stage (Stage 15 candidates)

### Technical reliability work (unblock deployment path)
1. **Commit Stage 12–13 changes to `main`** (owner decision) so the CI deploy gate has a green commit. Then run CI (`ci.yml`) and confirm `lint`/`typecheck`/`test`/`build` green on a clean checkout.
2. **Complete clean-checkout / CI validation** from a fresh clone: `pnpm install --frozen-lockfile` → `pnpm build:packages` → `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build`, then `pnpm test:e2e` with service containers. Distinguish this from the local working-tree validation done in Stage 14.
3. **Production deployment** via the documented procedure (`deploy.yml` or manual `deploy.sh`) once access/credentials and a green `main` commit exist. Record: deployed SHA, timestamp, smoke-check results (`/api/health`, `/`, `/worlds`, `/api/universes`, cookie flags, `check-https.sh`), rollback status.
4. **Resolve the pre-existing web `react-hooks/exhaustive-deps` warning** only with a safe `useCallback` refactor of `perform` (behavior-preserving), plus focused unit coverage for the timer effect.
5. **Enable branch protection on `main`** (docs/GIT_WORKFLOW.md) and remove the deploy key from the development machine if no longer needed (docs/GITHUB_ACTIONS_SETUP_REPORT.md, remaining manual steps).

### Gameplay / design proposals (no implementation in Stage 14)
- Long-lived-world succession stall (xianxia 1, academy 3, murim 5 generations vs target 10): decide whether to treat the age-capped player reproduction (`common.heir` maxAge 45, first-love maxAge 30, marriage-alliance maxAge 35) vs lifespans up to ~213 years as intentional or as a gameplay issue.
- If treated as an issue, propose (design only): extend `common.heir` maxAge, add an older-reproduction path, add adoption, or relax NPC role-chain reproduction. Any implementation would need balance decisions, must keep `SAVE_SCHEMA_VERSION = 8`, and must not introduce new persisted fields without an explicit migration plan.

### Optional improvements
- Add Playwright E2E coverage for the world-summary / late-game saturation UI if product wants it monitored.
- Add a focused vitest for the `perform` timer-effect behavior if the warning is ever fixed.

## Paths
- `STAGE_14_AUDIT_REPORT.md`
- `STAGE_14_IMPLEMENTATION_REPORT.md`
- `STAGE_14_NEXT_STAGE.md` (this file)

## Distinction
- Implemented and validated locally: validation suite + E2E.
- Deployed and verified on production: **yes** — `c7951d008c51816f488b9aa8e3dbb4e3c56e05e6`, smoke checks passed, rollback release retained.
- Not executed / blocked: clean-checkout CI run (local working-tree validation only).
