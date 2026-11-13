# Stage 05 — Release Record

**Stage:** 05 — Multiplayer Foundation
**Status:** **COMPLETE; COMMITTED, PUSHED, DEPLOYED**
**Date:** 2026-11-14
**Repository:** `G:\III\endemion-life`
**Branch:** `main`
**Release code:** `9daaec2`
**Previous release:** `cf7d098` (Stage 04)
**Production:** `9daaec2`, 12 migrations, save schema 14

## 1. What Stage 05 adds

Stage 05 introduces the minimum trusted multiplayer foundation without changing the
existing solo game loop:

- guest vs account boundary for shared systems;
- Redis-backed presence per universe;
- account-only SSE world stream;
- idempotent, season-scoped shared-world contribution;
- account export and deletion;
- player reports (moderation evidence);
- web presence/online roster and contribution UI;
- Nginx SSE passthrough;
- additive Prisma migration for contributions and reports.

The shared world remains a separate projection. `SAVE_SCHEMA_VERSION` stays **14**;
no `GameState` field was added and no save migration was written.

## 2. Files delivered

### API

| File | Change |
|---|---|
| `apps/api/src/presence/presence.service.ts` | new: Redis presence, TTL, online roster, notification emitter |
| `apps/api/src/presence/presence.controller.ts` | new: heartbeat, online, SSE stream |
| `apps/api/src/world/world.service.ts` | contribution transaction, replay, audit, project updates |
| `apps/api/src/world/world.controller.ts` | account-only contribution route |
| `apps/api/src/session/session.service.ts` | `requireAccount` |
| `apps/api/src/auth/auth.service.ts` | export/delete account |
| `apps/api/src/auth/auth.controller.ts` | export/delete routes |
| `apps/api/src/social/social.service.ts` | report creation |
| `apps/api/src/social/social.controller.ts` | report route |
| `apps/api/src/app.module.ts` | presence wiring; also contains pre-existing portal wiring that must stay out of the commit |
| `apps/api/test/helpers.ts` | truncate new tables |
| `apps/api/test/stage05.e2e-spec.ts` | 9 new e2e tests |

### Prisma

| File | Change |
|---|---|
| `packages/database/prisma/schema.prisma` | `WorldContribution`, `PlayerReport`, relations |
| `packages/database/prisma/migrations/20261114130000_stage05_multiplayer/migration.sql` | additive tables, indexes, FKs; widens world command/audit actor to 64 |

### Shared

| File | Change |
|---|---|
| `packages/shared/src/views.ts` | `ACCOUNT_REQUIRED`, `ALREADY_CONTRIBUTED`, `WORLD_CONFLICT` |

### Web

| File | Change |
|---|---|
| `apps/web/src/components/world/world-participation.tsx` | new: presence, SSE, online list, contribution form |
| `apps/web/src/components/world/shared-world-panel.tsx` | integrate participation, refetch on events, remount per world |
| `apps/web/src/lib/messages.ts` | RU/EN presence/contribution keys |

### Infrastructure

| File | Change |
|---|---|
| `infrastructure/nginx/snippets/app.conf` | exact SSE location with buffering/cache/gzip off and long timeouts |

### Docs

- `docs/stage-05/IMPLEMENTATION_PLAN.md`
- `docs/stage-05/API_CONTRACT.md`
- `docs/stage-05/PRESENCE_AND_SSE.md`
- `docs/stage-05/SECURITY_AND_MODERATION.md`
- `docs/stage-05/RELEASE_RECORD.md` (this file)
- `docs/stage-05/STAGE_05_REPORT.md`

## 3. Verification

| Check | Command | Result |
|---|---|---|
| game-core | `pnpm --filter @endemion/game-core test` | **775/775 passed**, 53 files |
| shared | `pnpm --filter @endemion/shared test` | **18/18 passed**, 2 files |
| API unit | `pnpm --filter @endemion/api test` | **74/74 passed** |
| API e2e | `pnpm test:api` | **132/132 passed**, 15 files, 75.6s |
| Web unit | `pnpm --filter @endemion/web test` | **25/25 passed**, 8 files |
| Typecheck | `pnpm typecheck` | pass (all packages) |
| Lint | `pnpm lint` | 0 errors, 1 pre-existing warning (`play-screen.tsx:173`) |
| Web build | `pnpm --filter @endemion/web build` | pass, 12 routes, `/worlds` dynamic |

Expected log noise during API e2e:

- `injected history failure` → intentional transaction-rollback test;
- `/api/health` 503 and game POST 503 → intentional Redis-down fail-closed test;
- `Повреждённое состояние общего мира` → intentional corrupted-state rollback test.

No unexpected failures, no unhandled rejections attributed to Stage 05.

## 4. Migration state

- Local and test DB have **12** applied migrations.
- `20261114130000_stage05_multiplayer` is additive:
  - creates `world_contributions` and `player_reports`;
  - adds unique/index constraints;
  - widens `world_commands.actor` and `world_audits.actor` to `VARCHAR(64)`;
  - no `DROP`, `DELETE`, `TRUNCATE`, or data rewrite.
- Production now has **12** applied migrations after the Stage 05 deploy.

## 5. Production deployment (executed)

1. Owner approved Stage 05 deployment.
2. Fresh backup `endemion_life-manual-20261113T224407Z.dump` (10 MB) passed checksum,
   table-of-contents verification, and a full trial restore: 11 migrations, 18 players,
   45 lives, 1,716 snapshots, 8,344 history, 5,610 actions. Uploaded externally.
3. Disk free space was 9.2 GB, above the 7048 MB threshold.
4. Stage 05 was committed with a portal-free `app.module.ts`; portal-only files and the
   74 Stage 11 reports/blueprint docx stayed out.
5. Commits pushed:
   - `b6db176` — `stage-05: add multiplayer foundation`;
   - `40b5fa5` — first actor schema alignment;
   - `9daaec2` — final audit actor schema alignment (release SHA).
6. CI run **43522651518: success**; Security run **43522651419: success**.
7. Manual Deploy run **43523555168: success**, dispatched with
   `allow_migrations=true`; duplicate auto Deploy run 43523418592 cancelled.
8. Production verification:
   - `/opt/endemion-life` HEAD `9daaec2b763fb093f67a947d936eb8f33d51cee6`, clean;
   - deploy history `23:03:37Z deploy-start 9daaec2 from cf7d098` →
     `23:04:05Z deploy 9daaec2 ok`;
   - PostgreSQL **12 migrations**; `world_contributions` and `player_reports` exist;
   - all seven containers healthy;
   - public `/api/health` 200 with DB/Redis up;
   - `/api/world` 200;
   - `/api/presence/stream` returns 401 without an account (route exists, not 404);
   - no `INVALID_SAVE`, migration, or unhandled errors in post-deploy logs.

Password registration is disabled in production (`410 USE_ENDEMION_ID`), so the
two-account authenticated presence/SSE smoke was **not executed**; it requires a
disposable Endemion ID account. Public route, auth gate, migration, and health checks
passed.

Rollback target: `cf7d098` (Stage 04, schema 14). The Stage 05 migration is additive,
so an application rollback can leave the tables in place; confirm with the release
owner before rollback. Rollback to schema 13 requires a database restore.

## 6. Risks and limitations

| Risk | Severity | Notes |
|---|---|---|
| SSE fan-out is in-process | P2 | Multiple API replicas need Redis Pub/Sub; current production is one API container |
| No SSE replay / `Last-Event-ID` | P2 | Client refetches full world on each event and reconnect |
| No report moderation queue | P2 | Reports are write-only for staff; manual DB review |
| No per-account SSE connection cap | P2 | Add before public launch |
| Contribution replay returns current state | P3 | Effect is not duplicated; response may differ from historical state |
| No CSRF token | P3 | Existing same-origin/JSON/SameSite controls remain |
| Web participation lacks component test | P3 | Covered by typecheck/build and API e2e, not rendered interaction |
| Portal integration still uncommitted | Release blocker | Must remain outside this release |
| Android signing/Play compliance | External blocker | Unchanged from Stage 01 |
| Two moderate Dependabot alerts | External | Unchanged |

## 7. Preservation rules verified

- Six universes unchanged.
- `packages/game-core` remains pure and deterministic; Stage 05 did not modify it.
- No save schema change; schema remains 14.
- Portal files remain untouched and uncommitted.
- 74 Stage 11 reports and the blueprint docx remain untracked.
- Production was backed up, migrated, and deployed; verification is recorded in §5.
- Stage 05 commits were pushed; release SHA `9daaec2`.

## 8. Current worktree

HEAD `9daaec2`. Stage 05 source, tests, migration, docs, and web/infrastructure changes
are committed and deployed. Remaining working-tree changes are the pre-existing portal
integration:

- `.env.example`
- `apps/api/src/app.module.ts`
- `apps/api/src/config.ts`
- `apps/api/src/portal/`

plus 74 untracked `STAGE_11_*` reports and
`docs/Endemion_Life_Development_Blueprint_RU.docx`.

The Stage 05 release commit did not include any portal-only file or configuration.
