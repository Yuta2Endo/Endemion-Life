# R4.4 — Settlement Seasonal Orders

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** 20, additive

## 1. What was added

- Six seasonal orders per world, generated deterministically from world state.
- `GET /api/world/:universeId/orders` — open orders for the current season.
- `POST /api/world/:universeId/orders/:orderId/fulfill` — account-only:
  - body `{ actionId, lifeId }`;
  - requires a living life in the same universe;
  - requires enough stock of the requested good;
  - removes goods, grants gold, bumps life version, writes history and snapshot;
  - marks the order fulfilled and audits the action;
  - replay by the same player returns `replayed: true`;
  - another player cannot claim a fulfilled order.
- Web `WorldOrdersPanel`:
  - order list with settlement, good, quantity and reward;
  - life selector;
  - fulfil action and result notice;
  - `data-testid="world-orders"`, `world-order-fulfill`.

## 2. Order generation

For each season, six slots are derived deterministically:

- settlement = `(season * 3 + slot) % settlements.length`;
- good = `(season + slot) % goods.length`;
- quantity = `1 + (season + slot) % 3`;
- reward = `good.buy × quantity + 5 + slot × 2`.

Orders are unique by `(worldId, season, slot)` and generated lazily on read/fulfil.

## 3. Data model

Migration `20261115210000_r4_4_world_orders`:

- `world_orders` with season, slot, settlement, good, qty, reward, status, fulfiller player/life, timestamps;
- unique `(world_id, season, slot)`;
- status check `open/fulfilled/expired`;
- FKs to world, player and life.

## 4. Verification

| Check | Result |
|---|---|
| Stage 05 API e2e | **11/11** |
| Order list + fulfil + reward + stock + replay | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS |

## 5. Limitations

- Orders do not expire automatically; old seasons remain stored and cannot be fulfilled.
- No world contribution effect from fulfilling an order yet.
- Orders are generated only when the board or fulfil endpoint is used.
- No partial fulfilment.

## 6. Rollback

Migration 20 is additive. Application rollback is safe; keep `world_orders`.
