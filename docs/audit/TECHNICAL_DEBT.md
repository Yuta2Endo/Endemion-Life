# Endemion Life — Technical Debt Register

**Stage:** 00 — Complete Project Audit  
**Date:** 2026-11-13  
**Baseline:** branch `main`, HEAD `cda9a39`, working tree has 4 modified files and 74 untracked Stage 11.x documents plus `apps/api/src/portal/`  
**Production baseline:** `/opt/endemion-life` at `ca72b8b`  
**Rules:** read-only audit; no production changes, no schema changes, no deployments.

## 1. How to read this register

- **P0** — active critical security/data-loss issue; stop and fix.
- **P1** — release blocker or credible path to player harm/data loss; fix before new feature work.
- **P2** — significant debt that will constrain the target vision; schedule in the next 1–2 stages.
- **P3** — low-risk cleanup, hardening, or documentation correction.
- **Status:** CONFIRMED (observed in code/live system), LIKELY (strong static evidence, not reproduced), NOT VERIFIED.

No P0 issue was proven in this audit. Several P1 issues are latent because the affected feature is unused in production (live windows, portal, Android), but they are still release blockers for the target direction.

## 2. Summary

| Area | P1 | P2 | P3 | Dominant risk |
|---|---:|---:|---:|---|
| Deployment and source control | 2 | 1 | 1 | Production commit is not on `origin/main`; portal work is uncommitted |
| Authentication/security | 2 | 5 | 8 | OIDC revocation gap; fail-open limiting; unencrypted backups |
| Save/data integrity | 2 | 5 | 2 | Live claim duplication via restore; shallow validation; import trust |
| Gameplay architecture | 0 | 7 | 3 | Per-life world, disconnected RPG progression, no player economy |
| Web frontend | 1 | 5 | 2 | Duplicate Dossier grid defect; full-engine bundle; local-mode trust |
| Android | 3 | 2 | 1 | Non-reproducible build; safe areas; Play compliance |
| Testing | 0 | 2 | 1 | No save-fixture v5–v7, no Android/OIDC/live restore e2e |
| Operations | 0 | 2 | 2 | One 1 vCPU/2 GB host; backup encryption; no CSP |
| Documentation | 0 | 1 | 2 | Stale status docs and four conflicting numbering systems |

## 3. Release-blocking debt (P1)

### TD-01 — Production release is not reproducible from GitHub

**Evidence:** local `main` is `cda9a39`, production is `ca72b8b`, `origin/main` remains `c7951d0`. `STAGE_04_5_4_IMPLEMENTATION_REPORT.md` explicitly says `origin/main` was not pushed. The Actions deploy workflow requires the commit to exist on `origin/main` and have green checks.  
**Impact:** a fresh clone cannot reproduce production; disaster recovery depends on one workstation; CI never validated the deployed tree; future contributors cannot see the real code.  
**Fix:** push `1bcf224..cda9a39` after review, tag the release, record the deployed SHA and image digests, and exercise the workflow in a non-production environment. Do not rewrite history.

### TD-02 — Portal integration is uncommitted and not wired into deployment

**Evidence:** `apps/api/src/portal/` is untracked; `app.module.ts`, `config.ts`, `.env.example`, and `packages/shared/src/views.ts` are modified. Production compose passes no `PORTAL_*` variables.  
**Impact:** CI/deploy omits the code; enabling the feature in `.env` has no effect; the Stage 11.2 QA used fake Prisma/Redis, so real-database behavior is unproven.  
**Fix:** commit portal code and tests only after D1–D14 decisions; add compose/env/secret wiring, a staging database test, and a kill switch.

### TD-03 — Live-window claim can be duplicated through save restore

**Evidence:** `live.service.ts` `claim()` grants gold and sets `claimedAt`; `lives.service.ts` `restore()` clears `claimedAt` when the restored state no longer has the live flag (`releaseUndoneClaims`), but does not revert `live_windows.progress` or the part count. Repeating claim → restore → claim duplicates gold.  
**Impact:** economy exploit; shared progress inflation; corrupts the meaning of live participation. Production currently has 0 live windows, so no active loss was observed.  
**Fix:** make rewards part of the immutable action ledger, never revoke claim eligibility on restore (or restore the whole live transaction atomically); add a unique `(windowId, lifeId, claimSeq)` reward key and an e2e test.

### TD-04 — OIDC offline grace does not hard-revoke

**Evidence:** `endemion-id.service.ts:193-225` writes `refreshedAt` before contacting the provider; on provider outage after `OFFLINE_GRACE_MS` it returns `"ended"` for that request but does not set `revokedAt`. `session.service.ts:64-68` treats only that single request as unauthenticated; the next request within `REFRESH_MS` returns `"ok"` from the early return.  
**Impact:** a revoked/blocked identity can retain access indefinitely if it keeps making requests, because one failed check is followed by a fresh “ok” window.  
**Fix:** on grace expiry set `revokedAt`; only advance `refreshedAt` after a definite provider outcome; add a time-controlled test.

### TD-05 — Android build is not reproducible or signable from a clean checkout

**Evidence:** no `@capacitor/*` package in any `package.json` or `pnpm-lock.yaml`; `android/capacitor.settings.gradle` references an orphan `node_modules/.pnpm/...` path; `@capacitor/cli` is absent; release signing needs external keystore env and no keystore is tracked.  
**Impact:** `cap sync`/Gradle cannot be recreated; no signed AAB; Play Store delivery is blocked; docs claiming Android stages complete are unsupported.  
**Fix:** create `apps/android/package.json` with pinned Capacitor 8.6.0, CLI and SystemBars, lock it, add scripts, document signing/Play App Signing, and add a CI build job.

### TD-06 — Desktop play screen renders two Dossiers and breaks the grid

**Evidence:** `play-screen.tsx:337` defines three columns; desktop dossier at `433-435`; mobile dossier wrapper at `439` uses `max-lg:hidden`, which is visible at `lg`; default tab is `event` (`:51`). Four visible grid children appear on every desktop load until the user selects “people”.  
**Impact:** timeline wraps to a second row; duplicated controls; visible layout defect in the core play screen.  
**Fix:** use `lg:hidden` on the mobile wrapper, keep a single Dossier per breakpoint, and add a desktop visual/e2e assertion for one dossier.

### TD-07 — Android enters client-side local mode when the API is down

**Evidence:** `store/index.ts` selects local mode when `/api/health` fails; `local.ts` applies `game-core` in the browser. The Android shell loads the same web app.  
**Impact:** a player can create browser-computed lives and outcomes inside the native app, bypassing server authority and anti-cheat expectations.  
**Fix:** disable local mode in the native shell, or gate it behind an explicit web-only prototype flag; show retry/offline state instead.

### TD-08 — Android Play compliance is not demonstrated

**Evidence:** thin remote-URL WebView (`server.url` in `capacitor.config.ts`), only `MainActivity` and a startup overlay; no account-deletion API/UI found; `allowBackup="true"`; no signed AAB, listing, privacy policy URL, or data-safety form.  
**Impact:** likely rejection as a thin wrapper; account-deletion policy unmet; privacy exposure from backed-up cookies.  
**Fix:** add value (offline shell, notifications, native account management) or ship a TWA; implement deletion and export; set `allowBackup=false` or exclusion rules; prepare Play declarations.

## 4. Data and save debt

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| TD-09 | P1 | Restore doesn't revert action ledger, insights, or live progress | `lives.service.ts` restore path; `game_actions` rows remain; insights are append-only | Treat restore as a new branch; mark undone actions, exclude them from replay; derive live progress from active branch |
| TD-10 | P2 | Replay returns current state, not the state at the original action | `lives.service.ts` replay path returns the locked current row | Store the response snapshot or replay the original action result deterministically |
| TD-11 | P2 | `parseSave` validates deeply but not exhaustively | `save.ts:477-557`; relics/worldInfluence/storyProgress/world contents shallow | Add strict schemas for every optional branch; property-based/fuzz tests |
| TD-12 | P2 | Migration fixtures jump from v4 to v8 | `packages/game-core/test/fixtures` only `saves-v1..v4` | Add real v5, v6, v7 fixtures and round-trip tests; assert no data loss |
| TD-13 | P2 | `migrateV1` silently returns unchanged on invalid shape | `save.ts:71` | Fail fast with a typed `INVALID_SAVE` and diagnostic path |
| TD-14 | P2 | Import trusts client age/version/history and long names | `prepareImport`; `save.ts:506`; `character.name` only non-empty | Bound age/name/version; require provenance or mark imported lives non-competitive; validate before DB write |
| TD-15 | P2 | Corrupt JSON state produces HTTP 500 | `stateOf()` calls `parseSave` on every read | Map save corruption to a typed 409/422 and a recovery path, not a generic 500 |
| TD-16 | P3 | DB `schemaVersion` column is not constrained to `state.schemaVersion` | `schema.prisma` Life | Add consistency check on write and a repair script/report |
| TD-17 | P3 | No v5/v6/v7 fixtures in API import tests | `apps/api/test/fixtures` v1–v3 | Add fixtures for every historical format |

## 5. Security and operations debt

See `SECURITY_AUDIT.md` for full evidence. The highest-impact items:

- P1 OIDC revocation (TD-04).
- P1 portal rollout (TD-02 / S-02).
- P2 guest→account transfer deletes `live_parts` via cascade; contributions and claims can be lost or re-earned.
- P2 social block ownership can be overwritten, enabling block evasion.
- P2 OIDC link race can create a session under another player after a concurrent email link.
- P2 rate limits fail open when Redis is unavailable; only auth has an in-memory fallback.
- P2 alive-life cap TOCTOU across create/import/succession.
- P2 portal JWT `jti` replay (120 s token lifetime).
- P2 unencrypted `pg_dump` backups contain emails, password hashes, refresh-token ciphertext, and game state.
- P3 no CSP; 365-day session with no rotation; shared `LIVE_OPS_TOKEN`; portal no-store path likely mismatched; JWKS redirects; health unthrottled; CORS validation; Sentry exception PII; auth throttle map growth; import CPU; social search index.

## 6. Gameplay architecture debt

| ID | Sev | Finding | Why it matters for the target |
|---|---|---|---|
| TD-18 | P2 | Level/XP is disconnected from content gates | RPG progression has little mechanical consequence; target RPG requires level/skill gates and meaningful rewards |
| TD-19 | P2 | World state, region, market, and world clock are per-life | No shared persistent world; succession resets the world clock |
| TD-20 | P2 | Dynasty social memory resets and NPC network is per-life | Family/dynasty continuity is incomplete across generations |
| TD-21 | P2 | No player-to-player economy, inventory, property, or businesses | Target player-driven economy and social organizations are absent |
| TD-22 | P2 | Narrative content is modest and mostly shared across worlds | Six worlds are mechanically distinct but not content-deep; 75 shared definitions, 20/14/13/13/13/13 world-specific |
| TD-23 | P2 | No guilds, associations, shared projects, or chat | Social layer is friends/block + live goals only |
| TD-24 | P2 | No combat, equipment, or dungeon loop | Target RPG may not require combat, but current loop is event-choice + economy only |
| TD-25 | P3 | Character stats are random 2d5, no point-buy | Player agency in builds is limited |
| TD-26 | P3 | Mastery is display-only, no stat/gold reward | End-of-year objectives lack payoff |
| TD-27 | P3 | Relics are defined but not reachable in normal play | Content dead-end; dynasty inheritance advertises relics |
| TD-28 | P1 | Lineage consequences lose source provenance | `legacy/lineage.ts:53-67` clears `ctx.source` before emitting and uses the consequence id, not `item.src`; `stage01-life-upgrade` fails | Keep the source through `emit` (using `item.src`) and add a provenance assertion for every consequence type |

## 7. Web/frontend debt

- **P1 TD-06** duplicate Dossier/grid.
- P2 full `messages.ts` (58.8 KB) and full `game-core` are in client bundles even for cloud-only users; all dossier panels statically imported.
- P2 every action returns a full `LifeView`; no memoization; autoplay every 650 ms; timeline recomputes.
- P2 no route `loading.tsx`/`error.tsx`, no request timeouts/abort; `LivesList` swallows cloud errors.
- P2 local store serializes full state + up to 50 snapshots + 2000 history entries synchronously; cross-tab last-write-wins.
- P2 E2E tests use random seeds, conditional `test.skip`, no retries, shared DB, no Android/OIDC/save-restore coverage.
- P2 Android safe-area/touch targets: no `viewportFit: cover`, no `env(safe-area-inset-*)`, 26–38 px controls.
- P2 `allowBackup="true"` and no deep links/App Links/push.
- P3 hardcoded English metadata on account/social/insights; unused `PlayGuide`; orphan `/social` and `/insights`; blocked/outgoing ties not rendered.

## 8. Testing debt

**Current coverage:** 42 game-core test files / 609 tests; 7 API unit spec files / 74 tests; 12 API e2e specs / 97 cases; 7 web Playwright specs / 25 tests across desktop and mobile.

**Observed results:** game-core 606/609 passed; one real provenance regression and two 5 s timeouts that pass at 30 s. API unit 74/74 passed. Shared 12/12 passed. API e2e and Playwright were not run in this audit.

**Gaps:**
- No fixture for save schema 5, 6, or 7.
- No automated test for restore→live claim duplication.
- No real PostgreSQL/Redis portal e2e.
- No OIDC offline-grace or link-race test.
- No Android/WebView, safe-area, cookie, or Play artifact test.
- E2E skips can hide missing adventure/economy coverage.
- No load test against production hardware; the existing `LOAD_TEST_REPORT.md` explicitly describes a desktop Docker host.

## 9. Documentation debt

- `PROJECT_STATUS.md` is stale (claims HEAD `c7951d0`, Stage 10 not started, local-only deployment).
- `README.md` points at Stage 01 as current and links a deleted `STAGE_01_5_REPORT.md`.
- `docs/DEPLOYMENT.md` describes save format 5 and six migrations.
- Four numbering systems coexist: old 01–24, second road 01–14, sub-stages 04.1–04.5.4, integration 11.0–11.2.7, plus blueprint 00–08.
- `STAGE_01_5_FINAL_REPORT.md` was deleted in `c7951d0`; `V03_STATUS.md` never existed.
- 74 untracked Stage 11.x reports duplicate decisions; no current overall status document.

## 10. Recommended remediation order

1. **Freeze feature work.** Protect the current production database and push the release history.
2. **Fix P1 correctness:** live claim restore, OIDC revocation, duplicate Dossier, Android reproducibility/local mode.
3. **Make restore a real branch model:** immutable action ledger, branch-aware history, no reward resurrection.
4. **Harden the perimeter:** CSP, session rotation, fail-closed sensitive limits, backup encryption, portal wiring.
5. **Add regression fixtures/tests before touching the save schema.**
6. **Only then start Stage 02 gameplay depth.**

## 11. What must not be “fixed” by rewrite

- The pure deterministic `game-core` and `applyAction` intent boundary.
- The server-authoritative life transaction with row locks, action IDs, and expected versions.
- The six universe modules and per-world inheritance laws.
- The additive migration chain and existing save format 8.
- The same-origin Next.js proxy/cookie model, including the remote-URL Android shell.
- The existing RSC shell, Tailwind design system, and Russian/English content model.

These are working foundations. Debt should be paid down incrementally around them, not replaced with a greenfield architecture.
