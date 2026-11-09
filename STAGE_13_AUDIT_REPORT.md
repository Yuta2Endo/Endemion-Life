# Stage 13 Audit Report — Late-Game Soak & Debt Cleanup

## Scope
- Repo: `G:/III/endemion-life`, branch `main`, HEAD `c7951d0`.
- Production `https://life.endemion.online` — no deploy, no commit, no push.
- `SAVE_SCHEMA_VERSION = 8` unchanged (`packages/game-core/src/engine/game.ts:58`); no new persisted fields/migrations.
- Stage covers all six worlds: `dark-fantasy`, `isekai`, `murim`, `xianxia`, `hunter`, `academy`.

## Method
Synthetic deterministic late-game soak per world (new `packages/game-core/test/stage13-soak.test.ts`):
- One "generation block" = 25 years of `worldTick` on a persistent state; 10 blocks = 250 simulated years per world per condition.
- Conditions per world: `dynastyRenown = 60` (late-game/high) vs `dynastyRenown = 0` (control). Age advances across blocks; world state persists.
- Also runs realistic succession chains (`succeed`) for up to 10 generations using a deterministic family-prioritizing action policy (marriage → children, then youth/best-kin heir selection), to document how far real lineages go under current rules.

## Results — synthetic soak (renown 60 vs control)
All values are per-world means over 250 yearly samples / 10 block-end snapshots.

| World | High mean/prosperity | High p50/p90 | High stability mean | High final prosperity/stability | High atMax (final) | First full block | Control mean/prosperity | Control stability mean | Control atMax |
|---|---|---|---|---|---|---|---|---|---|
| dark-fantasy | 95.19 | 99.67 / 100 | 94.59 | 99.67 / 100 | 2 | gen 7 | 51.58 | 67.30 | 0 |
| isekai | 95.05 | 99.67 / 100 | 94.74 | 99.67 / 100 | 2 | gen 4 | 50.70 | 58.39 | 0 |
| murim | 95.01 | 99.67 / 100 | 95.14 | 99.67 / 100 | 2 | gen 4 | 57.33 | 73.72 | 0 |
| xianxia | 94.53 | 99.67 / 100 | 94.59 | 100 / 100 | 3 | gen 3 | 59.98 | 81.42 | 0 |
| hunter | 95.51 | 99.67 / 100 | 95.35 | 100 / 100 | 3 | gen 5 | 50.93 | 67.91 | 0 |
| academy | 95.30 | 99.67 / 100 | 94.95 | 99.67 / 100 | 2 | gen 4 | 50.08 | 64.80 | 0 |

All high-renown worlds:
- end at prosperity/stability ≥ 95 (final stability exactly 100 everywhere);
- p50 ≥ 99.67, p90 = 100;
- reach at least one fully-saturated block (all 3 settlements at prosperity 100) by generation 7 at the latest;
- hold dynasty renown 60, faction relations 24, activities count 24 (clamped max).
Control (renown 0) stays near initial prosperity (final 50–63) with zero fully-saturated blocks; high vs control mean gap > 44 (Stage 11–12 baseline required > 20).

## Results — realistic succession chains (up to 10 generations, family-prioritizing)
| World | Completed generations | Total years | Notes |
|---|---|---|---|
| dark-fantasy | 10 | 710 | reaches the 10-generation target |
| hunter | 9 | 710 | stalls near target |
| isekai | 8 | 600 | stalls near target |
| murim | 5 | 376 | stalls mid-chain |
| academy | 3 | 363 | stalls early |
| xianxia | 1 | 126 | stalls after gen 1 |

Deterministic (same inputs → identical run) and bounded: no crashes, no infinite loops, no NaN metrics, world bounds respected (prosperity/stability 0–100, faction relations ±30, activities ≤ 24).

## Balance decision
No simulation constants or balance values were changed. Late-game saturation is reproduced exactly versus Stage 11–12 baseline (high renown saturates prosperity/stability; control does not), and 250-year soaks show sustained saturation rather than unbounded growth.

Confirmed limitation: real successions cannot reliably reach 10 generations in long-lived worlds (`xianxia` 1, `academy` 3, `murim` 5). Player reproduction events are age-capped (`common.heir` maxAge 45, first-love maxAge 30, marriage-alliance maxAge 35) while lifespans exceed 100–200 years, so old heirs cannot sire another heir. This is a gameplay/design observation, not a defect introduced by Stage 13. Addressing it would require a balance/gameplay change (e.g. older reproduction/adoption), which Stage 13 intentionally avoids.

## Lint debt
Root `pnpm lint` now exits 0 (previously exit 1).
- Excluded generated Android build output `android/**/build/**` from root `eslint.config.js` (removed 45 errors from `native-bridge.js`).
- Fixed `prefer-const` in `packages/game-core/test/stage01-life-upgrade.test.ts:59` (`let state` → `const state`; property mutation only).
- Pre-existing web warning `play-screen.tsx:170` (`react-hooks/exhaustive-deps` missing `perform`) left untouched; `pnpm --filter @endemion/web lint` exits 0 with that 1 warning.

## Encoding/schema
All touched files verified UTF-8 without BOM, no U+FFFD replacement characters. `SAVE_SCHEMA_VERSION` remains 8. No deploy, no commit, no push performed.
