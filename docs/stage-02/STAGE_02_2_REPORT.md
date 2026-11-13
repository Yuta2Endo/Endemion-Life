# STAGE 02.2 — Education & Career — Implementation Report

**Status:** COMPLETE in the working tree
**Date:** 2026-11-13
**Scope:** second slice of STAGE 02 — education progression, career progression and annual economy integration.
**Production:** not changed. No commit, push, deploy, reset, clean, DB migration or production command was run.

## 1. Outcome

- **Education** is a player-chosen, multi-year path: childhood schooling → trade/academy → higher learning. Each step has an age gate, a prerequisite tier, a duration and a per-year tuition. Completion grants the existing `character.educationId` diploma, its skills, and opens a specialization choice.
- **Career** is one coherent state: `character.professionId` is the current/last job; `career` stores rank, rank start age, tenure, employment and retirement. Tracks exist for every profession of all six universes. Entry requires the track's education tier and skill level. Promotion raises rank and wage; layoff keeps the profession name but stops pay; retirement stops pay and has a hard backstop.
- **Economy:** two lines were added — `wage` and `tuition`. The old `profession` formula is suppressed when a career track exists, so the same job is never counted twice. `economyYear` still applies exactly one net wealth change through `applyEffect` (clamped to `0..WEALTH_MAX`).
- **Events:** generated per universe for school, trade/academy, higher learning, specialization, job offer, promotion, layoff and retirement. All are normal event/choice content; no new `GameAction` type.
- **UI:** compact “Education and career” panel in the existing dossier Skills tab, plus a one-line status in the character sheet. RU/EN strings added; no tabs removed.
- **Save:** schema **10**, additive 9→10 migration, preserving `seed`, `rngState` and all existing data.

## 2. Design summary

### Education state

```ts
interface EducationState {
  currentId: string | null; // course in progress
  startedAt: number;
  progress: number;
  duration: number;
}
```

`character.educationId` remains the single completed diploma. Ladder:

| Tier | Min age | Duration | Requires |
|---|---:|---:|---|
| 1 — schooling / letters | 6 | 2 years | — |
| 2 — trade / guild / academy / sect outer court | 12 | 3 years | tier 1 |
| 3 — university / institute / inner court / tower | 17 | 4 years | tier 2 |

Tuition per year: dark-fantasy 0/6/14, isekai 0/8/18, murim 0/6/12, xianxia 0/8/16, hunter 0/10/22, academy 0/12/26.

### Career state

```ts
interface CareerState {
  rank: number;      // 0..2
  since: number;     // age current rank began
  tenure: number;    // years in the current profession
  employed: boolean;
  retired: boolean;
}
```

Each track defines education tier, entry skill/minimum, three rank names and wages, promotion years and retirement age. Wage = rank wage + `min(3, floor(skill / 12))`; the economy cycle and tax apply on top exactly like other earned income.

Employment status is derived in one place: `retired`, `employed`, else `unemployed`. A new job resets rank and tenure. Retirement is offered at the track's retirement age and forced at `retirementAge + 3`.

### Economy lines

- `wage` — only while employed; replaces the legacy profession income for career tracks.
- `tuition` — only while a course is in progress.
- Odd jobs are disabled while employed or retired.
- `economyYear` applies one net delta; tests compare the wealth change to the saved line sum exactly once.

## 3. Files

### New

- `packages/game-core/src/life/education.ts` — ladder, prerequisites, enrollment, yearly progress/completion, tuition, view.
- `packages/game-core/src/life/careers.ts` — career catalog, entry rules, wages, promotion, layoff, retirement, yearly career step, view.
- `packages/game-core/src/narrative/career-events.ts` — per-universe education/career event generation.
- `packages/game-core/test/stage02-education-career.test.ts` — 15 tests.
- `packages/game-core/test/fixtures/saves-v9.ts` — schema-9 alive/dead/employed fixtures.
- `docs/stage-02/EDUCATION_CAREER.md` — focused model document.
- `docs/stage-02/STAGE_02_2_REPORT.md` — this report.

### Modified — core

- `packages/game-core/src/types.ts` — `EducationState`, `CareerState`, employment status, `career` ChangeKind, `wage`/`tuition` economy lines, `GameState.education`/`career`.
- `packages/game-core/src/engine/game.ts` — schema 10, new-life state, action/restore normalization.
- `packages/game-core/src/engine/save.ts` — 9→10 migration and strict `checkEducation`/`checkCareer`.
- `packages/game-core/src/engine/effects.ts` — enroll/start/promote/lose/retire/severance effects; education/diploma integration; profession grants start a career.
- `packages/game-core/src/engine/conditions.ts` — studying/employment/rank/tenure/risk/promotion/retirement conditions and descriptions.
- `packages/game-core/src/life/aging.ts` — yearly education and career steps.
- `packages/game-core/src/legacy/succession.ts` — heirs get education/career initialized from their NPC record.
- `packages/game-core/src/economy/economy.ts` — wage/tuition lines, suppression of the legacy profession line, one net wealth application.
- `packages/game-core/src/narrative/types.ts` — new effect/condition unions.
- `packages/game-core/src/narrative/dsl.ts` — `fx.enrollEducation`, `fx.startCareer`, `fx.promoteCareer`, `fx.loseCareer`, `fx.retireCareer`, `fx.severance`; `when.studying`, `when.employment`, `when.careerRank`, `when.tenure`, `when.careerRisk`, `when.promotionReady`, `when.retirementDue`.
- `packages/game-core/src/narrative/selection.ts` — content validation for education/career ids.
- `packages/game-core/src/universes/registry.ts` — appends generated career/education events.
- `packages/game-core/src/index.ts` — public exports.

### Modified — shared / web

- `packages/shared/src/views.ts` — `LifeView.education` and `LifeView.career`.
- `packages/shared/test/schemas.test.ts` — view coverage and retired-wage assertion.
- `apps/web/src/components/play/dossier.tsx` — compact Education and career panel.
- `apps/web/src/components/play/character-sheet.tsx` — compact status line.
- `apps/web/src/lib/format.ts` — career history change labels.
- `apps/web/src/lib/messages.ts` — RU/EN education/career strings.

### Modified — schema expectations only

`stage04-3-relics`, `stage04-5-2-dynasty-world-influence`, `stage04-5-3-generational-memory`, `stage04-5-4-world-feedback`, `stage04-5-world-narrative`, `stage04-dynasty`, `stage04-economy`, `stage04-market`, `stage05-adventure`, `stage06-balance`, `stage06-region`, `stage07-dynasty`, `stage08-dynasty`, `stage09-world`, `stage10-mastery`, `stage10-world-integration`. Changes move hard-coded schema 9 to 10 and exclude the two additive fields in migration-equality tests.

### Explicitly not touched

`apps/api/src/portal/`, `apps/api/src/app.module.ts`, `apps/api/src/config.ts`, `.env.example`. These already had uncommitted portal work before this task and were left exactly as found. They are pre-existing working-tree changes, not Stage 02.2 edits.

## 4. Verification

Run from `G:\III\endemion-life`:

| Command | Result |
|---|---|
| `pnpm --filter @endemion/game-core test` | **PASS** — 44 files, 635 tests |
| `pnpm test:api` | **PASS** — 12 files, 111 tests |
| `pnpm --filter @endemion/shared test` | **PASS** — 2 files, 14 tests |
| `pnpm --filter @endemion/web test` | **PASS** — 2 files, 9 tests |
| `pnpm typecheck` | **PASS** — packages, API and web |
| `pnpm lint` | **PASS** — 0 errors; 1 pre-existing warning in untouched `play-screen.tsx` (`react-hooks/exhaustive-deps`) |
| `pnpm --filter @endemion/web build` | **PASS** — Next.js production build |

The API e2e log contains intentional injected 500/503 responses from failure-path tests; the test summary is 111/111 passed.

## 5. Acceptance mapping

| Criterion | Evidence |
|---|---|
| Choose education, complete it, enter matching career, promote, become unemployed, retire | Full-path test plus per-feature tests; event choices for each step |
| Prerequisites enforced | `canEnrollEducation`, `canStartCareer`, event `requires`, strict `parseSave` |
| Wages/costs once, non-negative | `wage`/`tuition` line tests, `economy.last` net comparison, `applyEffect` clamp |
| Deterministic replay | Same seed/actions test compares education, career, wealth and `rngState` |
| Schema 9 migration without loss | Three schema-9 fixtures; deep equality excluding the two new fields |
| New coverage | Prerequisites, promotion, unemployment, retirement, migration, no double income, full-life invariants |

## 6. Risks and remaining gaps

- **Balance:** tuition/wage values are modest but need a longer manual economy soak. Automated samples show education and promotion happening in all six worlds.
- **Narrative profession grants:** old `fx.profession` events force-start a career because the event is itself the qualification. Ordinary career offers enforce all gates.
- **No pension line:** retirement stops wages; class income/rent and savings remain.
- **No dropout action:** a course can be interrupted only by death or a higher direct diploma.
- **Job changes reset rank/tenure.** This is deliberate and documented; a future seniority-transfer rule may soften it.
- **Migrated lives** start with rank 0 and an idle course. A recorded profession is preserved and marked employed; no retroactive promotions are invented. Existing jobs are not retroactively invalidated if the current education/skill would not qualify for a fresh hire; only new entry is gated.

## 7. Review safety

The working tree is safe to review. Changes are additive or test-expectation updates. Nothing was staged, committed, pushed, reset, cleaned or deployed. Production remains on `b634a67` schema 8; local code is schema 10. Do not deploy until the migration is reviewed.
