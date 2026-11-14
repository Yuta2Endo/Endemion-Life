# R2.2 — Family Estate, Treasury and Cross-Account Inheritance

**Status:** COMPLETE AND DEPLOYED (2026-11-14 23:36 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** 17, additive  
**Production:** runtime `f17e96f`, **17 migrations**, all containers healthy

## 1. Delivered backend

### Family inheritance consent

- `FamilyMember.acceptsInheritance` (default `false`).
- `POST /api/families/:id/consent` body `{ "accepts": true | false }`.
- Only the member themselves may change their consent.
- Family detail returns `acceptsInheritance` for every member.

### Shared family treasury

- `family_treasury_entries` append-only ledger.
- `POST /api/families/:id/treasury` body:
  ```json
  {
    "actionId": "uuid",
    "lifeId": "uuid",
    "direction": "deposit",
    "amount": 10,
    "note": "optional"
  }
  ```
- Deposit moves gold from the caller's life into the family treasury.
- Withdraw moves gold from the treasury into the caller's life; only leader/elder may withdraw.
- Validates: same universe, living character, positive amount, sufficient gold/treasury, one family membership.
- Idempotent by `(familyId, actionId)`.
- Writes life history (`legacy`), lifecycle snapshot, family ledger row and family audit.
- Life version and `nextSeq` are updated; snapshot history is trimmed to 50.

### Cross-account succession

- `successionSchema` accepts optional `recipientPlayerId`.
- `LivesService.succeed`:
  - resolves recipient (defaults to the dead character's owner);
  - requires both players to belong to the same family in the dead character's universe;
  - requires the recipient's `acceptsInheritance = true`;
  - locks the recipient player;
  - checks the recipient's alive-life cap;
  - creates the heir under `recipientPlayerId`;
  - records the recipient in the succession `gameAction` payload and replay validation;
  - audits `inheritance.recipient`.
- A recipient cannot receive a life without explicit consent.

### API additions

- `GET /api/families/mine?universeId=...`
- `POST /api/families/:id/consent`
- `POST /api/families/:id/treasury`

## 2. Data model

Migration `20261115180000_r2_2_family_treasury`:

- `family_members.accepts_inheritance BOOLEAN NOT NULL DEFAULT false`
- `family_treasury_entries`:
  - `id`, `family_id`, `actor_id`, `action_id`
  - `direction` (`deposit`/`withdraw`)
  - `amount`, `balance_after`, `note`, `created_at`
  - unique `(family_id, action_id)`
  - FKs to family and player, check constraints.

## 3. Verification

| Check | Result |
|---|---|
| Family API e2e | **7/7** |
| Full API e2e | **163/163**, 20 files |
| API typecheck | PASS |
| All-package typecheck | PASS |
| Database build/Prisma generate | PASS |
| Migration 17 local | APPLIED |

Fault-injection 500/503 logs in the full API run are intentional reliability tests.

## 4. Web delivery

- Family panel now shows treasury balance, recent ledger and inheritance consent.
- Members with elder/leader role can deposit and withdraw from an alive life in the same universe.
- Death screen loads `/api/families/mine?universeId=...` and offers consenting family members as recipients.
- `recipientPlayerId` is passed through `LifeSummary` → `continueAs` → cloud store → succession API.
- Web typecheck and production build pass.

A dedicated API test now covers cross-account succession end to end. Browser e2e for the treasury and recipient picker remains future work.

## 5. Deployment

- Code commit `09703f1` plus lint fix `f17e96f`; production runtime **`f17e96f`**.
- Manual Deploy run **43653759129** with `allow_migrations=true`, succeeded.
- Deploy history: `2026-11-14T23:36:22Z deploy-start` → `23:36:53Z deploy ok`.
- Backup `endemion_life-manual-20261114T230905Z.dump` trial-restored at 16 migrations, 19 players, 59 lives.
- Production now has **17 migrations**, `family_treasury_entries` table, `/api/families/mine` returns 401 unauthenticated, health 200 DB/Redis up.
- Rollback target `5a0010a` while migration 17 tables remain additive.

## 5. Risks / notes

- The treasury directly mutates life wealth with `parseSave`, snapshot and history. It follows existing life persistence patterns but is not routed through `LivesService`; future refactor should share one life-mutation helper.
- Cross-account succession locks owner then recipient; concurrent reciprocal successions could contend. Current shape is acceptable for first slice but should be reviewed with load tests.
- The recipient alive-life cap prevents unlimited transfers; accepted family membership is required.
- Migration 17 is additive; rollback of application code is safe while the table remains.

## 6. Rollback

Application rollback is safe; keep migration 17 applied. Do not drop the treasury ledger after any real deposits because it is the audit source.
