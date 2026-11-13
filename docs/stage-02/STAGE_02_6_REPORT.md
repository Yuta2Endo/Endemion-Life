# Stage 02.6 — Balance & Long-Run Soak: Report

**Status: Stage 02 is complete and deployed.** Stage 02.1–02.6 are implemented and verified on schema 13. Production runs the Stage 02 code (`c280c16`, release `8fd0dfc`) with save schema 13.

- Baseline: `HEAD 5f26f8e` (Stage 02.5), save schema 13.
- Scope: deterministic single-life soak, invariants, aggregate metrics, schema-8 migration, documentation.
- No commit, push, deploy, reset, clean or file deletion was performed.
- Portal-only files (`.env.example`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `apps/api/src/portal/`) and the pre-existing untracked reports/docs were left untouched.

## Deliverables

| File | Change |
| --- | --- |
| `packages/game-core/test/stage02-soak.ts` | New deterministic harness: 6 universes × 4 playbooks × N seeds, public APIs only, invariant checks and aggregate metrics. |
| `packages/game-core/test/stage02-balance-soak.test.ts` | New CI/full soak test, determinism check, schema-8 migration tests. |
| `docs/stage-02/BALANCE_SOAK.md` | Methodology, invariants, full metrics, thresholds, migration analysis and risks. |
| `docs/stage-02/STAGE_02_6_REPORT.md` | This close-out report. |

No `packages/game-core/src/**` file was modified. No production source, API, database, portal or web behavior was changed.

## How the soak works

- **CI size:** 72 lives — 6 universes × 4 playbooks × 3 seeds. Test runtime ~4.1 s.
- **Full size:** 1008 lives — 6 universes × 4 playbooks × 42 seeds. Enable with `ENDEMION_FULL_SOAK=1`; final observed runtime 51.9 s (test file 53.4 s).
- Each life runs from birth to death or age 90. Playbooks cover education, career/promotion/retirement, renting/buying a home, opening/business decisions, and travel between settlements. Events are resolved by deterministic effect scoring, with dangerous meters/flags penalised.
- Every action checks health, wealth, age/version/history/sequence, education, career, household, business, location and state-size bounds. A full `parseSave` JSON round trip runs every eight actions and at death. Generation/continuation must stay at a single life.
- Metrics printed by the test include death-age distribution, causes, education levels, employment/retirement, home ownership, business survival, travel use, wealth percentiles and save-state size.

## Full-run metrics (1008 lives)

| Metric | Result |
| --- | --- |
| Death age | p10 **60**, median **74**, p90 **84**, mean **71.3** |
| Alive at 90 | 165 / 1008 (16.4%) |
| Death causes | old age **762**, wounds **73**, illness **8** |
| Education | none **12.0%**, tier 1 **29.2%**, tier 2 **32.2%**, tier 3 **26.6%** |
| Ever employed / promoted / retired | **97.6% / 71.1% / 74.6%** |
| Employed / retired at end | **21.2% / 74.6%** |
| Highest observed wage | **20** gold/year; every employed wage was > 0 |
| Ever rented / ever owned / owned at end | **58.9% / 55.5% / 51.7%** |
| Businesses opened / lives with a failure / active at end | **85.0% / 1.4% / 84.1%** |
| Travel used / moves | **70.8% / 1247** (1.24 moves per life) |
| Final wealth | p10 **19**, median **240**, p90 **826**, max **2195**; cap hits **0** |
| Lives with a health condition | **46.2%**; lowest health 0 (at death) |
| Save size | average **39,457 B**, max **80,050 B (78.2 KiB)** |
| Max history in one life | **239** entries |

Per-universe breakdown is in `BALANCE_SOAK.md`. The CI 72-life run reproduces the same picture: death p10/median/p90 59/74/89, old age dominating, 45.8% with a condition, 97.2% ever employed, 76.4% ever retired, 62.5% ever owning a home, 77.8% opening a business, 72.2% using travel, wealth median 249, max save 61,769 B.

## Defects fixed

**Game-core: none required.** No invariant failure, no negative or runaway wealth, no zero wage, no impossible retirement, no unbounded condition list or array, and no save/load or migration failure was found. No game rules were changed.

**Harness: one defect fixed before the final metrics.** The initial choice score ignored dangerous world meters and flags, so the policy took the murim demonic path in nearly every life and produced misleading mortality (p10 43, 109 wound deaths). The score now penalises `qi-deviation`, `corruption`, `gate-threat` and `demonic-path`. Final full-run p10 is 60. This is a test-policy correction, not a game change.

## Verification commands and results

| Command | Result |
| --- | --- |
| `pnpm --filter @endemion/game-core test` | **Pass**: 48 test files, **679 tests**. ~10.0 s. |
| `pnpm --filter @endemion/game-core exec vitest run test/stage02-balance-soak.test.ts --reporter=verbose` | **Pass**: 6 tests, 72-life CI soak plus migration and determinism checks. ~5.6 s. |
| `$env:ENDEMION_FULL_SOAK='1'; pnpm --filter @endemion/game-core exec vitest run test/stage02-balance-soak.test.ts --reporter=verbose` | **Pass**: 1008 lives, 6 tests, no invariant failures; 51.9 s for the soak (53.4 s file). |
| `pnpm test:api` | **Pass**: 14 files, **118 tests**, ~81.5 s. The logs contain intentional `injected history failure` and rate-limit 503 cases from failure-path tests; the suite exits 0. |
| `pnpm --filter @endemion/shared test` | **Pass**: 2 files, **18 tests**. |
| `pnpm --filter @endemion/web test` | **Pass**: 6 files, **20 tests**. |
| `pnpm typecheck` | **Pass**: packages database/ui/game-core/shared, `apps/api`, `apps/web`. |
| `pnpm lint` | **Pass** (exit 0). One pre-existing warning: `apps/web/src/components/play/play-screen.tsx:173` — `react-hooks/exhaustive-deps` for `perform`; not introduced by this slice. |
| `pnpm --filter @endemion/web build` | **Pass**: Next.js 16.4.4 production build, 12 static pages generated. |

## Migration 8 → 13 for production

The test constructs a real mid-life save (age 20–30) from the current engine, strips everything added after schema 8 (`health`, `education`, `career`, `household`, `business`, `location`, `character.creation`), sets `schemaVersion = 8`, and loads it through `parseSave` for all six worlds. It also loads the packaged `SAVES_V8` fixtures and a variant with no `world`/`social`.

Result: **all snapshots migrate to schema 13 without data loss.** Seed, `rngState`, name, age, world, economy, lineage, adventure, region and mastery are unchanged; after removing the newly added fields, the snapshot equals the original. Added state is constant-size (< 8 KiB in the synthetic test), and the live save continues advancing with a growing version and non-decreasing age. The strict save check still rejects formats newer than 13.

Migration risks to carry into the production rollout:

1. **Health starts from resources.** A schema-8 save near zero resource health gets low long-term health and may die sooner; no historical conditions can be reconstructed.
2. **Profession becomes a rank-0 career.** `career.since` = current age, `tenure` = 0, and income switches from the old profession formula to `careerWage`. Budgets may change. No diploma/rank is invented.
3. **Housing/business reset.** Schema-8 saves did not have these systems, so migrated lives start homeless with no ventures. This is additive, but player-visible.
4. **Location is inferred.** The migration uses the saved world's settlement if present, otherwise the first world settlement. Travel history starts empty.
5. **Creation is absent.** `character.creation` stays undefined; no upbringing or stat points are invented.
6. **Size.** Added objects are fixed-size, so a large production save should not grow by per-year arrays. The 256 KiB soak guard is a safety net, not a production quota.

Production was not touched; the deployment path remains outside this slice.

## Remaining balance risks

- **Business failure is rare.** 85% of lives open a venture, but only 1.4% ever fail one; 84.1% end with an active business. Normal years outweigh bad years and `MAX_BUSINESS_LOSSES = 10` is rarely reached. A future balance pass could raise risk/loss or reduce margins; this would be a design change, so it was not made here.
- **Murim has a heavy low tail.** Median age 67, but p10 28 and 51/168 wound deaths. Demonic-path qi deviation (2–4 points/year, health damage from 60) is the main driver. It is deliberately high-risk, but it dominates early mortality. Its annual resource-health damage reaches zero before a named condition is attached, so those deaths appear as "wounds" rather than a qi-deviation cause — a cause-attribution/reporting limitation, not a changed mechanic.
- **Conditions are shallow.** 46.2% of lives ever have a condition, but no life holds more than one at a time against a limit of six; cures and recovery are strong relative to onset.
- **Education access varies by world.** Tier 2+ completion ranges from 38.7% (hunter) to 79.8% (academy), following school access and early income. This is content/pacing, not a crash or invariant risk.
- **Long-lived saves are the largest.** xianxia/academy have the most age-90 survivors and the largest observed state (78.2 KiB, still well below the 256 KiB guard). Watch this if future stages add more per-year arrays.

## Close-out

Stage 02 (02.1 health, 02.2 education/career, 02.3 household/property/business, 02.4 travel, 02.5 creation, 02.6 soak) is **closed**. Save schema stays **13**.\n\n## Post-deployment note (2026-11-13)\n\nStage 02 was subsequently deployed. Production history records `current=8fd0dfc`, `previous=c280c16`; the Stage 02 code commit is `c280c16`. Pre-deploy backup `endemion_life-manual-20261113T184449Z.dump` passed a full trial restore. `/api/health`, `/worlds` and `/api/universes` returned 200 after deployment; schema-9 lives were readable by the schema-13 code. Immediate rollback is `c280c16`; `ca72b8b` requires a database restore because it cannot read schema >8.
