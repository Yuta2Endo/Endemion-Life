# STAGE 02.5 - Character Creation Agency - Implementation Report

**Status:** COMPLETE in the working tree
**Date:** 2026-11-14
**Scope:** the fifth slice of STAGE 02 - an optional upbringing package, a limited point-buy at birth, server validation, deterministic persistence and creation UI.
**Production:** not changed. No commit, push, deploy, reset, clean or production command was run. Production remains `b634a67`, schema 8.

## 1. Outcome

- A player can choose one **upbringing package** and distribute up to **3 points** across attributes (at most **2 per attribute**). This is a build-defining choice beyond name, gender, race, origin and temperament.
- Packages add stats, starting skills and one known talent. Every package has a negative modifier; the package talent replaces one random birth talent, so it does not increase the talent count.
- The existing **random birth** path is unchanged: omitting both new fields produces the same character as before, with no package and no point-buy.
- The server owns the result. The client sends only `upbringingId` and `statPoints`; `createLifeSchema` and `game-core` validate the package against the world, the skills/talent against the world catalogue, the point budget, per-stat limit and non-negative integer values. Unknown fields, including forged final `stats`, are rejected with 400.
- Creation is deterministic: the same seed and the same choices produce the same character. Packages and points add no calls to the life RNG, and `rngState` after birth is identical for different choices.
- The choice is persisted in `character.creation` and shown in the character sheet and dossier. Save schema is **13**; the 12 -> 13 migration is additive and optional, preserving `seed`, `rngState` and all old fields.
- The creation form shows package cards, skill/talent details, a stat preview and remaining points, with RU/EN strings, a mobile grid and keyboard-accessible controls. The one-click quick birth remains.

## 2. Design summary

### Request

```ts
interface CharacterInput {
  // existing fields...
  upbringingId?: string;              // world-scoped package id
  statPoints?: Partial<Record<StatKey, number>>; // 0..2 each, sum <= 3
}
```

`CreateLifeRequest` mirrors this shape. The server never accepts `stats`, `finalStats`, `character` or any other final-value field.

### State

```ts
interface CharacterCreationState {
  upbringingId?: string;
  statPoints?: Partial<Record<StatKey, number>>;
}

interface CharacterState {
  // ...
  creation?: CharacterCreationState; // optional: old saves do not have it
}
```

### Packages

- 3 common packages available in all six universes: `common-scholar`, `common-martial`, `common-artisan`.
- 1 world-specific package per universe: `df-chapel-ward`, `is-guild-runner`, `mu-sect-yard`, `xx-herb-garden`, `hu-gate-drill`, `ac-salon-upbringing`.
- Each package declares `worlds`, `statMods`, `skills` and `talentId`. The catalogue (`UniverseSummary.upbringings`) only exposes packages whose `worlds` include that universe; `validateCreationChoices` repeats the check and also verifies that every skill and the talent exist in that world.
- Starting skills are capped at `BIRTH_SKILL_MAX = 30`. Final birth stats are clamped to `STAT_MIN..BIRTH_STAT_MAX` exactly as before.

### Validation

| Rule | Layer |
|---|---|
| unknown package, package from another world | `createLifeSchema` shape + `game-core` `INVALID_INPUT` -> 400 |
| wrong world skills/talent | `game-core` -> 400 |
| point values are integers 0..2 | zod + `game-core` -> 400 |
| sum of points <= 3 | zod refine + `game-core` -> 400 |
| `stats`/`finalStats`/`character` supplied | zod strict object -> 400 |
| persisted `character.creation` is malformed | `parseSave` -> `INVALID_SAVE` |

## 3. Files

### New

- `packages/game-core/src/character/upbringing.ts` - package catalogue, point-buy constants, validation and application.
- `packages/game-core/test/stage02-character-creation.test.ts` - 11 tests: valid package/points, exact modifiers, determinism, RNG stability, invalid/foreign packages, budget/negative/unknown keys, old request, schema-12 compatibility, round-trip, catalogue integrity, all-world stat caps.
- `apps/api/test/stage02-character-creation.e2e-spec.ts` - API package/points, rejection, old request, determinism and cross-world validation.
- `apps/web/src/components/creation-choices.tsx` - package picker and point-buy controls.
- `apps/web/src/components/creation-choices.test.tsx` - RU/EN render, budget and disabled-control tests.
- `apps/web/src/components/create-form.test.tsx` - full form render test, including the quick-birth button.
- `docs/stage-02/CHARACTER_CREATION.md` - focused creation model and API reference.
- `docs/stage-02/STAGE_02_5_REPORT.md` - this report.

### Modified - core

- `packages/game-core/src/types.ts` - `CharacterCreationState`, optional `CharacterState.creation`.
- `packages/game-core/src/stats.ts` - `StatPointAllocation`.
- `packages/game-core/src/character/generator.ts` - new optional inputs, package/point application, final clamps.
- `packages/game-core/src/character/birth.ts` - package talent is kept, excluded from random rolls, counts toward the normal talent budget and cannot conflict with a rolled weakness; a birth biography paragraph records the upbringing.
- `packages/game-core/src/catalog.ts` - `UpbringingView`, `UniverseSummary.upbringings`, `pointBuy`, `creationUpbringing()`.
- `packages/game-core/src/engine/profile.ts` - `LifeProfile.upbringing`.
- `packages/game-core/src/engine/game.ts` - `SAVE_SCHEMA_VERSION = 13`.
- `packages/game-core/src/engine/save.ts` - 12 -> 13 migration and optional `character.creation` validation.
- `packages/game-core/src/index.ts` - public exports for packages, constants and helpers.

### Modified - shared / API / web

- `packages/shared/src/schemas.ts` - `upbringingId`, strict `statPoints`, budget refine.
- `packages/shared/test/schemas.test.ts` - 2 creation contract/view tests.
- `apps/web/src/components/create-form.tsx` - creation state, payload, package/point preview.
- `apps/web/src/components/play/character-sheet.tsx` - upbringing line.
- `apps/web/src/components/play/dossier.tsx` - upbringing, skills and talent in biography.
- `apps/web/src/lib/messages.ts` - RU/EN creation/dossier/sheet strings.

### Modified - schema expectations

Existing regression tests that asserted schema 12 now assert 13 in:

- `packages/game-core/test/stage04-3-relics.test.ts`
- `packages/game-core/test/stage04-5-2-dynasty-world-influence.test.ts`
- `packages/game-core/test/stage04-5-3-generational-memory.test.ts`
- `packages/game-core/test/stage04-5-4-world-feedback.test.ts`
- `packages/game-core/test/stage04-5-world-narrative.test.ts`
- `packages/game-core/test/stage04-dynasty.test.ts`
- `packages/game-core/test/stage05-adventure.test.ts`
- `packages/game-core/test/stage06-balance.test.ts`
- `packages/game-core/test/stage06-region.test.ts`
- `packages/game-core/test/stage07-dynasty.test.ts`
- `packages/game-core/test/stage08-dynasty.test.ts`
- `packages/game-core/test/stage09-world.test.ts`
- `packages/game-core/test/stage10-mastery.test.ts`
- `packages/game-core/test/stage10-world-integration.test.ts`

### Explicitly not touched

`apps/api/src/portal/`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts` and `.env.example` were already modified/untracked before this task and were left exactly as found. No portal code was changed.

## 4. Verification

Run from `G:\III\endemion-life`:

| Command | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **PASS** - 47 files, 673 tests |
| `pnpm test:api` | **PASS** - 14 files, 118 tests |
| `pnpm --filter @endemion/shared test` | **PASS** - 2 files, 18 tests |
| `pnpm --filter @endemion/web test` | **PASS** - 6 files, 20 tests |
| `pnpm typecheck` | **PASS** |
| `pnpm lint` | **PASS** - 0 errors; one pre-existing `react-hooks/exhaustive-deps` warning in `play-screen.tsx` |
| `pnpm --filter @endemion/web build` | **PASS** |

## 5. Risks and notes

- **Schema 13 is not deployable to production schema 8.** Production cannot parse schema-13 saves. Deployment must wait for the approved release process; no deploy was attempted here.
- The 12 -> 13 migration is a no-op that only advances the version. Old lives remain without an upbringing; that is intentional, not a bug.
- Package talents replace one random talent rather than adding a fourth. This keeps the existing talent budget and avoids a strict power increase.
- Packages are world-scoped but the common three make every world playable even if a world-specific package is later removed.
- The API e2e suite requires the local PostgreSQL test database (`DATABASE_URL_TEST`); it passed in this environment. The full API run logs intentional failure-injection tests from `reliability.e2e-spec.ts`, not failures of the suite.
- The only lint output is the pre-existing `play-screen.tsx` hook dependency warning; it is not introduced by this stage.
