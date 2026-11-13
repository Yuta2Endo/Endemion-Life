# STAGE 02 — Release Record

**Date:** 2026-11-14  
**Status:** COMPLETE in repository; not deployed  
**Save schema:** 13  
**Production:** `b634a67` (schema 8)  
**Rollback:** `ca72b8b`

## Commits

| Slice | Commit | Scope |
|---|---|---|
| STAGE 02.1 | `2113ab4` | Health, illness, injury, cause of death; schema 9 |
| STAGE 02.2 | `875f2f1` | Education and career progression; schema 10 |
| STAGE 02.3 | `6ab3384` | Household, property, business; schema 11 |
| STAGE 02.4 | `fcc76f2` | Travel between settlements; schema 12 |
| STAGE 02.5 | `5f26f8e` | Upbringing packages and limited point-buy; schema 13 |
| STAGE 02.6 | `c280c16` | Balance and deterministic 1008-life soak |

All commits are on `main`; `origin/main` is `c280c16`.

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
| full soak | 1008 lives, 51.9s |

Soak metrics and thresholds are in `BALANCE_SOAK.md`; the detailed slice reports are in this directory.

## Deployment state

- CI and Security are green on the Stage 02 commits.
- A Deploy run for `c280c16` is waiting for production environment approval and was **not approved**.
- Production remains on `b634a67` with save schema 8.
- Before deployment, review the schema 8 → 13 migration and take a fresh production backup. Do not deploy without explicit owner approval.

## Preservation

Portal integration remains uncommitted and outside the release: `.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, and `apps/api/src/portal/`. The 74 Stage 11 reports and the blueprint `.docx` remain untracked.
