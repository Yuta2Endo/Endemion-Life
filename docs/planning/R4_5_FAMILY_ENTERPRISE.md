# R4.5 — Family Enterprise

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** 21, additive

## 1. What was added

- One account-level family enterprise per family.
- `GET /api/families/:id/enterprise`.
- `POST /api/families/:id/enterprise` — leader, costs 50 from treasury.
- `POST /api/families/:id/enterprise/invest` — leader/elder, 10..10 000.
- `POST /api/families/:id/enterprise/collect` — leader/elder, once per world season.
- Income: `level × 10 + floor(family.reputation / 10)`.
- Level caps at 5; level = `1 + floor(invested / 50)` capped at 5.
- All operations are idempotent by `actionId` via the family treasury ledger.
- Treasury, enterprise and audit are updated in one transaction.
- Web family panel shows name, level, invested, current season, income, invest and collect controls.

## 2. Data model

Migration `20261115220000_r4_5_family_enterprise`:

- `family_enterprises`:
  - unique `family_id`;
  - universe, name, level 1..5, invested, last collected season;
  - timestamps;
  - cascade FK to family.

## 3. Verification

| Check | Result |
|---|---|
| Family API e2e | **9/9** |
| Create + invest + collect + treasury changes | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS |

## 4. Limitations

- One enterprise per family, no naming uniqueness across families.
- Income depends only on level and reputation, not settlement or goods.
- Collection is once per world season; no automatic payout.
- No enterprise loss, sale or inheritance.
- Player-to-player contracts are not part of this slice.

## 5. Rollback

Migration 21 is additive. Application rollback is safe; keep `family_enterprises`.
