# R3.2 — Season Calendar and World Event Chronicle

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

### Public API

- `GET /api/world/:universeId/seasons?limit=1..60`
  - recent season snapshots;
  - season, checksum, tick duration, ticked-at, event count.
- `GET /api/world/:universeId/events?limit=1..100&season=...`
  - historical event chronicle from `world_events`;
  - localized title/text, kind, severity, settlement/faction targets, timestamp.

### Web

- New `WorldHistoryPanel` under the shared world view on `/worlds`.
- Season rail with event count and tick duration.
- “All” and per-season filtering.
- Event chronicle with season tag, kind, localized title and text.
- Loading, empty, error and retry states.
- Data test IDs: `world-history`, `world-season-{n}`, `world-events`.

## 2. Verification

| Check | Result |
|---|---|
| Shared-world API e2e | **8/8** |
| New season list/event filter assertions | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 13 routes |
| Input bounds: limit 0 / 101 | 400 |

## 3. Limitations

- Season list is capped at 60; event list at 100.
- No pagination beyond the caps.
- Event history is read from normalized `world_events`, not reconstructed per season.
- No world map image; settlements remain cards inside the world view.
- New events appear after the next automatic or ops tick.

## 4. Rollback

No migration. Reverting the application code removes the two read endpoints and the panel; existing season/event data remains.
