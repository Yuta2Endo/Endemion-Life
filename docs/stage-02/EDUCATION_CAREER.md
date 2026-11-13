# STAGE 02.2 — Education and Career

**Status:** implemented in the working tree (not committed).
**Scope:** `packages/game-core`, `packages/shared`, the existing play character sheet and dossier.
**Out of scope:** property, business, travel, multiplayer, broad balance pass.

## 1. Model

Stage 02.2 adds two required, additive state branches to `GameState`:

```ts
interface EducationState {
  currentId: string | null; // course being studied now
  startedAt: number;        // character age when it began
  progress: number;         // years already studied
  duration: number;         // total years of this course
}

interface CareerState {
  rank: number;             // 0..max rank in the current profession
  since: number;            // age when the current rank began
  tenure: number;           // total years in the current profession
  employed: boolean;        // currently earns a wage
  retired: boolean;         // left work; implies employed === false
}
```

There is deliberately **one job field**: `character.professionId` is both the current job and the name of the last job after a layoff or retirement. `CareerState` stores only progression and employment status, so job and career cannot disagree. Likewise, `character.educationId` remains the single completed diploma; `EducationState` stores only the course in progress.

`character.specializationId` is unchanged and is now reachable through an education-gated event.

## 2. Education ladder

All six universes already have three education definitions (tiers 1–3). Stage 02.2 adds a shared ladder in `life/education.ts`:

| Tier | Meaning | Min age | Duration | Requires |
|---|---|---:|---:|---|
| 1 | childhood schooling / letters | 6 | 2 years | — |
| 2 | trade, guild course, academy, sect outer court | 12 | 3 years | tier 1 |
| 3 | university, institute, inner court, tower | 17 | 4 years | tier 2 |

The world's own names and descriptions are used in events and in the UI; the ladder only fixes age, duration and prerequisites. `canEnrollEducation` and `enrollEducation` both enforce the prerequisites, so a locked event choice cannot be bypassed by a direct effect.

Completion is automatic after the course duration. `educationYear` advances the course and, when it finishes, the same `setEducation` path as a narrative diploma grants the education and its skills. A direct story diploma also clears an in-progress course of the same or lower tier.

Tuition is charged per study year from `EDUCATION_TUITION` in `life/education.ts`:

| Universe | Tier 2 / year | Tier 3 / year |
|---|---:|---:|
| dark-fantasy | 6 | 14 |
| isekai | 8 | 18 |
| murim | 6 | 12 |
| xianxia | 8 | 16 |
| hunter | 10 | 22 |
| academy | 12 | 26 |

## 3. Career catalog

`life/careers.ts` defines explicit tracks for every profession of every world plus the five common professions:

- world tracks: `hollow-hunter`, `lamplighter`, `relic-dealer`, `adventurer`, `inventor`, `court-mage`, `escort`, `physician`, `informant`, `alchemist`, `talisman-maker`, `herb-gatherer`, `raid-hunter`, `hunter-streamer`, `gate-analyst`, `diplomat`, `duellist`;
- common tracks: `guard`, `scholar`, `merchant`, `wanderer`, `laborer`.

Each track has:

- minimum education tier;
- entry skill and minimum level;
- three named ranks with annual wages;
- `promotionYears` — years on the current rank before a promotion offer;
- `retirementAge` — the age at which the retirement event becomes available.

Entry is enforced in `canStartCareer` and in every career-offer choice (`education` + `skill` conditions). A narrative profession grant (`fx.profession`) is treated as its own qualification and force-starts the career; ordinary hiring always goes through the gated path.

Wages:

```text
wage = rank.wage + min(3, floor(skill / 12))
```

The rank is the main progression; skill adds only a small ceiling. The economy's cycle factor and tax are applied to the wage exactly like other earned income.

Employment status is derived in one place (`employmentStatus`): `retired`, `employed`, otherwise `unemployed`. A profession without current employment is still shown as the last job.

## 4. Annual economy integration

`economy/economy.ts` adds two `EconomyLineId` values:

- `wage` — career wage, only while `career.employed`;
- `tuition` — current course tuition, only while `education.currentId` is set.

When a career track exists, the old `profession` formula is suppressed, so the same job is never counted both as a legacy profession income and as a career wage. Odd jobs (`trade`) are suppressed while employed and while retired. Retirement therefore stops career wages immediately; class income/rent and living costs remain.

`economyYear` still applies one net wealth change per year through `applyEffect`, which clamps to `0..WEALTH_MAX`. `yearLines` is pure and is called by tests to verify that the applied delta equals the sum of the saved lines exactly once.

## 5. Events

Generated per universe in `narrative/career-events.ts` and appended by `universes/registry.ts`:

| id | Purpose |
|---|---|
| `edu.school.<world>` | childhood schooling offer; study or work |
| `edu.trade.<world>` | tier-2 offer; tuition requirement, study or decline |
| `edu.university.<world>` | tier-3 offer; tuition requirement, study or decline |
| `edu.specialize.<world>` | specialization choice after tier 3 |
| `career.offer.<world>` | job offers for every track; locked choices show the missing education/skill |
| `career.promotion.<world>` | promotion request with a check; or wait |
| `career.layoff.<world>` | layoff during slump/hardship/strain; hold the job or leave with severance |
| `career.retirement.<world>` | retire at the profession's retirement age or work longer |

Texts use the world's own education/profession/rank names. World flavor is explicit for all six universes (Ashen Kingdoms, guilds and the Guild, sects and escort agencies, spirit veins, the Association and corporations, the court and the Tower). Event validation (`eventProblems`) checks every `enrollEducation` and `startCareer` reference against the world catalog.

No new `GameAction` type was added. All choices use the existing event/choice mechanism; only new `Effect` and `Condition` members were added.

Retirement is player-driven through the event and has a hard backstop: `careerYear` retires a character automatically at `retirementAge + 3` if they keep declining. This keeps wages bounded without an unbounded employment state.

## 6. UI

`LifeView` now carries `education` and `career`:

- `EducationView`: current course (name, progress, duration, tuition), completed diploma, next step and its age requirement.
- `CareerView`: status, current/last profession, rank name, rank count, tenure, wage, next rank, promotion readiness, retirement age.

The dossier's **Skills** tab has a compact two-column **Education and career** panel. The character sheet adds one compact status line. RU/EN strings are in `apps/web/src/lib/messages.ts`; career history changes are formatted in `apps/web/src/lib/format.ts`. No tabs or layout structure were removed.

## 7. Save compatibility

`SAVE_SCHEMA_VERSION` is now **10**. `migrateV9`:

- adds an idle `education` state; the existing `character.educationId` remains the completed diploma;
- adds an empty `career` state;
- if `character.professionId` maps to a career track, marks the character employed at rank 0 with `since = age`;
- does not read or change `seed` or `rngState`;
- changes no other field.

The chain 1 → 10 remains non-destructive. Schema 1, 2, 5, 8 and 9 fixtures all load. `parseSave` rejects: an employed character without a profession, a retired character still employed, a course that skips a tier, a course with zero duration/progress at completion, unknown education/profession/specialization ids, duplicate course states, rank above the track ladder, tenure/since beyond the character's age, and `employed && retired`.

`applyAction` and `restoreState` normalize `education`/`career` at the boundary for defensive compatibility with un-migrated local states.

## 8. Tests

New `packages/game-core/test/stage02-education-career.test.ts` (15 tests) covers:

- fresh state and strict round trip;
- event-driven school choice, tier order, completion, and the tier-age gate;
- tuition charged once and wealth never negative;
- career entry requirements (education + skill);
- promotion, wage increase, exactly one `wage` line and no duplicate `profession` line;
- layoff/unemployment, wage stop, career offer availability and rehire;
- retirement, wage stop, retirement event and hard auto-retirement;
- full path: school → trade → matching job → promotion → layoff → rehire → retirement;
- deterministic replay of the same seed and actions;
- schema 9 → 10 migration with no field loss, including an employed fixture;
- legacy schemas 1/2/5/8 loading;
- all six worlds have three education tiers and a career track for every profession, and generated events pass validation;
- a full-life invariant soak and strict `parseSave` rejection cases.

`packages/shared/test/schemas.test.ts` checks the new view fields and that retirement reports zero wages.

## 9. Risks and known gaps

- **Balance:** tuition and wage values are intentionally modest but have not had a long economy soak beyond the automated samples. Values may need tuning after playtesting.
- **Narrative grants:** old `fx.profession` events force-start a career without the normal education/skill gate, because the event itself is the qualification. Ordinary career offers always enforce the gate.
- **No pension system:** retirement stops wages; class income and savings remain. There is no separate pension line.
- **No education dropout UI:** a course can be interrupted only by death or a direct higher diploma; there is no “quit course” action.
- **Profession changes:** a new job resets rank and tenure to zero. This is deliberate, but a future “seniority transfer” rule could soften it.
- **Old saves:** schema ≤ 9 had no education-in-progress or career history, so migrated lives start with an idle course and rank 0. A previously recorded profession is preserved and marked employed. Existing jobs are not retroactively invalidated; only new hiring is gated by education and skill.
