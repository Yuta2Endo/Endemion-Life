# Release Readiness — STAGE 01

**Date:** 2026-11-13  
**Decision:** **NOT RELEASABLE YET — stabilization code is green, but provenance and portal approval are blockers.**  
**Production touched:** No. **Commit/push/deploy:** No.

---

## 1. Verified source

| Item | Verified value |
|---|---|
| Branch | `main` |
| HEAD | `cda9a39f4717d3c1d4890fa6e3be703e349e78ea` |
| HEAD subject | `docs: record production deployment of stage 04.5.4 release ca72b8b` |
| `origin/main` | `c7951d0` (3 commits behind HEAD) |
| Production SHA (audit evidence) | `ca72b8b` |
| Working tree | **dirty** — 47 tracked files modified, +1,281/−132; portal/reports/audit/stage docs untracked |
| Save schema | **8** — unchanged |
| Migrations | **10** — no new migration added |
| Portal | Untracked, out of the STAGE 01 release (Option B, pending owner approval) |

The source that passed the tests is the current working tree, **not** any commit. A clean release SHA therefore does not exist yet.

---

## 2. Test evidence

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS (6 packages) |
| `pnpm lint` | 0 errors, 1 pre-existing warning (`play-screen.tsx:170`) |
| `pnpm --filter @endemion/game-core test` | **610/610** |
| `pnpm --filter @endemion/api test` | **74/74** |
| `pnpm --filter @endemion/shared test` | **12/12** |
| `pnpm test:api` | **111/111** |
| `pnpm test:e2e` | **62/62** (desktop + Pixel 7) |
| `pnpm --filter @endemion/web build` | PASS (12 routes) |
| `cap sync android` | PASS |
| `gradlew assembleDebug` | PASS — 5,800,876-byte APK |
| `gradlew bundleRelease` | PASS — 4,342,869-byte **unsigned** AAB |
| CSP | Present in production build; Playwright green |
| Mobile overflow | 320 / 390 / 412 px — no horizontal overflow |

All logged 500/503 responses are intentional failure-injection tests. No secrets or personal data were printed.

---

## 3. Database and migration state

- Save schema remains **8**; no migration or schema change was introduced in STAGE 01.
- Existing migrations: **10** (init through Stage 16 insights).
- New code is compatible with production rows at schema 1, 2, 5, and 8 (legacy rows are migrated on read).
- Recommended pre-deploy check (read-only):

```bash
pnpm --filter @endemion/database exec prisma migrate status
```

- Do **not** run `migrate deploy`, `db push`, or reset against production during STAGE 01.

---

## 4. Backup and rollback

- Production backup system exists: `/opt/endemion-life/backups/last-success` was last updated **2026-11-13 03:30** during the audit.
- Before any future release, create a fresh verified backup and record:
  - backup file/path,
  - checksum,
  - timestamp,
  - database size,
  - restore command/runbook reference.
- Rollback code SHA: **`ca72b8b`** (the currently deployed release).
- Rollback database: restore the pre-release backup only if a migration or data change requires it. STAGE 01 adds no migration, so a code rollback should suffice.
- No backup or restore was executed in this stage.

---

## 5. Deployment prerequisites

1. Product owner approves the portal decision (Option B recommended).
2. Product owner approves committing the stabilization changes.
3. Create a commit/tag from the reviewed tree; push `main` and tag.
4. Verify `origin/main` contains `ca72b8b`, `cda9a39`, and the stabilization commit.
5. CI (checks, API e2e, Playwright, Android debug, Docker) green from the pushed SHA.
6. Build images from that SHA only.
7. Take and verify a fresh production backup.
8. Deploy through the documented process with explicit approval.
9. Verify `/api/health`, CSP/security headers, login, create/advance/save, restore, live claim, and Android smoke test.
10. Record release SHA, image digests, backup ID, and rollback SHA.

---

## 6. Remaining blockers

| Blocker | Severity | Required action |
|---|---|---|
| Dirty tree not committed | Release-blocking | Review + commit with approval |
| HEAD/origin divergence | Release-blocking | Push `main`; verify remote SHA |
| Portal decision pending owner | Release-blocking for Option A only | Approve Option B (out of release) |
| Android signing/keystore absent | Play-release blocker | Configure signing outside git; build signed AAB |
| Play Console compliance absent | Play-release blocker | Privacy policy, data safety, account deletion, listing |
| No physical Android device test | High | Install debug APK; smoke test login/create/advance |
| No production deploy verification | Expected — not performed | Separate release approval |
| P3 follow-ups (CSP nonce, `__Host-` cookie, ops token separation) | Low | Later stage |

---

## 7. Release checklist

- [x] Source SHA and branch recorded
- [x] Working tree inventory recorded
- [x] Tests/typecheck/lint/build recorded
- [x] Schema/migration impact assessed (none)
- [x] Backup/rollback procedure identified
- [x] Remaining blockers documented
- [ ] Stabilization commit created (approval required)
- [ ] Pushed and tagged (approval required)
- [ ] Portal decision approved by owner
- [ ] Android signing and Play compliance complete
- [ ] Production backup created and verified
- [ ] Deployment approved and performed (out of scope)

**Release status: BLOCKED ON PROVENANCE AND OWNER APPROVAL.**

---

## Post-release addendum (2026-11-13)

The stabilization was committed and pushed after this report was written:

- `d19be69` — stabilization commit
- `cd2e6a9` — gitleaks false-positive fix
- `3fe71aa` — Android CI SDK setup fix
- `origin/main` = `3fe71aa`
- CI run **43425468438 — success**
- Security run **43425468466 — success**
- Deploy run **43426512519 — waiting for production environment approval; not approved**

Checklist items “stabilization commit created” and “pushed” are now complete. The GitHub release is complete; **production is unchanged at `ca72b8b`**. Remaining blockers are portal owner approval, Android signing/Play compliance, device smoke testing, and a separately approved deployment. The earlier “no commit/push” statements are historical and superseded by this addendum.
