# Test Results — STAGE 01

## 1. Final result summary

| Suite | Command | Result | Duration |
|---|---|---|---|
| game-core | `pnpm --filter @endemion/game-core test` | **610 passed / 610**, 42 files | 13.7s |
| API unit | `pnpm --filter @endemion/api test` | **74 passed / 74**, 7 files | ~16s |
| shared | `pnpm --filter @endemion/shared test` | **12 passed / 12**, 2 files | <1s |
| API e2e | `pnpm test:api` | **111 passed / 111**, 12 files | 91.7s |
| Web E2E | `pnpm test:e2e` | **62 passed / 62**, desktop + Pixel 7 | 2.2m |
| Typecheck | `pnpm typecheck` | PASS (database, ui, game-core, shared, api, web) | — |
| Lint | `pnpm lint` | PASS, 0 errors, 1 pre-existing warning | — |
| Android debug | `gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL, APK 5,800,876 B | 34s |
| Android release | `gradlew bundleRelease --no-daemon` | BUILD SUCCESSFUL, unsigned AAB 4,342,869 B | 55s |
| Web build | `pnpm --filter @endemion/web build` | PASS, 12 routes | ~6s |

## 2. Baseline → final comparison

| Suite | STAGE 00 baseline | STAGE 01 final | Change |
|---|---|---|---|
| game-core | 606 / 609 (1 real failure, 2 timeouts) | 610 / 610 | +4 tests, all green |
| API unit | 74 / 74 | 74 / 74 | unchanged |
| shared | 12 / 12 | 12 / 12 | unchanged |
| API e2e | not run | 111 / 111 | added 8 regression tests + full run |
| Web Playwright | not run | 62 / 62 | full desktop + mobile run |
| Typecheck | not run | PASS | — |
| Android | not built | APK + AAB built | — |

## 3. New regression coverage

### Data integrity
- `apps/api/test/stage15.e2e-spec.ts`
  - claim → restore → claim returns `replayed:true`, flag restored, `claimedAt` preserved;
  - contribute → restore → contribute returns `counted:false`, count stays 1;
  - two simultaneous claims: exactly one `replayed:false`, one `replayed:true`, gold +25 once, version +1.
- `apps/api/test/auth.e2e-spec.ts`
  - guest → account login moves a `LivePart` and preserves `count` and `claimedAt`.
- `apps/api/test/lives.e2e-spec.ts`
  - stale `state.nextSeq` self-heals; action succeeds and history remains unique.
- `packages/game-core/test/stage01-life-upgrade.test.ts`
  - dynasty consequence keeps `sourceEventId = mu.bandits`.
- `packages/game-core/test/save.test.ts`
  - schema versions 5, 6, 7, 8 migrate to current schema without losing character/universe/age, with adventure/region/mastery populated.

### Security
- `apps/api/test/endemion-id.e2e-spec.ts`
  - provider outage beyond 1h grace revokes session permanently; recovery does not revive it;
  - short outage keeps session, does not advance `refreshedAt`, works after recovery;
  - second Endemion ID with verified same email cannot take over a legacy account.
- `apps/api/test/stage07.e2e-spec.ts`
  - reverse block returns 403, `askedById` remains original blocker, blocked profile stays 404;
  - simultaneous opposite blocks: one 200, one 403, exactly one tie.
- `apps/api/test/lives.e2e-spec.ts`
  - 24 concurrent creates after an established guest session: 19 created, 5 rejected, total 20 alive.
- `apps/api/test/stage04.e2e-spec.ts`
  - age 201, name >64, 600KB state, missing history, and oversized changes all return 400; no 500.
- `apps/api/test/reliability.e2e-spec.ts`
  - Redis down: health 503, game route 503, auth still rate-limits in memory;
  - injected history trigger failure returns 500 without leaking Prisma details, rolls back life/action/snapshot, then retry succeeds.

## 4. Timeout investigation

Two game-core tests were slow deterministic simulations, not hangs:

| Test | Workload | Time | Resolution |
|---|---|---|---|
| `stage04-events.test.ts` — household events | 6 worlds × 12 lives × up to 3000 steps | 7.2s | per-test timeout 15s |
| `stage04-import.test.ts` — xianxia honest saves | 6 × 6 samples to 6000 steps | 5.6s | per-test timeout 15s |

The global timeout was not increased. Both tests pass and no assertion was weakened.

## 5. Commands and evidence

```text
pnpm --filter @endemion/game-core test
pnpm --filter @endemion/api test
pnpm --filter @endemion/shared test
pnpm test:api
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm --filter @endemion/web build
JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot
ANDROID_HOME=E:\ASGG pnpm android:sync
cd android && gradlew.bat assembleDebug --no-daemon
cd android && gradlew.bat bundleRelease --no-daemon
```

The full Playwright run first produced 37/62 because a stale API process on port 4000 used the default 120 req/min limit. Logs showed hundreds of 429s. After killing the stale process and restarting with `RATE_LIMIT_PER_MINUTE=5000`, the suite passed 62/62. This was test-environment contamination, not a product defect.

## 6. Verification boundaries

- No tests were run against production.
- No destructive production database command was executed.
- Android was built, not installed on a physical device or emulator.
- Release AAB is unsigned; no Play Store upload or signing verification.
- Backup restore was not executed; procedure reviewed only.
- Portal tests were unit-level with fake infrastructure; no staging/E2E portal verification.

## 7. Unreliable/flaky observations

- `MaxListenersExceededWarning` appears during API e2e; environmental, no test failure.
- Expected 500/503 logs appear during intentional reliability tests; they are assertions, not failures.
- `history_entries_life_id_seq_key` P2002 was reproduced under parallel e2e before `alignHistoryHead`; after the fix, the full suite is green and a regression test covers stale `nextSeq`.
