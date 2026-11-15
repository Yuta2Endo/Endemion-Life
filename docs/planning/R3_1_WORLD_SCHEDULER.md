# R3.1 — Automatic World Tick

**Status:** COMPLETE AND DEPLOYED (2026-11-15 07:47 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

`WorldSchedulerService` advances all six shared worlds without an operator request.

- Runs inside the API process as a modular-monolith worker.
- Every `WORLD_TICK_INTERVAL_MS`, default **15 minutes**.
- Iterates `UNIVERSE_IDS` sequentially.
- Calls the existing `WorldService.tick`, preserving:
  - advisory lock serialization;
  - season snapshots;
  - command journal and audit;
  - checksum and projections;
  - SSE notifications after commit.
- A failed world does not stop the remaining worlds.
- A second pass does not start while the first is still running.
- Timer is `unref()`-ed so it does not prevent process shutdown.

## 2. Configuration

| Variable | Default | Notes |
|---|---|---|
| `WORLD_TICK_ENABLED` | `true` in production, `false` otherwise | Explicit `true/false` overrides |
| `WORLD_TICK_INTERVAL_MS` | `900000` | 60 s … 60 min |

Tests run with `NODE_ENV=test`, so the scheduler is disabled during API e2e.

## 3. Verification

| Check | Result |
|---|---|
| Scheduler unit tests | **3/3** |
| API typecheck | PASS |
| Disabled mode | no ticks |
| Enabled mode | six universes per interval |
| Overlap guard | second pass skipped while first is running |

## 4. Risks

- The scheduler is in-process. With multiple API replicas, each replica would call `tick`; the PostgreSQL advisory lock serializes writes but does **not** deduplicate the intent, so the season could advance more than once per interval. Production currently runs one API container.
- Future scaling must use a Redis/Postgres leader lock or a dedicated worker.
- First tick occurs after one interval; there is no immediate tick on startup.
- Tick duration is bounded by six sequential world transactions. If it starts approaching the interval, move to a dedicated worker.

## 5. Deployment

- Code commit `5792aac`, lint fix `064d231`; production runtime **`064d231`**.
- Deploy run **43690715874**, success; history `07:46:38Z deploy-start` → `07:47:06Z deploy ok`.
- Production API log confirms `WorldScheduler: Автоматический ход общего мира: каждые 900 с`.
- No migration; DB remains **17** migrations, save schema 14.
- `/api/health` 200; all containers healthy.
- Rollback target `ab6efb6`.

## 6. Rollback

Set `WORLD_TICK_ENABLED=false` and restart the API. No data migration or cleanup.
