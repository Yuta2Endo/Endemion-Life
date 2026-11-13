# STAGE 03 — Release Record

**Date:** 2026-11-14  
**Status:** **COMPLETE LOCALLY — NOT COMMITTED, NOT DEPLOYED**  
**Branch:** `main`  
**HEAD at verification:** `0feb6d9` (`docs: record stage 02 production deployment and rollback`)  
**New Stage 03 commits:** none  
**Save schema:** 14 (Stage 03 working tree; production remains 13)  
**Production code:** `c280c16`  
**Production docs/release:** `0feb6d9`  
**Production save schema:** 13  
**Production deployed:** 2026-11-13 18:59 UTC (STAGE 02 + deployment docs)  
**Rollback:** `8fd0dfc` or `c280c16` (both schema 13); `ca72b8b` only with a database restore.

## Commit table

| Slice | Commit | State | Scope |
|---|---|---|---|
| STAGE 03.1 | — | working tree, not committed | Estate valuation, home in kind, relics, schema 14 |
| STAGE 03.2 | — | working tree, not committed | Social memory, world continuity, synthetic five generations |
| STAGE 03.3 | — | working tree, not committed | Heir agency, primary reason, chronicle/legacy views |
| STAGE 03.4 | — | working tree, not committed | Six inheritance laws, regency, class, meters, blood flags |
| STAGE 03.5 | — | working tree, not committed | Long-run soak, inflation bounds, Stage 03 close-out docs |
| Stage 03 docs | — | working tree, not committed | This record, report, soak document, plan/status updates |

`0feb6d9` is the unchanged base HEAD. No Stage 03 commit, tag, push or deploy was made.

## Deploy table

| Environment | Code | Save schema | Status | Notes |
|---|---|---|---|---|
| Local working tree | `0feb6d9` + uncommitted Stage 03 | 14 | **Not deployed** | Verified locally on 2026-11-14 |
| Production | `c280c16` / docs `0feb6d9` | 13 | **Stage 02** | Deployed 2026-11-13 18:59 UTC |
| Rollback target | `8fd0dfc` or `c280c16` | 13 | Available | `ca72b8b` needs a DB restore |

Stage 03 is **not** in production. No production container, database, Redis, backup or `history.log` was touched.

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
| `git diff --check` | PASS, no output |
| Stage 03.5 CI soak | 12 dynasties, 4 reached generation 5, 8 extinct |
| Stage 03.5 full soak | 60 dynasties, 14 reached generation 5, 46 extinct |
| Full soak wall time | 5,99 s (test file 7,17 s) |

Expected fault-injection 500/503 logs during `pnpm test:api` are not failures.

## What a future deploy would need

1. Owner approval for a Stage 03 commit and deploy.
2. Normal pre-deploy database backup and trial restore.
3. Confirmation that production reads schema 13 saves with the schema-14 code; existing Stage 03 tests cover the 13 → 14 additive migration.
4. A production smoke check after deploy: `/api/health`, `/worlds`, `/api/universes`, one life action, one succession if a suitable live save exists.
5. Rollback plan: return to `8fd0dfc`/`c280c16` (schema 13); no schema-14 writes exist in production yet.

## Preservation

- Portal integration remains uncommitted and outside Stage 03: `.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `apps/api/src/portal/`.
- The `STAGE_11_*` reports and `docs/Endemion_Life_Development_Blueprint_RU.docx` remain untracked and untouched.
- Six universes, existing mechanics and laws are unchanged.
- `game-core` remains deterministic and pure; no new dependencies.
- Save schema stays 14 in the working tree; no new DB migration.
- Only lint cleanup in `stage03-2-estate-relics.test.ts` and `stage03-4-inheritance-laws.test.ts` removed unused imports/variables; test behavior is unchanged.
