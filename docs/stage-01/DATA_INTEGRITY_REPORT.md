# Data Integrity Report — STAGE 01

**Result:** all three priority data-integrity defects fixed and regression-tested. No save schema change.

## A1. Live claim / restore duplication

### Original problem

A player could claim a live-window reward, restore an earlier save, and claim again. Restore cleared `LivePart.claimedAt` when the restored save no longer contained the window flag, while the window's progress and contribution count remained. Restoring could also allow the same life-year to contribute twice.

### Root cause

- `apps/api/src/lives/lives.service.ts` called `releaseUndoneClaims()` during restore.
- That method cleared `claimedAt` for any part whose reward flag disappeared from the restored state.
- `apps/api/src/live/live.service.ts` only checked `lastAge === age`, so a restored earlier age could not repeat at the exact same year, but could contribute again after aging.

### Solution

Chosen model: **live participation and rewards are irreversible across restore**.

- Replaced `releaseUndoneClaims` with `preserveClaims(tx, lifeId, state)`.
- On restore, every part with `claimedAt != null` has its window flag re-added to the restored state.
- `claimedAt` is never cleared by restore.
- `contribute` now rejects when `lastAge !== null && age <= lastAge`.
- Window progress and counts are not decremented; a restored branch does not rewrite shared participation history.
- No schema change. Restore remains compatible with all existing saves.

### Trade-off

If a player restores to before a claim, the gold for that branch is forfeited. This is intentional: a paid reward is permanent. The alternative — a full reward/progress ledger with atomic reversal — is a larger schema and product change and is not appropriate for STAGE 01.

### Tests

`apps/api/test/stage15.e2e-spec.ts`:

- claim → restore → claim: `claimedAt` stays set, flag is restored, second claim returns `replayed: true`.
- contribute → restore → contribute: second contribution returns `counted: false`, count stays 1.
- repeated claim request: no second gold grant or version bump.
- concurrent claim requests: exactly one grants gold; the other is a replay.
- restore after a successor exists remains blocked by existing rules.

### Evidence

- Full API e2e: **111/111 passed**.
- Targeted Stage 15 suite passed in the full run.

## A2. Guest → account merge lost LivePart rows

### Original problem

`transferGuestLives` moved `Life` and `GameAction` rows to the account, then deleted the guest player. `LivePart.playerId` cascaded on player deletion, so contributions and claims were lost.

### Solution

Inside the same transaction, before deleting the guest player:

```ts
await tx.livePart.updateMany({ where: { playerId: guestId }, data: { playerId: targetId } });
```

The operation is ordered after lives/actions and before guest deletion. If the transaction fails, all moves roll back and the guest remains intact.

### Tests

`apps/api/test/auth.e2e-spec.ts` creates a live window, a guest contribution with `claimedAt`, logs in, and asserts:

- `LivePart.playerId` is the account player.
- `count` is preserved.
- `claimedAt` is preserved.
- The old guest session is gone.

## A3. Dynasty consequence provenance

### Original problem

`packages/game-core/src/legacy/lineage.ts` cleared `ctx.source` before emitting a delayed consequence, so the chronicle entry lost `sourceEventId`. It also used the consequence id where the original event id was required.

### Solution

- `const source = item.src || item.id`.
- Set `ctx.source`, apply effects, write the chronicle, emit the consequence, then clear it.
- `narrative/consequences.ts` passes an explicit `sourceEventId` through `emit`.
- `world/rules.ts` `Emit` accepts the optional source id.
- `engine/game.ts` forwards it to `pushEntry`.

### Test correction

The existing `stage01-life-upgrade` test loop stopped at age 23 while the consequence was due at age 24. The loop bound was raised from 6 to 10 iterations. This was a test defect, not a reason to weaken the assertion.

### Result

`vitest run test/save.test.ts test/stage01-life-upgrade.test.ts`: **9/9 passed**. Full game-core: **610/610**.

## Additional integrity hardening: history sequence collision

A transient `history_entries_life_id_seq_key` conflict produced a 500 during parallel e2e runs. Root cause: a stale `state.nextSeq` could collide with existing history.

`act` now calls `alignHistoryHead(tx, lifeId, state)` before `applyAction`:

- reads `MAX(seq)` for the life;
- raises `state.nextSeq` to at least `max + 1`;
- persists the normalized state.

A regression test forces `nextSeq = 1`, advances again, and asserts success and monotonic history. This does not change the save schema.

## Save compatibility

- `SAVE_SCHEMA_VERSION` remains **8**.
- New test covers schema versions **5, 6, 7, 8** migrating to 8 with character identity and age preserved, and `parseSave` passing.
- Existing v1–v4 fixtures remain in use.
- Production old-format lives are still readable through the existing migration chain.

## Residual risks

- `parseSave` remains intentionally shallow for some optional world/lineage fields; broader schema validation is a STAGE 02 candidate.
- Restore does not revert insights, `game_actions` from undone branches, or live window totals. These are documented semantics, not reward duplication paths; a future ledger would make them fully reversible.
- Live participation state remains account-level; it is not a shared-world economy yet.
