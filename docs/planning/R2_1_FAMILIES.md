# R2.1 — Player Families

**Status:** implemented locally, verified, not committed, not deployed  
**Save schema:** 14 (unchanged)  
**DB migration:** 16, additive  
**Production baseline:** runtime `fa85733`, docs `ff59cb2`, 15 migrations

## 1. Scope

R2.1 is the account-level foundation for player families. It is deliberately narrower than the full R2 “Bloodline” train: no shared estate, no cross-account inheritance, no guardianship or regency, and no family chronicle yet.

Delivered:

- create a family in one of the six universes;
- public or invite-only discovery;
- motto and description;
- leader / elder / member roles;
- invitations with explicit consent and incoming-invite list;
- accept, decline, leave, kick, transfer leadership, disband;
- one family per player per universe;
- unique family name per universe;
- member cap 30;
- audit log for every mutation;
- Web UI on `/social` with RU/EN copy and safe-area/mobile layout.

## 2. Data model

Migration `20261115120000_r2_1_families`:

| Table | Purpose |
|---|---|
| `families` | universe, name/nameKey, motto, description, visibility, leader, reputation, treasury, timestamps |
| `family_members` | family, player, universe, role, contribution, joinedAt; unique `(playerId, universeId)` and `(familyId, playerId)` |
| `family_invites` | family, inviter, invitee, pending/accepted/declined/cancelled, timestamps; unique `(familyId, inviteeId)` |
| `family_audits` | family, actor, action, JSON detail, timestamp |

`players` gained family relations. All tables are additive and cascade from player/family. Checks constrain visibility, role and invite status.

`families.treasury` and `families.reputation` exist as forward-compatible fields but no economy transfer is implemented in this slice.

## 3. API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/families?universeId=` | list visible families, own memberships and incoming invites |
| `POST` | `/api/families` | create family |
| `GET` | `/api/families/:id` | detail and members |
| `PATCH` | `/api/families/:id` | leader/elder edit |
| `POST` | `/api/families/:id/invites` | invite a named player |
| `GET` | `/api/families/invites` | incoming invitations |
| `POST` | `/api/families/invites/:inviteId/accept` | accept with consent |
| `POST` | `/api/families/invites/:inviteId/decline` | decline |
| `POST` | `/api/families/:id/leave` | leave |
| `POST` | `/api/families/:id/kick` | leader removes member |
| `POST` | `/api/families/:id/transfer` | leader transfers leadership |
| `POST` | `/api/families/:id/disband` | leader disbands |
| `GET` | `/api/families/:id/audit` | audit log |

All routes require a full account (`SessionService.requireAccount`), strict zod bodies and UUID guards. Family rows and player rows are locked with `SELECT ... FOR UPDATE` during accept/transfer/leave mutations.

## 4. Rules

- Family names are unique per universe (`nameKey`); duplicate returns `FAMILY_NAME_TAKEN`.
- A player can belong to only one family per universe; a second create/accept returns `FAMILY_ALREADY_MEMBER`.
- The member cap is 30; overflow returns `FAMILY_FULL`.
- A duplicate pending invite returns `FAMILY_INVITE_EXISTS`; invalid/decided invites return `FAMILY_INVITE_INVALID`.
- The leader cannot leave while others remain; transfer leadership first or disband (`FAMILY_LEADER_TRANSFER`).
- A sole leader who leaves deletes the family.
- Only leader/elder can edit and invite; only leader can kick, transfer and disband.
- A blocked social relationship does not automatically prevent family membership; social-moderation integration is future work.

## 5. Web

`apps/web/src/components/social/family-panel.tsx` is rendered on `/social` between the live board and guild panel.

Features:

- guest account CTA;
- family cards with heraldry-compatible layout;
- create form with universe, visibility, name, motto and description;
- incoming invitations with accept/decline;
- detail view with members, roles, audit and player-profile links;
- edit for leader/elder;
- invite search by player name;
- leave/kick/transfer/disband with confirmations;
- responsive layout checked at 1440 and 390; no horizontal overflow.

## 6. Verification

| Check | Result |
|---|---|
| Family API e2e | **6/6** |
| Full API e2e | **162/162**, 20 files |
| Family UI e2e | **2/2** desktop + mobile |
| Full web e2e | **79 passed, 1 skipped** |
| Web production build | PASS, 13 routes |
| API/web typecheck | PASS |
| Targeted lint | clean; root lint blocked by unrelated dirty Android/itch files |

## 7. Known limitations

- No shared family estate, treasury transfer, wages or upkeep.
- No cross-account inheritance or heir transfer between family members.
- No guardianship/regency integration.
- No family chronicle or shared achievements.
- No family chat/notifications.
- No dedicated anti-abuse limits beyond account auth, global rate limit, member cap, invite uniqueness and audit.
- `reputation`/`treasury` are foundation columns only.

## 8. Rollback

Application rollback is safe: migration 16 is additive, save schema is unchanged, and the previous release ignores the new tables. Do not drop family tables during rollback.
