# R5.5 — Bonds and Voices

**Status:** COMPLETE AND DEPLOYED (2026-11-15 18:58 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** none  
**API routes:** unchanged  
**Production runtime:** `47593ac`  
**Rollback target:** `2dc2b48`

## 1. What was added

R5.5 makes existing NPC relationships more legible and gives role-level NPC relationships authored scenes:

1. **People dossier 2.0** — the existing People screen now has a relationship summary and exposes the full 12-entry NPC log plus a reliable bond age. `NpcView` gains `log` and `bondAt` additively; no save field, schema or API route was added.
2. **Seven authored NPC scenes** — common, world-agnostic `kind: "npc"` events for friend, rival, mentor, parent, child and partner relationships, including a two-event scheduled chain.
3. **Relationship logging fix** — `learn`, `spar` and `ask-help` now write `logRelationship()` entries in their affinity-changing branches, so `recentChanges` and per-NPC history no longer silently miss those changes.

No migration, no new interaction IDs, no new effect/condition helpers, no new save fields and no database changes.

## 2. People dossier 2.0

### Data

`packages/game-core/src/engine/profile.ts`:

| Field | Meaning |
|---|---|
| `NpcView.log: NpcEventView[]` | The full current NPC log (up to 12 entries), newest first. `events` remains for compatibility and is now the newest six entries of the same log. |
| `NpcView.bondAt: number \| null` | Age at which the `bond` log entry was written, derived from `log`; `null` when the entry is absent. |

`bondAt` is presentation-only. It is derived from `npc.log`, so it never adds a save field. When the 12-entry log cap evicts the bond entry, `bondAt` correctly becomes `null`; the existing `bond` flag is also derived from the same log and follows the same rule.

### People screen

`apps/web/src/components/play/dossier.tsx`:

- `PeopleSummary` counts across `profile.npcs`: living, dead, bonds, friends, rivals and family, and names the strongest tie by absolute affinity with its `affinityLabel`.
- Each NPC shows `bondAt` when available and the full scrollable log instead of only five events.
- `events` is kept in the component API/type but the visible history uses `log`.
- RU/EN keys were added for the summary, full log, entry count and bond age. Existing keys continue to work.

## 3. Authored NPC scenes

All scenes are in `packages/game-core/src/narrative/people.ts` (`PEOPLE_EVENTS`), are registered through `COMMON_EVENTS`, and use only existing conditions/effects.

| Event id | Relationship | Gate | Choices | Notes |
|---|---|---|---|---|
| `common.friend-difficult-favor` | friend | age 16+, friend affinity 25+ | take the blame (check), hide them, refuse | `take-blame` and `hide` schedule `common.friend-favor-return` in 3 years; max 2, cooldown 9 |
| `common.friend-favor-return` | friend | age 16+, friend present | accept repayment, pass it on, say there is no debt | `scheduledOnly` continuation, max 1 |
| `common.rival-truce` | rival | age 18+, rival affinity at most 40 | accept, accept on terms (check), refuse | once per life; accepting changes rival to friend |
| `common.mentor-final-test` | mentor | age 18+, mentor affinity 30+ | face the test (check), ask for a year, refuse | once per life |
| `common.family-duty` | parent | age 17+, parent affinity 15+ | stay, negotiate (check), leave | max 2, cooldown 10 |
| `common.child-dangerous-path` | child | age 32+, child aged 12+ | bless, train first (check), forbid | once per life |
| `common.partner-distance` | partner | age 20+, partner affinity 20+ | tell the truth (check), promise time, stay silent | max 2, cooldown 8 |

Every scene has 2–3 choices, RU/EN text, and a failure outcome for every check. No new flags are introduced. Scenes avoid world-specific assumptions.

## 4. Relationship logging fix

`packages/game-core/src/character/interactions.ts`:

| Interaction | Branch | Log entry added |
|---|---|---|
| `learn` | success (+3 affinity) | `mentor +3` |
| `spar` | success (+2, or +4 vs rival) | `friend +2` / `rival +4` |
| `spar` | failure vs rival (−3 affinity) | `rival -3` |
| `ask-help` | success (−3 affinity) | `friend -3` |
| `ask-help` | failure (−6 affinity) | `friend -6` |

Affinity numbers, gates, action IDs and the one-interaction-per-year rule are unchanged. `logRelationship()` adds an NPC log entry, so `recentChanges` now includes these changes.

## 5. Verification

| Check | Result |
|---|---|
| Targeted: `stage27-people`, `content`, `stage11-content`, `stage18-bonds` | **4 files / 25 tests**, all passed |
| Full game-core suite | **57 files / 800 tests**, all passed |
| `eventProblems()` and `contentProblems()` | empty for all six worlds |
| Full `NpcView.log` newest-first and `bondAt` | PASS |
| Bond outside last six `events` still has `bondAt` | PASS |
| Bond evicted from the 12-entry log gives `bondAt: null` | PASS |
| `learn` / `spar` / `ask-help` in `recentChanges` and NPC history | PASS |
| New scenes indexed, eligible by role, deterministic choices, chain schedule | PASS |
| Web People summary/log static render (RU/EN) | PASS |
| `messages.test.ts` RU/EN parity | PASS, 12 web files / 32 tests |
| Game-core build | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 12 routes |
| Web lint | PASS; only the pre-existing `play-screen.tsx:175` hook warning |

## 6. Limitations

- `bondAt` is only as durable as the current 12-entry NPC log. Once the bond entry is evicted, `bondAt` is `null` by design; no save field was added.
- Authored scenes target roles (`friend`, `rival`, `mentor`, `parent`, `child`, `partner`), not a specific NPC id. If no living NPC has the role, the scene does not trigger.
- Event effects still do not write relationship log entries, matching existing event behaviour. Only the three fixed interactions now log affinity changes.
- The People summary is computed client-side from existing `NpcView` fields; no new API endpoint or server aggregate was added.
- The scenes are common content and contain no world-specific locations, factions or skills.
- No art, audio, new UI route, save schema or database migration.

## 7. Deployment

- Code commit `47593ac` (`r5.5: make import size fixture deterministic` on top of `aec9f70` `r5.5: add bonds and voices`).
- Deploy run **43749074484**, success; history `18:57:04Z deploy-start 47593ac from 2dc2b48` -> `18:57:33Z deploy 47593ac ok`.
- CI **43747760555** success; Security **43747760564** success.
- Production now has **26 migrations**; save schema 14.
- `/api/health` 200, database/redis up; `/api/contracts?universeId=hunter` 200; `/api/notifications` guest 401; web `/` 200.
- Rollback target `2dc2b48`; no migration.

## 8. Rollback

No database migration, API contract or save-schema change was introduced. Rolling back means reverting:

- `packages/game-core/src/engine/profile.ts` (`NpcView.log` / `bondAt` and log mapping);
- `packages/game-core/src/character/interactions.ts` (relationship log calls);
- `packages/game-core/src/narrative/people.ts` (seven scenes);
- `apps/web/src/components/play/dossier.tsx` and `apps/web/src/lib/messages.ts`;
- `test/stage27-people.test.ts`, `test/content.test.ts` and the web People test;
- this document and the PROJECT_STATUS row.

Existing saves remain valid. `NpcView` additions are serialized additively; clients that do not read `log`/`bondAt` continue to use `events`.

The production rollback target remains `2dc2b48`.
