# STAGE 04 — Living Worlds: Release Record

## Status

**COMPLETE AND DEPLOYED.**

- **Code commit:** `cf7d098` — `stage-04: add living shared worlds`
- **Runtime production code:** `cf7d098`
- **Production git HEAD:** `cf7d098` at deployment; a later docs-only commit may advance HEAD without changing runtime code
- **Deployed:** 2026-11-13 21:59:22 UTC
- **Previous release:** `6e2da77` (runtime `7989731`, Stage 03)
- **Save schema:** **14** (unchanged)
- **Database migration:** `20261114120000_stage04_living_worlds` (11th applied migration)
- **Shared-world season at verification:** 1 for all six universes

## Commit table

| Scope | Commit | State |
|---|---|---|
| Shared-world engine and tests | `cf7d098` | committed and deployed |
| Prisma schema + additive migration | `cf7d098` | committed and deployed |
| API world read/ops routes | `cf7d098` | committed and deployed |
| Web shared-world panel `/worlds` | `cf7d098` | committed and deployed |
| Stage 04 docs | this docs commit | committed after deployment |

The commit was built with a portal-free `apps/api/src/app.module.ts`; pre-existing portal wiring remains uncommitted in the working tree.

## Deployment evidence

- CI run **43514454702**: success.
- Security run **43514454577**: success.
- Manual Deploy run **43514926901**: success, with `allow_migrations=true`.
- Automatic Deploy run **43514902695** was cancelled because it lacked the migration flag.
- Production `history.log`:
  - `2026-11-13T21:58:53Z deploy-start cf7d098... from 6e2da77...`
  - `2026-11-13T21:59:22Z deploy cf7d098... ok from 6e2da77...`
- Pre-deploy backup: `endemion_life-manual-20261113T215227Z.dump` (10 MB), checksum and catalogue verified, full trial restore passed: 10 migrations, 18 players, 45 lives, 1,716 snapshots, 8,344 history entries, 5,610 actions; uploaded externally.
- Disk before deploy: 9.3 GB free (threshold 7048 MB).

## Production verification

- All seven containers healthy: nginx, web, api, backup, monitor, postgres, redis.
- `/api/health` — 200, `status: ok`, database and redis up.
- `/worlds` — 200, 104,307 bytes.
- `/api/world` — 200, six universes; first lazy-seed request 1.7 s, subsequent requests ~31 ms.
- `/api/world/dark-fantasy` — 200, season 1, 3 settlements, 3 factions, 0 events.
- `/api/world/admin/metrics` without `x-world-ops` — 404, as designed.
- PostgreSQL: **11** applied migrations; six world rows, each season 1.
- API logs: no `INVALID_SAVE`, migration failure, unhandled exception or `ERROR` entries after deployment.
- Save schema remains 14; no life save format changed.

## What was delivered

- Deterministic shared-world engine in `packages/game-core/src/world/shared.ts`:
  - six universes, seeded seasons, canonical checksum;
  - `tick`, admin `event`, settlement and faction commands;
  - replay from command log; strict validation; 40-event cap;
  - goods supply/buy/sell prices;
  - reconciliation against per-life world projections.
- Seven additive Prisma models: `World`, `WorldSeason`, `Settlement`, `Faction`, `WorldEvent`, `WorldCommand`, `WorldAudit`.
- Public API: `GET /api/world`, `GET /api/world/:universeId`, season snapshots and reconciliation.
- Ops API: `POST /tick`, `POST /commands`, replay, metrics; `x-world-ops` is timing-safe and returns 404 when unset, too short or wrong.
- Transactional tick under `pg_advisory_xact_lock(hashtext('world:<universeId>'))`, season snapshot, command journal, audit trail, normalized projections and atomic rollback.
- Web panel on `/worlds`: season, checksum, settlements, factions, goods/prices, recent events; RU/EN.
- Solo life actions do not require a shared-world write; per-life world state remains separate.

## Verification summary

| Check | Result |
|---|---:|
| game-core | **775/775** |
| shared | **18/18** |
| API unit | **74/74** |
| API e2e | **127/127** |
| web | **25/25** |
| typecheck | PASS |
| lint | 0 errors, 1 pre-existing warning |
| web production build | PASS |
| desktop 1440 RU / mobile 390 EN | clean |

The e2e suite covers two independent readers receiving identical world state, concurrent tick serialization, deterministic replay, unauthorized ops, command audit, solo-life independence, reconciliation without life IDs, metrics and atomic rollback after corrupted state.

## Operational notes and limitations

1. **Ops routes are disabled in production** until `WORLD_OPS_TOKEN` is configured (minimum 16 characters). The current production env does not define it, so `/api/world/admin/metrics` correctly returns 404. Enabling it is a separate operational action.
2. **Reconciliation scans alive lives only**, latest 1,000 by `updatedAt`; the response reports total, scanned, aligned, drifted and unreadable counts.
3. **Checksum is a deterministic 32-hex fingerprint**, not a cryptographic signature.
4. **No automatic projection rebuild.** A drift requires an admin command/replay action; the reconciliation report is the detection path.
5. **No retention policy for `world_events`.** At one event per season per world, growth is slow but unbounded.
6. **No Playwright test for the shared-world panel.** Render tests and manual desktop/mobile checks cover it.
7. **Season tick is admin-triggered**, not scheduled. Automatic ticks require a scheduler/worker decision and scoped ops token.
8. **World reads seed all six worlds lazily** on the first list request; this caused a one-time 1.7 s response.

## Rollback

The Stage 04 migration is additive. Rolling back runtime code to `6e2da77`/`7989731` is safe: old code ignores the new tables and `/api/world` routes disappear. The new tables may remain in place. No life save schema changed, so no database restore is required for a Stage 04 code rollback.

## Preservation

- Portal integration remains uncommitted and outside the release.
- 74 `STAGE_11_*` reports and the blueprint docx remain untracked and untouched.
- No new dependencies.
- Six universes and all solo gameplay mechanics are unchanged.
- `game-core` remains deterministic and free of DB/network access.
