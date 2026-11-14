# STAGE 06.3 — Player Profile

**Status:** implemented locally, verified, not committed, not deployed<br>
**Save schema:** 14 (unchanged)<br>
**DB migration:** 15, additive<br>
**Production baseline:** `d9313dd` / docs `fbc0a69`, 14 migrations

## 1. What was added

The account page is now a player profile hub:

- identity header with Endemion ID name, username, avatar, member-since and last-seen;
- owner account email and verification state for legacy email accounts;
- editable headline (max 48), bio (max 280), favourite world and visibility;
- server-computed statistics: lives, alive/dead, generations, best age, worlds, guilds, friends, market trades, shared-world contributions and chronicle entries;
- ten progress badges: first life, dynasty, elder, worldwalker, merchant, house founder, social, world-shaker, chronicler, lineage keeper;
- latest lives with links to the life desk;
- guild memberships with role and reputation;
- public profile page at `/players/[id]`;
- JSON account export and irreversible account deletion with typed confirmation.

Name, username, avatar and email remain owned by Endemion ID. The local profile adds presentation and privacy fields only.

## 2. Data model

Additive migration `20261114170000_stage06_player_profile`:

| Column | Type | Notes |
|---|---|---|
| `headline` | `VARCHAR(48)` | default `''` |
| `bio` | `VARCHAR(280)` | default `''` |
| `favorite_universe_id` | `VARCHAR(32)` | nullable |
| `profile_visibility` | `VARCHAR(10)` | default `public`; check `public/friends/private` |
| `profile_updated_at` | `TIMESTAMPTZ(3)` | default now |

No game save data changes. `SAVE_SCHEMA_VERSION` stays **14**. Rollback of the application is safe; the extra columns are simply ignored by the previous release.

## 3. API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/profile/me` | account | owner profile with stats, badges, guilds, email |
| `PATCH` | `/api/profile/me` | account | update headline, bio, favourite world, visibility |
| `GET` | `/api/profile/:playerId` | optional session | public/friend/owner view |

`PATCH` is strict: headline ≤48, bio ≤280, favourite world must be one of the six universe ids, visibility must be `public`, `friends` or `private`.

## 4. Privacy and security

- Owner email is returned only when `viewerId === targetId`. Anonymous and other-player views receive `account: null`.
- `private` hides stats, badges, lives, guilds, bio and headline; the page shows only the display name, avatar and access notice.
- `friends` is visible only when an accepted `Tie` exists.
- A blocked player sees the private access state, not profile data.
- Public pages are `noindex`.
- Profile writes are rate-limited by the global guard and require a full account (Endemion ID or local account).
- Export excludes password hashes, session token hashes and refresh tokens; deletion cascades the player aggregate.

## 5. Verification

| Check | Result |
|---|---|
| API e2e (`pnpm test:api`) | **154/154**, 19 files |
| New profile API tests | **5/5** |
| Profile web e2e desktop + mobile | **2/2** |
| Account + design e2e | **18/18** |
| Web production build | PASS, 13 routes including `/players/[id]` |
| Web unit tests | 28/28 |
| API/web typecheck | PASS |
| Lint | 0 errors; pre-existing `play-screen.tsx:174` warning |
| Full web suite | 73/76; 3 create-life failures under full parallel load passed 16/16 on targeted rerun |

## 6. Known limitations

- Avatar, display name and username cannot be edited locally; they come from Endemion ID.
- No activity feed beyond recent lives and guilds.
- Friend-only visibility has server-side logic and API test coverage for public/private, but no dedicated browser test for the accepted-friend branch.
- Public profile page is client-fetched; an SEO/server-rendered public profile is future work.
- Profile badges are computed on each request; with a large account this adds aggregate queries. Current production scale is small.

## 7. Rollback

Application rollback is safe because the migration is additive and save schema is unchanged. Do not drop the profile columns during rollback; the previous release ignores them.
