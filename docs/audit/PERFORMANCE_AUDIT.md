# Endemion Life — Performance Audit

**Stage:** 00 — Complete Project Audit  
**Date:** 2026-11-13  
**Measurement window:** 2026-11-13, production `https://life.endemion.online`, read-only traffic plus SQL aggregates.  
**Constraint:** no load test, stress test, or synthetic write traffic was run against production. The existing `docs/LOAD_TEST_REPORT.md` describes a desktop Docker host, not the production VPS, and is not used as capacity evidence.

## 1. Executive summary

The current game is small and responsive for its actual load: 18 players, 43 lives, 5,381 actions, 8,037 history entries, 48 MB database. Idle health checks returned in 69–118 ms; the mobile homepage loaded HTML in 147 ms DOMContentLoaded / 167 ms load on a 390×844 viewport, with a 42 ms TTFB. No production error or timeout was observed during read-only inspection.

The performance risk is structural, not current saturation:

- Every action rewrites the full life JSON (~12.3 KB average, 21.4 KB max) and inserts a full snapshot (~13 KB), under a row lock.
- 1,642 snapshots occupy ~21.4 MB, about 44% of the database.
- The client downloads the full rules engine and a 58.8 KB bilingual dictionary even for cloud-only play.
- Every action returns a full `LifeView`; the play screen re-renders the whole sheet, timeline, and dossier.
- The production host has 1 vCPU and 2 GB RAM, running many unrelated containers.
- There is no background queue for insights, live sweeps, or world simulation; some work happens inside request paths.

There is no evidence of a current outage. There is also no evidence of headroom for a persistent multiplayer world on this host.

## 2. Measured production environment

| Item | Observed |
|---|---|
| Host | Ubuntu VM, 1 vCPU, 2 GB RAM, 2 GB swap |
| Uptime | 12 days at inspection |
| Memory | 999 MB used, 826 MB available, 11 MB swap used |
| Disk | 22 GB total, 15 GB used, 6.4 GB free (71%) |
| Database | PostgreSQL, `endemion_life`, 48 MB |
| API | NestJS container, image built 2026-11-09T19:22Z |
| Reverse proxy | nginx → Caddy edge, HTTP/2 |
| Other workloads | `endemion-app`, `endemion-auth`, `endemion-city-staging-*`, Portainer, Caddy |

The production directory is a clean git checkout at `ca72b8b`; the API image and database schema are consistent with that release.

## 3. Measured web performance

### 3.1 Mobile homepage (`390×844`, Chrome, production)

| Metric | Value |
|---|---|
| TTFB | 42 ms |
| DOMContentLoaded | 147 ms |
| Load | 167 ms |
| HTML decoded | 61,380 B |
| HTML transfer | 12,483 B |
| Console/page errors | 0 |
| JS/CSS assets | 12 |
| Uncompressed JS/CSS | 1,541,634 B |
| Compressed JS/CSS | 471,903 B |
| Largest JS chunk | 707,214 B |
| CSS | 59,801 B |

The initial payload is acceptable on a fast connection but JS-heavy for low-end Android. Two Google font families are self-hosted with three Cormorant weights and both Cyrillic/Latin subsets.

### 3.2 Health endpoint

Five idle runs: connect 29–55 ms, TTFB 68–118 ms, total 69–118 ms, all HTTP 200. The endpoint performs a database and Redis check on every call and bypasses the global rate limiter.

### 3.3 Mobile layout

- Homepage has 58 px horizontal overflow at 390 px (`scrollWidth 448`), caused by decorative 520 px/256 px glow divs extending beyond the viewport. This is a visual and scroll-performance defect, not a server issue.
- `/worlds` and `/create/dark-fantasy` have no overflow.
- Header links are 20–24 px high; primary buttons are 38 px; several labels are 10–11 px. This is an interaction/accessibility issue, not throughput.
- The homepage uses `backdrop-blur`, a fixed full-page SVG-noise pseudo-element, and an infinite `animate-glow`; these are GPU-costly on low-end phones.

## 4. Database size and write amplification

| Table | Rows | Size/observation |
|---|---:|---|
| `lives` | 43 | avg state 12,315 B; max 21,418 B; total 529,535 B |
| `life_snapshots` | 1,642 | avg 13,041 B; max 21,418 B; total 21,412,933 B (~44% of DB) |
| `game_actions` | 5,381 | avg entries 734 B; max 1,887 B; max 1,158 actions for one life |
| `history_entries` | 8,037 | avg data 566 B; max 1,939 B |
| `sessions` | 29 | 365-day lifetime |
| `insights` | 220 | small aggregate facts |

Each successful action writes:

1. the full life state (~12 KB) to `lives.state`;
2. one `history_entries` row;
3. one full `life_snapshots` row (~13 KB), retaining the last 50;
4. one `game_actions` row with entries;
5. optional insight facts outside the transaction.

That is roughly 25 KB of new payload per action plus index/WAL overhead. At 5,381 actions the database is small; at millions of actions the snapshot table dominates. There is no compression, delta encoding, or archival policy beyond the 50-snapshot cap.

## 5. Backend hot path

`POST /api/lives/:id/actions`:

1. Session lookup by token hash.
2. `SELECT ... FOR UPDATE` on the life row, scoped by `(id, playerId)`.
3. Replay check on `(lifeId, actionId)`.
4. Version check.
5. `parseSave` — validates nearly the entire game state, including up to 200 NPCs, 1,000 chronicle entries, 50 memories, consequences, quests, market, region, adventure, lineage, and optional world/social.
6. `applyAction` — deep-clones the state, applies the action, may call `newGame` logic for succession, and serializes.
7. Update life, insert history, insert snapshot, insert game action.
8. Commit, then write insight facts.

The lock serializes all actions for one life, which is correct for consistency. Different lives on the same player can proceed independently except for the alive-limit count and insight writes.

**Complexity:** O(size of state) per action due to deep clone, parse validation, JSON serialization, and full snapshot. With a 21 KB max state this is still sub-millisecond-to-low-millisecond CPU, but it scales linearly with age, NPC count, chronicle length, and history.

**Synchronous CPU:** `parseSave`, `applyAction`, and JSON serialization run on the Node.js event loop. One very large or malicious import can block other requests for that worker.

## 6. Frontend hot path

- **Bundle:** `messages.ts` is 58.8 KB / 704 lines and is imported by the locale provider, so every client route carries the full bilingual dictionary. `store/index.ts` statically imports the local store, which imports `newGame`, `parseSave`, `applyAction`, `restoreState`, and `succeed` from `game-core`; cloud-only users still download the full engine and all universe content.
- **Dossier:** all panels are statically imported (`dossier.tsx:22-26`) and conditionally rendered, so hidden tabs are in the play chunk.
- **Rendering:** `PlayScreen` owns one large state object; every busy/notice/action update re-renders the sheet, timeline, dossier, and saves dialog. `Timeline` recomputes `toLifeChronicle` every render; `Dossier` recomputes universe/filters; NPC maps are recreated.
- **Autoplay:** one action every 650 ms, each returning a full `LifeView`, doubling renders and network round trips per year.
- **Payload:** `LifeView` includes character, profile, NPCs, stories, legacy, economy, market, adventure, region, mastery, world, and metrics. Lineage returns the full tree/chronicle/dynasty and is re-fetched on every version while open.
- **Loading:** `/play` is a client-fetch shell after hydration; no server prefetch, `loading.tsx`, `error.tsx`, or request timeout. `LivesList` returns `null` while loading and swallows cloud errors, causing layout shift and false “no lives”.
- **Images:** one `next/image`; screenshots are 44 KB/78 KB. Images are not the bottleneck.

## 7. Bottleneck ranking

| ID | Sev | Bottleneck | Evidence | Effect | Fix |
|---|---|---|---|---|---|
| P-01 | P2 | Full state + full snapshot per action | 12.3 KB avg state, 13 KB avg snapshot, 1,642 snapshots/21.4 MB | Write amplification; snapshot table dominates DB growth | Delta snapshots, compression, tiered retention (e.g. 10 recent full + periodic), async archival |
| P-02 | P2 | `parseSave` + deep clone on every action | `save.ts`, `game.ts` `applyAction` | CPU/event-loop cost grows with NPCs/chronicle; import can block | Cache validated state per version, validate only touched branches, move heavy import to a worker/queue |
| P-03 | P2 | Full `LifeView` response and full-screen re-render | `views.ts`, `play-screen.tsx` | Network and main-thread cost at high age/autoplay | Return diffs/changed slices, memoize, virtualize timeline, batch autoplay |
| P-04 | P2 | Full engine + dictionary in client bundle | `store/index.ts`, `local.ts`, `messages.ts` | 471 KB compressed initial JS/CSS; slow cold start on low-end Android | Dynamic import local mode/dossier; split dictionary by route; keep cloud play lighter |
| P-05 | P2 | No background job for insights/live sweep | `live.service.ts` `board()` sweeps; insights writes after commit | Request latency and side effects on GET; lost work on crash | Scheduled worker/queue with idempotent jobs |
| P-06 | P2 | 1 vCPU shared host | production metrics | No headroom for multiplayer simulation; noisy neighbors | Dedicated host/vertical scale before Stage 05; measure |
| P-07 | P3 | `GET /api/live` creates templates/sweeps | `live.service.ts:142-144` | Cache/prefetch semantics broken; DB work on read | Move to scheduler/ops; make GET pure |
| P-08 | P3 | Health checks hit DB+Redis and bypass limiter | `health.controller.ts:24` | Cheap DoS surface; extra load | Internal health, separate lightweight liveness, rate limit |
| P-09 | P3 | Full lineage fetch while tab open | `lineage.tsx:497-512` | Repeated large responses | ETag/versioned query, pagination |
| P-10 | P3 | Font/glow/blur effects | `layout.tsx`, `globals.css`, homepage | GPU/battery cost on low-end phones | Reduce weights/effects on mobile, respect reduced motion (already partially done) |

No P0/P1 performance defect was measured. The system is appropriately sized for tens of lives; it is not sized for a persistent shared world.

## 8. Scalability assessment

**Current ceiling is unknown but low.** With one API process, one PostgreSQL primary, one Redis, one vCPU, and full-state writes:

- Tens of concurrent players may be fine.
- Hundreds of actions per second would saturate CPU and the single Postgres writer.
- A persistent world tick across six worlds, player presence, trading, and shared organizations would add orders of magnitude more writes and fan-out.

Do not publish a user capacity number without a load test on production-like hardware. The existing load report is a desktop Docker test and explicitly says it is not the server.

**Scaling sequence (incremental):**

1. Measure with production-like load: p50/p95 action latency, DB CPU, WAL rate, event-loop lag, memory.
2. Add indexes/caching only where measured.
3. Move snapshots to compressed/delta storage and archive old snapshots.
4. Move insights, live sweeps, and world ticks to a worker/queue.
5. Scale the API vertically/horizontally behind the proxy; keep one writer for authoritative life actions.
6. Partition by world or life only when measurements justify it; avoid microservices.
7. Add read replicas for analytics/leaderboards, not for authoritative writes.

## 9. Recommended performance work for Stage 01

1. Add request timing metrics by route and action type; log p50/p95/p99.
2. Add event-loop lag and DB pool saturation metrics; alert on thresholds.
3. Add a production-like load test with read-only and disposable-DB write scenarios; never against production data.
4. Measure `parseSave`/`applyAction` cost by life age/NPC count; set a budget (e.g. <50 ms p95 for an action).
5. Cap or lazy-load client bundles; measure Lighthouse on a throttled Pixel 7 profile.
6. Fix the mobile overflow and touch targets; they affect perceived performance and usability.
7. Do not optimize snapshots before defining the restore/branch model; the data model change should drive storage.

## 10. Verification limits

- No load test, soak test, or concurrency test against production.
- No heap/profile capture of the production Node process.
- No Lighthouse/CPU profile in this audit; only navigation timing, asset sizes, and visual inspection.
- No Android device performance measurement.
- No long-term growth projection; row sizes and counts are measured, not modeled.
