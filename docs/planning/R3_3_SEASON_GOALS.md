# R3.3 — Season Goals and Settlement Map

**Status:** implemented and tested locally; release pending  
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

## 5. Rollback

No migration. Reverting the application code removes the goals endpoint and panel.
