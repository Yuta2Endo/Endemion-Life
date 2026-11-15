# R2.3 — Family Chronicle

**Status:** implemented locally, verified, release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none (derived read model)  
**Builds on:** R2.1 families, R2.2 family estate

## 1. What was added

- `GET /api/families/:id/chronicle`.
- Family chronicle combines:
  - family audit events: founded, invite accepted, member left/removed, leadership change, disband, treasury deposit/withdraw, cross-account heir;
  - member life milestones: life begun, lineage generation > 1, life completed.
- Entries are localized RU/EN, sorted newest first, capped at 80.
- Invite-only families require membership; public families are readable by accounts.
- Family panel now loads the chronicle with the family detail and shows the latest six events.
- No new tables or save migrations: the chronicle is derived from `family_audits`, `families`, `family_members` and `lives`.

## 2. API response

```json
{
  "entries": [
    {
      "id": "audit:...",
      "kind": "invite.accept",
      "title": { "ru": "Новый член дома", "en": "New house member" },
      "detail": { "ru": "Имя", "en": "Имя" },
      "actorName": "Имя",
      "createdAt": "2026-11-15T..."
    }
  ]
}
```

## 3. Verification

| Check | Result |
|---|---|
| Family API e2e | **8/8** |
| Full API e2e | **164/164**, 20 files |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 13 routes |
| Web unit | 30/30 (existing) |

Family e2e now asserts that the chronicle contains `family.create` and `invite.accept`.

## 4. Limitations

- Chronicle is derived at read time; it is not an immutable curated archive.
- Life entries use `createdAt`/`updatedAt`, so death and lineage milestones can share timestamps.
- No pagination yet; response is capped at 80 entries.
- Family panel displays the latest six entries.

## 5. Rollback

No migration. Reverting the application code removes the chronicle route and panel without affecting data.
