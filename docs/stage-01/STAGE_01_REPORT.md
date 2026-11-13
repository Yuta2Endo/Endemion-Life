# STAGE 01 — Core Stabilization, Data Integrity & Release Readiness

**Date:** 2026-11-13  
**Baseline:** STAGE 00 audit, HEAD `cda9a39`  
**Production:** `https://life.endemion.online`, deployed SHA `ca72b8b`  
**Rule:** no production change, no commit, no push, no deploy, no save-schema change.

---

## 1. Executive summary

STAGE 01 fixed the release-blocking data-integrity and security defects identified by the audit without changing the game architecture, save schema, six worlds, or deterministic `game-core`.

The most important fixes:

- Live rewards can no longer be duplicated through claim → restore → claim.
- Guest-to-account login preserves live-window contributions instead of deleting them by cascade.
- Dynasty consequences now retain their original event source.
- OIDC session refresh cannot revive a revoked session after the offline grace period.
- Social blocks cannot be overwritten by the blocked player.
- Account linking is serialized against concurrent identity takeover.
- The 20-alive-life cap is transactionally enforced.
- Imports are bounded and malformed input returns 400/409 instead of 500.
- Rate-limit infrastructure failure now fails closed for game routes, with an auth fallback.
- CSP is active in the production web build.
- The desktop Dossier duplication and mobile horizontal overflow are fixed.
- Android is reproducible, builds a debug APK and an unsigned release AAB, and refuses to create locally authoritative lives offline.

All executable test suites are green: **610 game-core, 74 API unit, 12 shared, 111 API e2e, 62 Playwright**. Typecheck, lint, and production web build pass. Android builds with JDK 21. Production was not touched.

**Stage status: COMPLETED WITH BLOCKERS.** The code and tests are ready for review; release is blocked by repository provenance, portal ownership approval, Android signing/Play compliance, and the absence of a pushed CI run.

---

## 2. Final stage status

**COMPLETED WITH BLOCKERS.**

All mandatory implementation and verification criteria are met except release-only criteria that require owner approval or external accounts:

- The working tree is intentionally dirty and includes the pre-existing portal work.
- Nothing has been committed or pushed, so CI has not run on the Stage 01 tree.
- Portal integration remains a product-owner decision.
- Android release signing, Play Console assets, account-deletion compliance, and device installation are not available in this environment.

No criterion was marked complete from documentation alone.

---

## 3. Implemented fixes

### Data integrity

1. **Live claim/restore duplication** — live participation and claims are irreversible across restore. Restore re-applies claimed window flags and never clears `claimedAt`. Contributions at or before `lastAge` are rejected. Claim remains idempotent.
2. **Guest → account merge** — `live_parts.playerId` is transferred inside the same transaction before the guest player is deleted, preserving count, `lastAge`, and `claimedAt`.
3. **Dynasty provenance** — lineage consequences carry `item.src || item.id` through effects, chronicle, and emitted consequence entries; narrative consequences emit an explicit `sourceEventId`.
4. **History sequence hardening** — actions align `state.nextSeq` to the database `MAX(seq)+1` before writing, preventing stale-save unique collisions from becoming 500s.

### Authentication / security

5. **OIDC offline grace** — `refreshedAt` is advanced as a claim, but rolled back after a transient provider failure. Once `lastOkAt/createdAt` exceeds one hour, the session is revoked and cannot revive.
6. **Social block ownership** — block creation/update runs in a transaction with deterministic player-row locks; a blocked player receives 403 instead of overwriting `askedById`.
7. **OIDC account-link race** — same-email lookup, owner lock, `endemionSub` re-check, conditional update, and post-update verification run in one transaction. Conflicts return 409 and redirect to `?idError=linked`.
8. **Alive-life cap** — player-row lock wraps count + insert in create, succession, and import.
9. **Import bounds** — ≤512 KB state, name 1–64, age 0–200, schema 1–8, ≤2,000 history entries, ≤20,000 changes and ≤2 MB history envelope; malformed saves map to 400/409.
10. **Rate-limit policy** — Redis unavailable/error returns 503 for game routes; `/api/auth/*` falls through to the in-memory auth throttle; health reports degraded with 503.
11. **CSP** — production header added with `default-src 'self'`, self scripts/styles, self/data/blob images, no objects, no framing, self forms, and production `upgrade-insecure-requests`.

### Frontend / Android

12. **Desktop Dossier** — the mobile Dossier wrapper is `hidden` unless on the mobile People tab; exactly one Dossier renders at `lg`, `xl`, and mobile.
13. **Mobile overflow** — hero clipping and body `overflow-x: clip` remove the 58px homepage overflow; the header was compacted at 320px without hiding core links.
14. **Loading/error/timeout** — root loading and error boundaries, plus a 15s API timeout.
15. **Safe areas / touch targets** — viewport `viewportFit: cover`, safe-area padding, 44px header links and CTAs.
16. **Android reproducibility** — Capacitor 8.6.2 core/android/cli pinned, lockfile updated, `cap sync` reproducible, build scripts documented, CI Android debug job added.
17. **Android offline safety** — WebView UA marker `EndemionLifeAndroid/1.0`; local store refuses to create a new life in the Android shell; existing local lives remain readable.
18. **Android backup** — `allowBackup=false`.

### Documentation

19. README, PROJECT_STATUS, DEPLOYMENT, HTTPS_SETUP, and Android roadmap reconciled with verified state.
20. Portal decision documented as **Option B — out of the Stage 01 release**, pending owner approval. No portal file was moved, archived, or deleted.

---

## 4. Files changed

**52 tracked files, +1,325/−167**, plus new untracked Stage 01 docs and pre-existing untracked work.

Main groups:

- **API:** `apps/api/src/live/live.service.ts`, `lives/lives.service.ts`, `auth/auth.service.ts`, `auth/endemion-id.service.ts`, `auth/endemion-id.controller.ts`, `social/social.service.ts`, `redis/rate-limit.guard.ts`, `health/health.controller.ts`, `app.module.ts`, `config.ts`.
- **API tests:** `auth`, `endemion-id`, `endemion-id-provider`, `lives`, `stage04`, `stage07`, `stage15`, `reliability`.
- **game-core:** `engine/game.ts`, `legacy/lineage.ts`, `narrative/consequences.ts`, `world/rules.ts`, `test/save.test.ts`, `test/stage01-life-upgrade.test.ts`, two timeout annotations.
- **web:** `next.config.ts`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/loading.tsx`, `app/error.tsx`, `components/site-header.tsx`, `account-link.tsx`, `language-switch.tsx`, `store-badge.tsx`, `play/play-screen.tsx`, `lib/api.ts`, `lib/store/index.ts`.
- **Android/config:** `.github/workflows/ci.yml`, `capacitor.config.ts`, `android/app/src/main/AndroidManifest.xml`, `MainActivity.java`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, Android roadmap.
- **shared/docs:** `packages/shared/src/views.ts` (`IDENTITY_CONFLICT`), README, PROJECT_STATUS, DEPLOYMENT, HTTPS_SETUP.

No save-schema migration was added. `SAVE_SCHEMA_VERSION` remains **8**.

---

## 5. Tests executed and exact results

| Command | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **610 passed / 610**, 42 files, 13.7s |
| `pnpm --filter @endemion/api test` | **74 passed / 74** |
| `pnpm --filter @endemion/shared test` | **12 passed / 12** |
| `pnpm test:api` | **111 passed / 111**, 12 files, 81.7s |
| `pnpm test:e2e` | **62 passed / 62**, desktop Chrome + Pixel 7, 2.2m |
| `pnpm typecheck` | **PASS** (database, ui, game-core, shared, api, web) |
| `pnpm lint` | **0 errors, 1 pre-existing warning** (`play-screen.tsx:170`) |
| `pnpm --filter @endemion/web build` | **PASS**, 12 routes |
| `gradlew assembleDebug` | **BUILD SUCCESSFUL**, 34s, APK 5,800,876 B |
| `gradlew bundleRelease` | **BUILD SUCCESSFUL**, 55s, AAB 4,342,869 B (unsigned) |

The API/e2e logs contain expected 500 and 503 entries from deliberate fault-injection tests; no test failed because of them.

Tests added:

- Live claim → restore → claim, repeat claim, restore contribution, concurrent claims.
- Guest login preserves `LivePart` ownership/count/claimedAt.
- OIDC outage beyond grace revokes permanently; short outage does not advance `refreshedAt`; second same-email ID cannot take over.
- Reverse/concurrent social blocks keep the original blocker.
- 24 concurrent creates at the 20-life cap.
- Import age/name/size/missing-history/nested-changes bounds.
- Save formats 5, 6, 7, 8 migrate to 8 and parse.
- Stale `nextSeq` self-heals instead of colliding.
- Real injected DB failure rolls back cleanly, then retry with same actionId succeeds.

---

## 6. Before/after comparison

| Suite | Before STAGE 01 | After STAGE 01 |
|---|---|---|
| game-core | 606/609 (1 real failure, 2 timeouts) | **610/610** |
| API unit | 74/74 | **74/74** |
| shared | 12/12 | **12/12** |
| API e2e | Not run in audit | **111/111** |
| web Playwright | Not run in audit | **62/62** |
| typecheck | Not recorded | **PASS** |
| Android build | Not reproducible | **APK + unsigned AAB built** |
| live claim duplication | Present | **Closed** |
| guest merge LivePart loss | Present | **Closed** |
| OIDC session revival | Present | **Closed** |
| desktop duplicate Dossier | Present | **Closed** |
| 58px homepage overflow | Present | **Closed** |

The two slow game-core tests remain deterministic simulations; their per-test timeout was raised to 15s with justification. No assertion was weakened.

---

## 7. Security improvements

- No P0 findings remain from the audited set.
- S-01 OIDC offline-grace revival fixed and tested.
- S-03 guest transfer no longer deletes live contributions.
- S-04 block ownership protected with row locks.
- S-05 account-link race serialized.
- S-06 rate limits fail closed for game routes; auth remains available via its own throttle.
- S-07 alive-life cap serialized.
- S-08 import bounds and correct 400/409 mapping.
- S-13 CSP active and verified against 62 browser tests.
- Portal remains uncommitted and excluded from the release; S-02 is a **decision blocker**, not a shipped vulnerability.
- Remaining follow-ups: session rotation/`__Host-` cookie migration, separate ops token, backup encryption, account deletion, Sentry PII review.

No secrets, tokens, passwords, or personal data were written to reports.

---

## 8. Data-integrity improvements

- Live rewards are account-level and survive restore; no double gold or double count.
- Restore re-applies claimed flags and keeps `claimedAt`.
- Guest merge is atomic.
- Dynasty chronicle provenance points at the original source event.
- History sequence cannot collide with existing rows.
- Import never silently truncates; invalid input is rejected.
- Save schema 8 and all older formats remain accepted; production rows at schema 1, 2, 5, and 8 remain compatible.
- No destructive migration or schema change.

Residual risks are documented in `DATA_INTEGRITY_REPORT.md`: optional nested save sections are still shallow-validated; restore does not revert insights, `game_actions`, or live-window total progress; corrupt DB JSON can still produce a 500.

---

## 9. Android build status

**Builds successfully locally.**

- Capacitor **8.6.2** (core/android/cli) pinned in root `package.json` and lockfile.
- `pnpm android:sync` and `pnpm android:build:debug` documented.
- JDK **21** required. `E:\ASG\jbr` is Java 25 and fails with class-file major 69; the system JDK 21 path is `C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot`.
- SDK `E:\ASGG`, compile/target SDK 36, minSdk 24.
- Debug APK and unsigned release AAB produced; `aapt2` confirms package `online.endemion.life`, versionCode 1, only INTERNET permission.
- CI job added to build the debug APK on a clean Linux runner.

**Not verified:** signed AAB, Play Console upload, install on a physical device/emulator, deep links, push, offline cache, account deletion URL. These are release blockers, not build blockers.

---

## 10. Frontend verification

- Production build passes.
- 62/62 Playwright tests pass on desktop Chrome and Pixel 7.
- Dossier renders exactly once at desktop and mobile breakpoints.
- No horizontal overflow at **320, 390, 412, 414** CSS px on the audited screens; homepage and play screen measured.
- Header links are 44px-high touch targets; CTA buttons meet 44px.
- CSP does not break auth, API proxying, styles, or navigation.
- Loading/error boundaries and a 15s request timeout are in place.

---

## 11. Remaining blockers

1. **Repository provenance:** 52 tracked files are modified and the tree is dirty; production `ca72b8b` is not on `origin/main`. Nothing may be released until the owner approves a commit/push strategy.
2. **Portal:** Option B requires product-owner approval; portal code remains untracked and out of release.
3. **Android signing:** no keystore, signed AAB, Play listing, data-safety form, privacy policy, or account-deletion URL.
4. **Device verification:** no emulator/physical-device install or smoke test was possible.
5. **CI:** the Stage 01 tree has not been pushed, so GitHub Actions has not executed the new Android job or the full gate on this exact diff.
6. **Follow-ups intentionally deferred:** session rotation/`__Host-` cookies, separate ops token, backup encryption, deeper save validation, account deletion.

---

## 12. Known risks

- Live restore semantics are intentionally irreversible; a player who restores before claiming forfeits that reward. This is documented and prevents duplication.
- Import limits may reject some very large legitimate browser saves; the limits are explicit and return 400, never truncate.
- `alignment` of `nextSeq` mutates the state before action; covered by test, but old clients must tolerate the normalized next sequence.
- The Android shell depends on the production origin; when offline it blocks new-life creation but cannot provide gameplay.
- The portal remains a latent integration; it must not be enabled by env until fully reviewed.
- API e2e fault-injection creates temporary DB triggers; the test drops them in `finally`, but a crashed test process can leave one behind in a local test DB only.

---

## 13. Git status and commit information

- Branch: `main`
- HEAD: `cda9a39f4717d3c1d4890fa6e3be703e349e78ea` (unchanged)
- `origin/main`: `c7951d008c51816f488b9aa8e3dbb4e3c56e05e6`
- Ahead/behind: **3 / 0**
- Production SHA: `ca72b8b`
- `git diff --stat`: **52 files, +1,325/−167**
- Untracked: `apps/api/src/portal/`, 74 Stage 11 reports, blueprint `.docx`, `docs/audit/`, `docs/stage-01/`, `loading.tsx`, `error.tsx`.
- **No commit, push, merge, rebase, reset, stash drop, or deploy was performed.**
- No pre-existing change was discarded.

The exact safe release sequence is in `REPOSITORY_PROVENANCE.md` and `RELEASE_READINESS.md`; it requires explicit approval.

---

## 14. Production deployment status

**Not deployed. Production unchanged.**

- Production still runs `ca72b8b`.
- No production files, environment variables, database rows, backups, or containers were modified in STAGE 01.
- No production migration was run.
- No production traffic or gameplay action was performed during verification.
- All local verification used the local PostgreSQL/Redis stack and local builds.

Release status: **BLOCKED ON PROVENANCE AND OWNER APPROVAL**.

---

## 15. Recommendation for STAGE 02

Do not start STAGE 02 automatically.

Before any gameplay expansion:

1. Approve the portal decision (Option B recommended).
2. Approve a scoped commit/push of the Stage 01 stabilization; do not mix portal code with stabilization.
3. Run the full GitHub Actions gate on the pushed SHA, including the new Android job.
4. Produce a signed Android AAB and install the debug APK on at least one device/emulator.
5. Add the deferred security operations work (backup encryption, account deletion, session rotation).
6. Then begin STAGE 02 with advanced life simulation, preserving save schema 8 and all six worlds.

**The game is now materially safer to grow. It is not yet released.**

---

## 16. Post-release addendum (2026-11-13)

After this report was written, the stabilization was committed and pushed with explicit owner approval to proceed:

| Item | Result |
|---|---|
| Stabilization commit | `d19be69` |
| Gitleaks false-positive fix | `cd2e6a9` |
| Android CI setup fix | `3fe71aa` |
| `origin/main` | `3fe71aa22ce3b8dd36e4c7028e8693dc70c9c54d` |
| CI | run **43425468438 — success** |
| Security | run **43425468466 — success** |
| Deploy | run **43426512519 — waiting for production environment approval; not approved** |
| Production | unchanged at `ca72b8b` |

The earlier statements in sections 11, 13, and 14 that “no commit/push was performed” are historical and superseded by this addendum. The portal wiring and untracked portal source remain intentionally outside the pushed stabilization commit, as do the 74 Stage 11 reports and blueprint `.docx`.

**Updated status: STAGE 01 is released to GitHub and CI-verified; production deployment has not been performed and remains a separate owner decision.**
