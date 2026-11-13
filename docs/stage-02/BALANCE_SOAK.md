# Stage 02.6 — Balance & Long-Run Soak

Status: **complete**. This is the final Stage 02 slice. It verifies the Stage 02.1–02.5 life loop over long runs and records the remaining balance risks. It does not add game features or change the save schema.

## What runs

| Piece | Path |
| --- | --- |
| Deterministic soak harness | `packages/game-core/test/stage02-soak.ts` |
| CI / full test | `packages/game-core/test/stage02-balance-soak.test.ts` |
| Balance documentation | this file |
| Stage close-out | `docs/stage-02/STAGE_02_6_REPORT.md` |

The harness uses only public `game-core` APIs: `newGame`, `applyAction` (`advance`, `choose`, `travel`), `presentEvent`, `presentLocation`, `parseSave`, `educationTier`, `careerWage`, catalogue lookups and state types. It does not read the database, network or clock, and it does not mutate state outside an action. All randomness comes from the life seed and saved `rngState`.

### Lives and playbooks

Every life starts at birth and ends at death or at age 90. Each universe is played with four deterministic playbooks:

- **scholar** — values schooling, then a career and promotion;
- **worker** — values an early career, promotion and retirement;
- **estate** — values education, career, buying/renting a home and opening a business;
- **wanderer** — values career/business and travels between settlements more often.

Choices are picked by a deterministic effect score. Education, career, promotion, housing and business effects add score; death, new conditions, health loss, dangerous meters (`qi-deviation`, `corruption`, `gate-threat`) and known long-term penalties subtract score. Checks are scored by their success chance and failure effects. There is no optimal-player claim: the point is to exercise all life systems reproducibly, not to maximise a score.

### Sizes

| Mode | Command | Lives | Runtime observed |
| --- | --- | --- | --- |
| CI | `pnpm --filter @endemion/game-core test` | 72 (6 universes × 4 playbooks × 3 seeds) | ~4.1 s for the soak test; ~10 s for the whole package |
| Full | `$env:ENDEMION_FULL_SOAK='1'; pnpm --filter @endemion/game-core test` (PowerShell) | 1008 (6 × 4 × 42) | ~52 s for the soak test |

On POSIX shells the full run is `ENDEMION_FULL_SOAK=1 pnpm --filter @endemion/game-core test`. The environment variable is read only by the test; production and the package build do not depend on it.

## Invariants asserted

The harness checks the following at every action, with a deep `NaN`/`Infinity` scan and a full `parseSave` round trip every eight actions and at death:

- **Health** — `0 ≤ health.value ≤ 100`, integer; at most 6 unique conditions; severity 1–3, damage 1–20, remaining 0–20, onset not in the future; death cause in `health` and `life` agree.
- **Wealth** — integer, finite, `0 ≤ wealth ≤ WEALTH_MAX` (1,000,000,000); peak wealth also capped. No cap hit was observed.
- **Time and history** — age never decreases; version increases by exactly 1 per accepted action; history `seq` is contiguous, entry age is not in the future, and `nextSeq === lastSeq + 1`; one life has at most 600 history entries.
- **Education** — a current course exists in the world catalogue, its duration is 1–8 years, progress is below duration and does not exceed the age since enrolment, and its tier is exactly the next tier after the completed diploma.
- **Career** — `employed` and `retired` are never both true; either state requires a profession; rank is within the track ladder; `since` and `tenure` are not in the future; an employed character has a finite wage greater than zero. With no profession, rank/tenure/since are all zero.
- **Household** — residence is `homeless`, `rent` or `own`; non-homeless states reference a real home; rent has zero condition; own-home condition is 0–100; arrears ≤ 2; `since` is not in the future.
- **Business** — at most 2 ventures, real catalogue ids, no duplicates, level ≤ the venture's max, capital 0–`WEALTH_MAX`, years not in the future, losses ≤ 10.
- **Location** — current settlement exists in the world catalogue; every recorded move references real settlements, age ≤ current age, cost 0–`WEALTH_MAX`, and the history is at most 24 moves.
- **Bounded arrays/state** — NPCs ≤ 90 (observed 30), conditions ≤ 6 (observed 1), scheduled events ≤ 20 (observed 3), consequences ≤ 12 (observed 2), memory ≤ 12 (observed 12), recent events ≤ 4, world activity log ≤ 24 (observed 24), economy years ≤ 10, social relationships/stories ≤ 400/200 (observed 42/12), lineage chronicle ≤ 1000 (observed 94). Save state is capped at 256 KiB; observed maximum was **80,050 bytes (78.2 KiB)**.
- **Single life** — generation stays 1, `lineage.continuedBy` stays `null`, and at most one life record exists. Succession is deliberately out of scope.
- **Save/load** — `parseSave(JSON.parse(JSON.stringify(state)))` returns the same object at schema 13, and the final state of every life is round-tripped before metrics are accepted.
- **All worlds** — all six universe ids complete without an exception or invariant failure.

## Full-run metrics (1008 lives)

Measured on 2026-11-14 with schema 13, `HEAD 5f26f8e` plus this slice in the working tree.

| Metric | Result |
| --- | --- |
| Death age | p10 **60**, median **74**, p90 **84**, mean **71.3** |
| Alive at 90 | 165 / 1008 (16.4%) |
| Death causes | old age **762**, wounds **73**, illness **8** |
| Education | none **12.0%**, tier 1 **29.2%**, tier 2 **32.2%**, tier 3 **26.6%** |
| Ever employed / promoted / retired | **97.6% / 71.1% / 74.6%** |
| Employed / retired at end | **21.2% / 74.6%** |
| Highest observed wage | **20** gold/year (all employed wages > 0) |
| Ever rented / ever owned / owned at end | **58.9% / 55.5% / 51.7%** |
| Businesses opened / lives with a failure / active at end | **85.0% / 1.4% / 84.1%** |
| Travel used / total moves / average moves | **70.8% / 1247 / 1.24** |
| Final wealth | p10 **19**, median **240**, p90 **826**, max **2195**; cap hits **0** |
| Lives with a health condition | **46.2%**; lowest health reached **0** (at death) |
| Save size | average **39,457 B**, max **80,050 B (78.2 KiB)** |
| Max history entries in a life | **239** |

### Per universe (full run)

| Universe | Death p10 / median / p90 | Alive at 90 | Tier 2+ education | Ever employed | Ever retired | Ever owned | Business opened (failed) | Travel used | Final wealth p50 / p90 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dark-fantasy | 58 / 67 / 73 | 0 | 48.8% | 95.2% | 33.3% | 49.4% | 79.2% (0.0%) | 70.8% | 170 / 461 |
| isekai | 68 / 76 / 86 | 14 | 69.0% | 100% | 89.3% | 69.6% | 94.6% (1.2%) | 76.8% | 434 / 1064 |
| murim | 28 / 67 / 82 | 8 | 60.1% | 92.3% | 56.0% | 33.3% | 72.0% (0.6%) | 61.3% | 129 / 568 |
| xianxia | 63 / 71 / 89 | 80 | 56.5% | 98.8% | 76.8% | 75.6% | 98.2% (0.0%) | 73.8% | 432 / 1006 |
| hunter | 73 / 77 / 82 | 0 | 38.7% | 100% | 95.8% | 53.6% | 85.7% (4.2%) | 69.6% | 137 / 643 |
| academy | 72 / 77 / 85 | 63 | 79.8% | 99.4% | 96.4% | 51.2% | 80.4% (2.4%) | 72.6% | 243 / 1083 |

The CI subset of 72 lives produced the same qualitative picture: death p10/median/p90 59/74/89, old-age deaths dominating, 12 lives alive at 90, 45.8% with a condition, 97.2% ever employed, 76.4% ever retired, 62.5% ever owning a home, 77.8% opening a business (0 failures in this small sample), 72.2% using travel, final wealth p10/median/p90 21/249/858, max save **61,769 B**.

## Findings and fixes

**No game-core invariant or balance fix was required.** The run found no negative or non-finite wealth, no runaway wealth, no zero wage while employed, no impossible retirement, no duplicate/oversized condition list, no unbounded state array and no save/load or migration failure.

One defect was found **in the harness itself** and fixed before the final run: the first choice score ignored dangerous world meters and flags, so the policy chose the murim demonic path almost every time. That produced a misleading p10 death age of 43 and 109 wound deaths. The score now penalises dangerous meters (`qi-deviation`, `corruption`, `gate-threat`) and `demonic-path`; the final full-run p10 is 60. This changed only test policy, not game rules.

## Remaining balance risks

These are observations, not changes. Changing them would be a balance redesign and is out of scope for 02.6.

1. **Business risk is weak.** 85% of lives open a business, but only 1.4% ever see one fail; 84.1% end with an active business. A typical venture earns more in a normal year than it loses in a bad one, and `MAX_BUSINESS_LOSSES = 10` is rarely reached. Business failure is therefore mostly decorative. A future balance pass should either raise bad-year frequency/loss size or lower margins, not add a new system.
2. **Murim is the deadliest world.** Median age is 67, but p10 is 28 and 51 of 168 lives die of wounds. This is largely the demonic-path qi-deviation rule: it accumulates 2–4 points a year and damages resource health from 60. It is a deliberate high-risk path, but it dominates the low tail. The annual damage currently reaches zero resource health before a condition is attached, so these deaths surface as "wounds" rather than a named qi-deviation cause. This is a cause-attribution/reporting limitation; no mechanics were changed.
3. **Conditions are rare and shallow.** 46.2% of lives ever have a condition, but no life held more than one at a time, against a limit of six. Recovery and cure events are strong relative to condition onset. This is benign for invariants but means the six-slot condition model is under-exercised.
4. **Education is uneven by world.** Tier 2+ completion ranges from 38.7% in hunter to 79.8% in academy. This follows school availability and early income; it is a content/pacing risk, not a crash or invariant risk.
5. **Long-lived worlds accumulate the most state.** xianxia and academy have many lives alive at 90 and the largest saves (max 78.2 KiB). The size is well under the 256 KiB guard, but it is the direction to watch if future stages add more per-year arrays.

## Migration: production schema 8 → 13

Production now runs schema 13 (deployed 2026-11-13; code `c280c16`, release `8fd0dfc`). The migration test below remains the pre-deploy validation. It builds a real mid-life state (age 20–30) from the current engine, removes fields that did not exist in schema 8 (`health`, `education`, `career`, `household`, `business`, `location`, `character.creation`), sets `schemaVersion = 8`, and loads it through `parseSave` for all six worlds. It also covers the packaged `SAVES_V8` fixtures and a variant with no `world`/`social`.

Result: every snapshot reaches schema 13 without losing seed, `rngState`, name, age, world, economy, lineage, adventure, region or mastery. After removing the newly added fields, the rest of the snapshot is structurally equal to the schema-8 original. Migration added less than 8 KiB in the synthetic test, and the state stayed below the 256 KiB guard. Live saves continue to advance afterwards; the version grows and the age never moves backwards.

Migration steps and risks:

- **8 → 9** — health is derived from `character.resources.health`; a dead save keeps its existing death cause. A v8 character who was near zero resource health starts with low long-term health and may die sooner. No condition history can be reconstructed.
- **9 → 10** — a v8 `professionId` becomes an employed career at rank 0 with `since = current age` and `tenure = 0`. Salary switches from the old profession formula to the career wage. This can change an existing save's yearly budget; it invents no rank or diploma.
- **10 → 11** — v8 saves did not have a household or business, so they start homeless with no ventures. This is additive, not data loss, but is player-visible.
- **11 → 12** — location is taken from a settlement that already exists in the saved world, otherwise the world's first settlement. Travel history starts empty.
- **12 → 13** — no-op; `character.creation` stays absent. No upbringing or stat points are invented.
- **Size** — all added objects are constant-size. Large production saves with a long lineage chronicle/NPC roster should not grow by per-year arrays; only the current health/course/career/home/business/location objects are added. The strict schema check still rejects a save newer than 13 and malformed old fields.

## Reproduce

```powershell
# CI subset (72 lives)
pnpm --filter @endemion/game-core test

# Full 1008-life run
$env:ENDEMION_FULL_SOAK='1'
pnpm --filter @endemion/game-core test
Remove-Item Env:ENDEMION_FULL_SOAK

# Only the soak test with verbose metrics
pnpm --filter @endemion/game-core exec vitest run test/stage02-balance-soak.test.ts --reporter=verbose
```
