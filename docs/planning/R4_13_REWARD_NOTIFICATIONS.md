# R4.13 — Season Reward Notifications

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

Season rewards now produce durable in-app notifications through the existing `player_notifications` table. No schema or migration change was needed.

New kinds:

- `season_reward_available`;
- `season_reward_claimed`.

Payload:

```json
{ "season": 3, "reward": 75 }
```

## 2. When notifications are created

### Reward becomes available

`WorldService.writeSeason` compares the previous `goals_met` value with the newly computed status.

- When `goals_met` moves from `0` to a positive value and `reward_pool > 0`, every player who contributed to that season receives `season_reward_available`.
- The notification is written in the same transaction as the world tick, admin command or player contribution that unlocked the pool.
- A contribution is written after `writeSeason`, so the player who pushes the season over the threshold is notified explicitly after their contribution row is created.
- Contributors are deduplicated by the existing unique `(world, player, season)` contribution constraint.

### Reward claimed

`WorldService.claimReward` creates `season_reward_claimed` in the same transaction that credits wealth, writes history and snapshot, and marks the contribution as claimed.

- A repeated claim returns the idempotent replay response and does not create another notification.
- The notification records the season and the actual reward amount credited.

## 3. Web

- The notification bell kind union and payload include both reward kinds.
- Russian and English strings were added:
  - “Награда сезона {season} доступна: {reward} золота.”
  - “Награда сезона {season} получена: {reward} золота.”
- The empty state now mentions rewards as well.
- Existing unread badge, polling, mark-read and mark-all behavior applies without further changes.

## 4. Verification

| Check | Result |
|---|---|
| API typecheck | PASS |
| API build | PASS |
| Stage 05 world/reward e2e | **12/12** |
| Reward availability notification for existing contributor | PASS |
| Reward availability notification for triggering contributor | PASS |
| Reward claimed notification | PASS |
| Idempotent replay does not duplicate notification | PASS |
| Stage 06 market/auction regression | **9/9** |
| Web lint | PASS (only pre-existing `play-screen.tsx` warning) |
| Web typecheck | PASS |
| Web production build | PASS, 12 routes |

## 5. Limitations

- There is no notification when an already available reward pool increases; only the first transition from zero is announced.
- Notifications are only for players who contributed in the current season.
- No push, email or SSE delivery; the badge polls once a minute and refreshes on open.
- Only the latest 50 notifications are returned.
- There is no delete, archive or retention policy.
- Notifications do not deep-link to the world rewards screen.
- A player who never opens the game after the pool unlocks sees the notification when they return; nothing is sent outside the game.

## 6. Rollback

No database migration was added. Application rollback is safe; reward notifications already written remain in `player_notifications`.
