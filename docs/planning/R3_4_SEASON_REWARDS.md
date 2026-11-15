# R3.4 — Season Goal Rewards

**Status:** COMPLETE AND DEPLOYED (2026-11-15 09:20 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** 18, additive

## 1. What was added

- `GET /api/world/:universeId/rewards` (account-only):
  - current season;
  - goals met;
  - reward pool;
  - whether the player contributed;
  - claimed timestamp;
  - claimable amount.
- `POST /api/world/:universeId/rewards/claim`:
  - body `{ actionId, lifeId, expectedSeason }`;
  - requires a contribution in the current season;
  - requires at least one season goal met;
  - credits the reward pool to a living life in the receiving universe;
  - one claim per contribution, idempotent by contribution state and `actionId`;
  - writes life history, snapshot and world audit.
- Web `WorldRewardPanel` under the shared world view:
  - goals met and reward pool;
  - claimable state;
  - living-life recipient select;
  - claim button and result notice.
- Season snapshots now persist `goalsMet` and `rewardPool`.

## 2. Reward rule

- 1 goal met → 25 gold.
- 2 goals met → 50 gold.
- 3 goals met → 75 gold.
- Reward is granted once per player per season contribution.
- Only a living life in the same universe can receive it.
- Claim is server-authoritative; client sends intent only.

## 3. Data model

Migration `20261115190000_r3_4_season_rewards`:

- `world_seasons.goals_met` integer default 0;
- `world_seasons.reward_pool` integer default 0;
- `world_contributions.reward_claimed_at` timestamptz nullable;
- `world_contributions.reward_amount` integer default 0;
- `world_contributions.reward_action_id` uuid nullable.

## 4. Verification

| Check | Result |
|---|---|
| Stage 05 API e2e | **10/10** |
| Reward claim + replay + wealth + claimed flag | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 13 routes |
| Shared-world API e2e | 8/8 |

## 5. Limitations

- Reward is only for the current season; a player who waits until the next season cannot claim the old pool.
- No separate reward ledger; `world_contributions` is the source of truth.
- Reward targets a life, not a family treasury.
- No notification beyond the UI response.

## 6. Deployment

- Code commit `02c2e6f`; production runtime **`02c2e6f`**.
- Deploy run **43698479681**, success; history `09:20:22Z deploy-start` → `09:20:51Z deploy ok`.
- Production now has **18 migrations**; save schema 14.
- `/api/health` 200; `/api/world/dark-fantasy/rewards` returns 401 unauthenticated.
- Rollback target `e564094`; migration 18 is additive.

## 7. Rollback

Migration 18 is additive. Application rollback is safe; keep the columns and contribution reward fields.
