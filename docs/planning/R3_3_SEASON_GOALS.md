# R3.3 — Season Goals and Settlement Map

**Status:** COMPLETE AND DEPLOYED (2026-11-15 08:59 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

- `GET /api/world/:universeId/goals`:
  - current season;
  - three shared season goals: prosperity, stability, balance of faction power;
  - current value, target, percentage, completion state;
  - targets scale gently with season.
- Web `WorldGoalsPanel` under the shared world view:
  - three goal cards;
  - progress bar and current/target values;
  - localized RU/EN.
- Data test ID: `world-goals`.

The existing settlement cards remain the living map: population, prosperity, stability, dominant faction and local goods for each settlement, alongside faction power and recent events.

## 2. Goal model

- **Prosperity**: average settlement prosperity; target `55 + min(10, season)`.
- **Stability**: average settlement stability; target `50 + min(5, floor(season / 4))`.
- **Factions**: highest faction power; target `60`.
- Progress clamps to 0–100; goal is met when current ≥ target.
- Read-only: goals do not grant rewards or mutate world state.

## 3. Verification

| Check | Result |
|---|---|
| Shared-world API e2e | **8/8** |
| Goals response assertions | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 13 routes |

## 4. Limitations

- Goals are derived from current world state, not stored per season.
- No reward payout on completion.
- No historical goal result; season snapshots retain the state needed for a future history.
- Settlement map remains a card view, not a geographic canvas.

## 5. Deployment

- Code commit `e564094`; production runtime **`e564094`**.
- Deploy run **43696391811**, success; history `08:59:06Z deploy-start` → `08:59:42Z deploy ok`.
- No migration; DB remains **17** migrations, save schema 14.
- Production `/api/world/dark-fantasy/goals` returns **season 5, 3 goals**; `/api/health` 200.
- Rollback target `d242c86`.

## 6. Rollback

No migration. Reverting the application code removes the goals endpoint and panel.
