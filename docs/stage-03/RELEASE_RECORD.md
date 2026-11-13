# STAGE 03 — Release Record

**Date:** 2026-11-14
**Status:** **COMPLETE AND DEPLOYED**
**Branch:** `main`
**Stage 03 commit:** `7989731` (`stage-03: complete dynasty and legacy`)
**Save schema:** 14 (code); production saves remain schema 1–9 until their next action
**Production code:** `7989731`
**Production save schema:** 14 engine / existing saves unchanged
**Production deployed:** 2026-11-13 20:40:24 UTC
**Previous production release:** `0feb6d9` (code `c280c16`, schema 13)
**Rollback:** `0feb6d9` / `c280c16` while no schema-14 save has been written; after a schema-14 write, rollback requires a database restore.

## Commit table

| Slice | Commit | State | Scope |
|---|---|---|---|
| STAGE 03.1 | `7989731` | committed and deployed | Estate valuation, home in kind, relics, schema 14 |
| STAGE 03.2 | `7989731` | committed and deployed | Social memory, world continuity, synthetic five generations |
| STAGE 03.3 | `7989731` | committed and deployed | Heir agency, primary reason, chronicle/legacy views |
| STAGE 03.4 | `7989731` | committed and deployed | Six inheritance laws, regency, class, meters, blood flags |
| STAGE 03.5 | `7989731` | committed and deployed | Long-run soak, inflation bounds, Stage 03 close-out docs |
| Stage 03 docs | this commit | committed after deployment | Deployment record update |

The implementation and its documentation were committed together as `7989731` (46 files, +4,034/−79). The deployment-record update is a separate docs-only commit and does not change runtime code.

## Deploy table

| Environment | Code | Save schema | Status | Notes |
|---|---|---|---|---|
| Local working tree | `7989731` + docs update | 14 | Verified | Tests and builds green on 2026-11-14 |
| Production | `7989731` | 14 engine | **Stage 03 live** | Deployed 2026-11-13 20:40:24 UTC |
| Previous release | `0feb6d9` / code `c280c16` | 13 | Available | Rollback target while no schema-14 write exists |
| Older rollback | `8fd0dfc` | 13 | Available | Schema 13 |
| `ca72b8b` | schema 8 | — | Not directly compatible | Requires a database restore |

## Deployment evidence

- GitHub CI run **43502558796**: success.
- GitHub Security run **43502558694**: success.
- GitHub Deploy run **43503155937**: success.
- Production `history.log`:
  - `2026-11-13T20:39:55Z deploy-start 7989731... from 0feb6d9...`
  - `2026-11-13T20:40:24Z deploy 7989731... ok from 0feb6d9...`
- All seven production containers healthy: nginx, web, api, backup, monitor, postgres, redis.
- `/api/health` — 200, `status: ok`, database and redis up.
- `/` — 200 with CSP.
- `/worlds` — 200, 103,113 bytes.
- `/api/universes` — 200, all six universes.
- API logs since deploy: no `INVALID_SAVE`, migration failure, unhandled error or ERROR lines.
- Disk after deploy: 22 GB total, 13 GB used, 9.3 GB free.
- Pre-deploy backup: `endemion_life-manual-20261113T203304Z.dump` (10 MB), checksum and catalogue verified, full trial restore passed: 10 migrations, 18 players, 45 lives, 1,716 snapshots, 8,344 history entries, 5,610 actions; uploaded to external storage.

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **767/767**, 52 files |
| `pnpm --filter @endemion/shared test` | **18/18**, 2 files |
| `pnpm --filter @endemion/web test` | **22/22**, 7 files |
| `pnpm --filter @endemion/api test` | **74/74**, 7 files |
| `pnpm test:api` (e2e) | **119/119**, 14 files |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS, 0 errors, 1 pre-existing warning |
| `pnpm --filter @endemion/web build` | PASS |
| Stage 03.5 CI soak | 12 dynasties, 4 reached generation 5, 8 extinct |
| Stage 03.5 full soak | 60 dynasties, 14 reached generation 5, 46 extinct |
| Full soak wall time | 5.99 s (test file 7.17 s) |

Expected fault-injection 500/503 logs during `pnpm test:api` are not failures.

## Schema and rollback caveat

`SAVE_SCHEMA_VERSION` is 14. Migration from 13 to 14 is additive and occurs when an older save is next written. Existing production lives are still schema 1–9 because no player action has rewritten them since deployment.

While production contains no schema-14 life, rollback to `0feb6d9`/`c280c16` (schema 13) is safe. Once any schema-14 save exists, the schema-13 code cannot read it; rollback then requires restoring the pre-deploy backup and losing actions performed after it.

## Preservation

- Portal integration remains uncommitted and outside Stage 03: `.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `apps/api/src/portal/`.
- The `STAGE_11_*` reports and `docs/Endemion_Life_Development_Blueprint_RU.docx` remain untracked and untouched.
- Six universes, existing mechanics and laws are unchanged.
- `game-core` remains deterministic and pure; no new dependencies.
- No new database migration was added.
- Only lint cleanup in `stage03-2-estate-relics.test.ts` and `stage03-4-inheritance-laws.test.ts` removed unused imports/variables; test behavior is unchanged.
