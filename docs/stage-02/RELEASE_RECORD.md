# STAGE 02 — Release Record

**Date:** 2026-11-14  
**Status:** COMPLETE and deployed  
**Save schema:** 13  
**Production code:** `c280c16`  
**Release/docs commit:** `8fd0dfc`  
**Production HEAD at verification:** `8fd0dfc`  
**Rollback:** `8fd0dfc` or `c280c16` (both schema 13). `ca72b8b` only with a database restore.

## Commits

| Slice | Commit | Scope |
|---|---|---|
| STAGE 02.1 | `2113ab4` | Health, illness, injury, cause of death; schema 9 |
| STAGE 02.2 | `875f2f1` | Education and career progression; schema 10 |
| STAGE 02.3 | `6ab3384` | Household, property, business; schema 11 |
| STAGE 02.4 | `fcc76f2` | Travel between settlements; schema 12 |
| STAGE 02.5 | `5f26f8e` | Upbringing packages and limited point-buy; schema 13 |
| STAGE 02.6 | `c280c16` | Balance and deterministic 1008-life soak |
| Release docs | `8fd0dfc` | Stage 02 close-out record |

All commits are on `main`.

## Verification

| Check | Result |
|---|---|
| game-core | 679/679 |
| API e2e | 118/118 |
| API unit | 74/74 |
| shared | 18/18 |
| web | 20/20 |
| typecheck | PASS |
| lint | PASS, 1 pre-existing warning |
| web production build | PASS |
| CI / Security | success |
| full soak | 1008 lives, 51.9s |

Soak metrics and thresholds are in `BALANCE_SOAK.md`; the detailed slice reports are in this directory.

## Deployment

All Stage 02 commits were deployed sequentially on 2026-11-13:

| UTC | Commit | Result |
|---|---|---|
| 12:48 | `b634a67` | STAGE 01 |
| 13:44 | `7325c8f` | docs |
| 14:25 | `2113ab4` | STAGE 02.1 |
| 15:41 | `875f2f1` | STAGE 02.2 |
| 16:59 | `6ab3384` | STAGE 02.3 |
| 18:13 | `fcc76f2` | STAGE 02.4 |
| 18:37 | `5f26f8e` | STAGE 02.5 |
| 18:42 | `c280c16` | STAGE 02.6 |
| 18:48 | `8fd0dfc` | release docs |

`/opt/endemion-life-releases/history.log` records `current=8fd0dfc`, `previous=c280c16`.

Production verification after the final deploy:

- `/api/health` HTTP 200, database and redis up;
- `/worlds` HTTP 200;
- `/api/universes` HTTP 200, all six worlds;
- CSP active; api/web/nginx healthy;
- no `INVALID_SAVE` or migration errors in the API log sample;
- live save schemas at verification: 1/2/5/8/9; no schema 13 rows yet because no player action occurred after the final deploy. Schema-9 lives are readable by the schema-13 code.

## Backup and rollback

- Pre-deploy manual backup: `/backups/manual/endemion_life-manual-20261113T184449Z.dump`, 10.3 MB.
- Full trial restore passed: 10 migrations, 18 players, 45 lives, 1,716 snapshots, 8,344 history entries, 5,610 actions.
- Backup uploaded to external `backup:endemio/endemion-life/manual/`; `last-success=2026-11-13T18:45:07Z`.
- Immediate rollback targets: `8fd0dfc` (docs-only, schema 13) or `c280c16` (schema 13).
- `ca72b8b` cannot read schema >8. Rolling back to it requires restoring the pre-deploy database backup and accepting loss of actions after that backup.

## Preservation

Portal integration remains uncommitted and outside the release: `.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, and `apps/api/src/portal/`. The 74 Stage 11 reports and the blueprint `.docx` remain untracked.
