# Stage 05 — Release Record

**Stage:** 05 — Multiplayer Foundation
**Status:** **COMPLETE LOCALLY; NOT COMMITTED, NOT PUSHED, NOT DEPLOYED**
**Date:** 2026-11-14
**Repository:** `G:\III\endemion-life`
**Branch:** `main`
**HEAD at verification:** `0feb6d9` (Stage 03 docs commit)
**Production:** Stage 04, code `cf7d098`, docs HEAD `9a06aad`, save schema 14

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
- Production remains at 11 migrations and schema 14 until an approved deploy.

## 5. Production deployment plan (not executed)

1. Obtain explicit owner approval for Stage 05 deployment.
2. Take a fresh manual backup and perform a trial restore; record counts and checksum.
3. Verify disk free space is above the deploy threshold (7048 MB).
4. Commit Stage 05 with a **portal-free** `app.module.ts`:
   - exclude `.env.example`, `apps/api/src/config.ts`, `apps/api/src/portal/`;
   - preserve them in the working tree afterwards;
   - exclude 74 Stage 11 reports and the blueprint docx.
5. Push `main`; wait for CI and Security success.
6. Run the deploy workflow with `allow_migrations=true`; if automatic deploy lacks the
   migration flag, cancel and use the approved manual migration path.
7. Verify:
   - production HEAD and clean checkout;
   - 12 migrations;
   - all seven containers healthy;
   - `/api/health` 200 with DB/Redis up;
   - `/worlds` 200 and SSE route stays open;
   - two disposable accounts see presence and receive a contribution event;
   - export omits secrets; deletion cascades a disposable account;
   - no `INVALID_SAVE`, migration, or unhandled errors in API logs.
8. Record deployment history and rollback target.

Rollback target before any Stage 05 DB writes: `cf7d098`/`9a06aad` (schema 14). The
Stage 05 migration is additive, so an application rollback can generally leave the
tables in place; confirm with the release owner before rollback.

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
- No production access, deployment, or migration was performed in Stage 05.
- No commit or push was performed.

## 8. Current worktree

HEAD `0feb6d9`. Stage 05 source, tests, migration, docs, and web/infrastructure changes
are uncommitted. Pre-existing portal modifications:

- `.env.example`
- `apps/api/src/app.module.ts`
- `apps/api/src/config.ts`
- `apps/api/src/portal/`

plus 74 untracked `STAGE_11_*` reports and
`docs/Endemion_Life_Development_Blueprint_RU.docx`.

The Stage 05 commit must not include any portal-only file or configuration.
