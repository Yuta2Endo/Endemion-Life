# Stage 06.1 — Guild Foundation

**Status:** committed and pushed (`ab983f3` → `72c1d42` → `51b1431`); verified locally; **not deployed**.
**Save schema:** 14 unchanged.
**DB migration:** 13th additive migration `20261115090000_stage06_guilds`.
**Scope:** guilds only. No treasury, player trading, chat, shared property or cross-account inheritance.

## 1. Delivered

- Guild per universe, unique case-insensitive name, public or request-only joining.
- Account-only create/list/detail/join. Guests receive `403 ACCOUNT_REQUIRED`.
- Roles: leader, officer, member.
- Join requests, officer/leader accept/reject, kick, leave, leadership transfer, disband.
- One guild per player per universe and a 30-member cap.
- Up to two active guild projects; target 100–10,000.
- Member contributions 1–100 with idempotent `actionId`, project completion and guild reputation +10.
- Append-only guild audit log for create/join/accept/reject/kick/leave/transfer/project/contribution/disband.
- Web `/social` guild panel with account gate, creation, discovery, membership, requests, projects and contribution.
- RU/EN messages and responsive controls.

## 2. API

| Method | Route | Access |
|---|---|---|
| GET | `/api/guilds?universeId=` | account |
| POST | `/api/guilds` | account |
| GET | `/api/guilds/:id` | account |
| POST | `/api/guilds/:id/join` | account |
| POST | `/api/guilds/:id/requests/:requestId/accept` | leader/officer |
| POST | `/api/guilds/:id/requests/:requestId/reject` | leader/officer |
| POST | `/api/guilds/:id/leave` | member |
| POST | `/api/guilds/:id/kick` | leader/officer |
| POST | `/api/guilds/:id/transfer` | leader |
| POST | `/api/guilds/:id/disband` | leader |
| POST | `/api/guilds/:id/projects` | leader/officer |
| POST | `/api/guilds/:id/projects/:projectId/contribute` | member |
| GET | `/api/guilds/:id/audit` | member |

Errors added: `GUILD_NAME_TAKEN`, `GUILD_FULL`, `ALREADY_IN_GUILD`, `GUILD_PROJECT_LIMIT`.

## 3. Data model

Additive tables:

- `guilds` — universe, name/nameKey, description, visibility, leader, reputation.
- `guild_members` — unique `(playerId, universeId)`, role, contributed.
- `guild_join_requests` — unique `(guildId, playerId)`, status/decidedAt.
- `guild_projects` — target/progress/status, max two active enforced in service.
- `guild_contributions` — unique `(playerId, actionId)`, amount.
- `guild_audits` — actor, action, JSON detail.

All guild deletes cascade memberships/projects/requests/audits. Player deletion cascades membership and leadership; a guild led by a deleted player is removed.

## 4. Integrity rules

- Server owns roles and effects; no client-supplied reputation or progress.
- Guild row locks serialize membership changes and contributions.
- Unique membership constraint prevents two guilds per universe under concurrency.
- Project completion is idempotent; a missing/foreign `actionId` returns `409 ACTION_ID_REUSED`.
- Audit entry is written in the same transaction as the mutation.
- No save schema change; guild state is separate from `GameState`.

## 5. Verification

| Check | Result |
|---|---|
| API e2e | **141/141**, 17 files |
| API unit | 74/74 |
| game-core | **775/775**, 53 files |
| shared | **18/18** |
| web unit | **25/25**, 8 files |
| web build | pass, 12 routes |
| Typecheck | pass |
| Lint | 0 errors, 1 pre-existing warning (`play-screen.tsx:173`) |

Stage 06 e2e covers guest denial, duplicate name, public join, request/accept, role denial, kick, project idempotency, reputation once, transfer/leave/disband and audit.

## 6. Limitations

- No guild treasury, currency, shared property, guild levels or alliances.
- No player trading or marketplace.
- No guild chat or notifications.
- No invite flow; request-only guilds are discovered then requested.
- No admin moderation tools for guild names/descriptions.
- No dedicated web unit test for `GuildPanel`; covered by typecheck/build and API e2e.
- No concurrency test for simultaneous public joins beyond DB uniqueness behavior.
- Guild list shows public member names to any signed-in account.

## 7. Release plan

1. ~~Run final lint/typecheck and full test matrix.~~
2. ~~Commit Stage 06.1 with additive migration and docs.~~
3. ~~Push; verify CI and Security.~~
4. Fresh backup and trial restore before migration.
5. Deploy with `allow_migrations=true`; verify 13 migrations, health, guild route account gate, and one create/join/project smoke.
6. Rollback: application rollback is safe; additive guild tables can remain.

## 8. Files

- `apps/api/src/guild/guild.service.ts`
- `apps/api/src/guild/guild.controller.ts`
- `apps/api/src/app.module.ts`
- `apps/api/test/stage06-guilds.e2e-spec.ts`
- `apps/api/test/helpers.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20261115090000_stage06_guilds/migration.sql`
- `packages/shared/src/views.ts`
- `apps/web/src/components/social/guild-panel.tsx`
- `apps/web/src/app/social/page.tsx`
- `apps/web/src/lib/messages.ts`
- `docs/stage-06/STAGE_06_1_REPORT.md`
