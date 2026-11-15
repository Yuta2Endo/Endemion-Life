# R4.12 - Social Notifications

**Status:** implemented and tested locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

### Notification payload

The existing durable `player_notifications` table now supports social events through new kinds and JSON fields. No schema or migration change was needed.

New kinds:

- `family_invite`
- `family_invite_accepted`
- `family_invite_declined`
- `guild_request`
- `guild_request_accepted`
- `guild_request_rejected`
- `guild_project_completed`

The JSON payload carries the names and ids needed by the client, so the bell does not fetch families, guilds or projects separately.

### Family events

- Inviting a player creates a `family_invite` notification for the invitee with the family name and invite id.
- Accepting an invitation creates `family_invite_accepted` for the inviter with the new member's display name.
- Declining an invitation is now transactional: it validates the pending invite, updates it, and creates `family_invite_declined` for the inviter.
- Repeated re-invites refresh the pending invite and create a new notification.

### Guild events

- A join request to a request-only guild notifies every leader and officer with `guild_request`.
- A repeated `join` while the request is already pending does not create duplicate notifications.
- Accepting or rejecting a request notifies the applicant with `guild_request_accepted` or `guild_request_rejected`.
- Completing a guild project notifies every guild member, including the contributor, with `guild_project_completed` and the project title and target.

All notifications are written inside the owning family/guild transaction.

### Web

- The notification bell kind union and payload now include all social notifications.
- Russian and English message keys were added for family invites, family decisions, guild requests, guild decisions and completed projects.
- The empty state now mentions auction, family and guild events.
- Existing unread badge, polling, mark-read and mark-all behavior applies to social notifications without further changes.

## 2. Verification

| Check | Result |
|---|---|
| API typecheck | PASS |
| Family invitations e2e | PASS |
| Guild requests and decisions e2e | PASS |
| Guild project completion e2e | PASS |
| Auction notifications regression | PASS |
| Combined e2e | **3 files, 27 tests** |
| Web lint | PASS (only pre-existing `play-screen.tsx` warning) |
| Web typecheck | PASS |
| Web production build | PASS |

Test database reset now truncates `player_notifications`, so notification tests cannot leak into other e2e files.

## 3. Limitations

- Season reward notifications are not included.
- No push, email or SSE delivery; the badge polls once a minute and refreshes on open.
- Only the latest 50 notifications are returned.
- There is no delete, archive or retention policy.
- Family invitations notify the invitee even if the inviter later loses permission; the invite still validates on accept.
- Guild project notifications are sent once per member at completion; there is no reminder for inactive members.
- Notifications do not deep-link to the family, guild or project screen.

## 4. Deployment

- Code commit: pending.
- Production runtime: pending.
- No migration is required; production migration count stays **26**.
- Rollback target remains `15f9873`.

## 5. Rollback

No database changes. Reverting the application commit removes social notification creation while existing rows stay harmless in `player_notifications`.
