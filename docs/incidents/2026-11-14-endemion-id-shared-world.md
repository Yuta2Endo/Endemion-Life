# Endemion ID users blocked from the shared world

Date: 2026-11-14
Status: fixed and deployed
Severity: P1 (wrong account gate on all shared-world actions)

## Report

An Endemion ID user could sign in successfully, but `/worlds` still showed:

> Общий мир доступен только аккаунту. Гостевая жизнь остаётся соло.

Presence, contribution, guilds and the player market were therefore unavailable to
signed-in users even though the session was valid.

## Root cause

The platform has two identities:

- a local password `Account`;
- an Endemion ID identity stored as `players.endemion_sub`.

`SessionService.requireAccount` and `AuthService.me` only recognised the local
`Account` row. Endemion ID users have a `Player` without an `Account`, so they were
classified as guests and received `403 ACCOUNT_REQUIRED`. The web client also used
`me.account` alone to decide whether to render the guest call to action.

## Fix

- `SessionService.requireAccount` treats a player with `endemionSub` as an
  account. It returns the real local account when one exists, otherwise a
  synthetic account derived from the player identity.
- `AuthService.me` returns an account view for Endemion ID players, so the web
  client sees the same signed-in state as the API.
- `WorldParticipation` treats `me.endemionId` as signed in, not only `me.account`.

Guest players without a local account or `endemionSub` remain solo-only.

## Verification

- `endemion-id.e2e-spec.ts`: 15/15 passed, including a new regression test that
  signs in with Endemion ID and performs a presence heartbeat.
- `pnpm test:api`: 149/149 passed.
- Web unit tests: 28/28 passed.
- API and web typecheck passed; web production build passed.

## Release

- Commit: `d9313dd` (`fix: treat endemion id as a shared-world account`).
- CI run `43611917140`: success. Security run `43611917037`: success.
- Deploy run `43612503324`: success.
- Production HEAD: `d9313dd`, previous release `0d98323`.
- Deploy history: `15:55:50Z deploy-start` → `15:56:19Z deploy ok`.
- Pre-deploy backup: `endemion_life-manual-20261114T155304Z.dump`, trial restore passed
  with 14 migrations, 19 players, 59 lives, 2,209 snapshots, 9,257 history entries,
  6,272 actions.
- Post-deploy checks: `/api/health` 200 with database/Redis up, `/worlds` 200,
  all seven containers healthy.

## Security notes

- No new trust in client-supplied identity.
- The local player row and session remain the authority.
- No account, save or schema changes.
- Existing guest restrictions are unchanged.
