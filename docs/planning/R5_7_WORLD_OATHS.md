# R5.7 — World Oaths

**Status:** implemented and verified locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none  
**API routes:** unchanged (generic life action)  
**Production runtime:** `aa23d34` (not changed by this local work)  
**Rollback target:** `47593ac`

## 1. What was added

- A separate **oaths** content layer for all six worlds. Oaths are voluntary quests the player accepts from the Atlas.
- Three chained oaths per world, 18 total. The first is available by age, the second requires the first, the third requires the second.
- A new `acceptOath` game action. It does not pass time, does not roll dice and does not consume the world RNG.
- Existing System quests in Isekai remain unchanged and still auto-issue as before.
- Oaths are processed by the existing yearly quest check: success grants the reward and advances the chain; deadline failure applies the penalty and ends the chain.
- `system-favor` changes remain exclusive to System quests, so oaths do not touch Isekai's System meter.
- Atlas now shows oath issuer, arc, title, text, requirements, age, time limit, status and an Accept button.
- The life profile shows the active oath's issuer and arc, and exposes completed oath ids for the Atlas.

No save field, database table, schema migration or new HTTP route was added.

## 2. Oath chains

| World | Issuer | Arc | Oaths |
|---|---|---|---|
| Dark Fantasy | Order of Ash | The Wall Oath | `df.q-wall`, `df.q-ash`, `df.q-cathedral` |
| Isekai | Adventurers Guild | The Contract Road | `is.q-guild`, `is.q-ledger`, `is.q-name` |
| Murim | Orthodox Alliance | A School's Debt | `mu.q-stance`, `mu.q-debt`, `mu.q-name` |
| Xianxia | Cloud Peak | The Dao Road | `xi.q-breath`, `xi.q-heart`, `xi.q-sky` |
| Hunter | Hunters Association | The Licence | `hu.q-license`, `hu.q-gate`, `hu.q-red` |
| Academy | Imperial Court | Steps of the Court | `ac.q-etiquette`, `ac.q-favor`, `ac.q-court` |

Each oath has a visible goal, a 4–8 year limit, a reward and a penalty. Final oaths grant a world ability where appropriate: `ember-ward`, `light-step`, `spirit-sense`, `gate-sense`, `charm-word`. The Isekai final oath pays gold instead of an ability.

## 3. Engine changes

- `QuestDefinition` gained optional `issuer`, `arc`, `next` and `requires`.
- `WorldDefinition` gained `oaths`.
- `findQuest` now searches both System quests and world oaths.
- `questYearly` processes an active oath even when the world has no auto-issued quests.
- On success, the next oath becomes active automatically and a second quest history entry announces it.
- On failure, the oath ends without chaining; it can be accepted again later.
- Auto-issuance still uses only `universe.quests`, so non-Isekai worlds do not consume RNG before an oath is accepted.
- `acceptOath` rejects pending events, an already active quest, unknown/completed oaths, underage lives and missing prerequisites.
- New game error codes: `QUEST_ACTIVE`, `OATH_LOCKED` (both HTTP 409 through the API).

## 4. UI

- Atlas has a new **World oaths** section with status badges (`available`, `active`, `completed`, `locked`), issuer, arc, requirements, age and time limit.
- The Accept button is shown only for available oaths and is disabled while another action is running.
- The dossier quest card now shows the issuer and arc above the title.
- RU/EN copy was added for the oath section, button, time limit, requirements and "finish the current oath first".
- Undiscovered content is not exposed; oaths are world content, not hidden lore.

## 5. Validation and tests

- `oathProblems()` validates duplicate ids, blank RU/EN title/text/issuer/arc, empty goal/reward/penalty, invalid years/minAge, unknown or self `requires`/`next`, and cycles.
- `oathProblems()` returns an empty list for all six worlds.
- Added game-core `stage29-oaths.test.ts`: three oaths per world, chain shape, accept/active/age/requires checks, full success chain, failure penalty, no RNG before accept, profile issuer/arc/done ids, Atlas statuses/progress, and the real `applyAction` path.
- Updated `stage02.test.ts` to validate oath effects, goals and RU/EN text.
- Updated `stage21-atlas.test.ts` for oath totals and initial statuses.
- Updated shared schema tests for valid/invalid `acceptOath` payloads.

## 6. Verification

| Check | Result |
|---|---|
| Full game-core suite | **59 files / 815 tests PASS** |
| Shared package suite | **2 files / 19 tests PASS** |
| Web suite | **12 files / 32 tests PASS** |
| `oathProblems()` for all worlds | empty |
| Game-core build | PASS |
| Shared build | PASS |
| API typecheck | PASS |
| Web typecheck | PASS |
| Web lint | 0 errors; only the pre-existing `play-screen.tsx:177` exhaustive-deps warning |
| Web production build | PASS, 12 routes |

## 7. Limitations

- Oaths are accepted from the Atlas only; there is no separate quest-board screen.
- Only one quest or oath can be active at a time.
- Oath failure does not create a notification; the history entry is the only record.
- Oaths use the existing generic quest history kind, not a dedicated UI filter.
- No new save fields: completed ids already existed in `state.questsDone`; the profile exposes them additively.
- No database or API changes, so there is no server-side oath list endpoint; the web client reads the pure game-core catalog.

## 8. Rollback

No database migration, API contract or save-schema change was introduced. Rolling back means reverting:

- `packages/game-core/src/world/oaths.ts`, `world/quests.ts`, `universes/types.ts`, `universes/registry.ts`;
- `packages/game-core/src/types.ts`, `engine/game.ts`, `engine/profile.ts`, `atlas/atlas.ts`, `errors.ts`;
- `packages/shared/src/schemas.ts`;
- `apps/api/src/common/error-response.ts`;
- the Atlas/dossier/play-screen/messages changes;
- the Stage 02/21/29 and shared schema tests;
- this document and the PROJECT_STATUS row.

Existing saves remain valid. A save with an active oath still opens; if the rollback removes the oath content, `questYearly` clears the unknown active quest rather than failing.
