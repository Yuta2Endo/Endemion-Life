# R5.4 — Echoes of the Roads

**Status:** implemented and verified locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none  
**Production runtime:** unchanged (`bc7decb`; this work is not deployed)

## 1. What was added

R5.4 adds a fourth place and a four-step epilogue adventure to each of the six worlds. Every epilogue:

- opens at a new world-specific place;
- requires the existing third-road adventure;
- has four steps: `arrival`, `talk`, `test`, `choice`;
- introduces a named NPC with a personal conflict;
- contains at least one check with a valid world skill or stat and a failure path;
- ends with two rewarded outcomes, one of which is gated by the R5.3 relic with `when.relic(id)`.

The non-relic final branch remains viable and has its own rewards. No new relics were added, and `fx.relic` is not used by this content.

The worlds now have **4 places and 4 adventures** each. The existing Road panel, Atlas codex and mastery objectives read the same content arrays and expand automatically. No UI, API, engine, save-schema or database change was required.

## 2. Epilogues

| World | Place (minAge) | Adventure (minAge) | Requires | Named NPC | Relic condition | Gated final choice |
|---|---|---|---|---|---|---|
| Dark Fantasy | `df.last-light` — Последний огонь (20) | `df.last-vigil` — Последний дозор (20) | `df.bell-toll` | Sister Elowen | `when.relic("drowned-bell")` | `road` |
| Isekai | `is.old-signpost` — Старый указатель (19) | `is.road-home` — Дорога домой (19) | `is.lost-caravan` | Caravan master Rui | `when.relic("caravan-ledger")` | `home` |
| Murim | `mu.sword-grave` — Могила клинков (19) | `mu.nameless-blade` — Безымянный клинок (19) | `mu.shrine-debt` | The nameless shrine keeper | `when.relic("iron-shrine-tablet")` | `nameless` |
| Xianxia | `xi.mirror-terrace` — Зеркальная терраса (20) | `xi.sky-beneath` — Небо под миром (20) | `xi.star-trial` | Elder Bai | `when.relic("star-well-cup")` | `cup` |
| Hunter | `hu.gate-zero` — Нулевые Врата (20) | `hu.gate-remembers` — Врата помнят (20) | `hu.red-gate-raid` | Association inspector Seo | `when.relic("red-gate-core")` | `remember` |
| Academy | `ac.rooftop` — Крыша академии (20) | `ac.unwritten-constellation` — Ненаписанное созвездие (20) | `ac.star-chart` | Rector Aurelia | `when.relic("star-chart")` | `unwritten` |

### Dark Fantasy

Sister Elowen keeps the last lamp at the end of the highway. The Order wants it behind the wall; Elowen believes the road still needs it. The final choice carries the lamp to safety (`wall`) or, with the drowned bell, hangs its clapper over the chapel so the lamp tolls for the lost (`road`).

### Isekai

Caravan master Rui survived the lost caravan, but the League's books say his people never returned. The final choice returns the last wagon to the Guild (`guild`) or, with the caravan ledger, returns Rui his own page and lets him go home (`home`).

### Murim

The nameless shrine keeper lost his name when the debt tablets burned. A blade in the grave of swords has begun calling it back. The final choice gives the blade to the Orthodox Alliance (`alliance`) or, with the iron shrine tablet, leaves the blade nameless and returns the keeper's name (`nameless`).

### Xianxia

Elder Bai left his reflection in the star well to buy the sect time. It now climbs the mirror terrace. The final choice seals the terrace for Cloud Peak (`sect`) or, with the star-well cup, lets the reflection drink and releases Bai from the debt (`cup`).

### Hunter

Inspector Seo's brother died in the first Red Gate raid, yet Gate Zero replays his voice every night. The final choice closes the Gate by protocol (`report`) or, with the red gate core, returns the core and records every name the Association erased (`remember`).

### Academy

Rector Aurelia once scraped a star off the court chart to protect a student; now the sky writes it back. The final choice gives the chart to the Imperial Court (`court`) or, with the Tower's star-chart copy, leaves the sky unwritten and lets the Tower keep the missing star (`unwritten`).

## 3. Rewards

All epilogues use existing effect helpers and world-valid ids only:

- `xp`, `wealth`, `reputation`, `karma`, `track`;
- existing world skills (`oathcraft`, `guild-craft`, `survival`, `invention`, `martial-arts`, `lightness`, `inner-cultivation`, `cultivation`, `talismans`, `dungeon-combat`, `lore`, `mana-control`, `arcana`);
- existing factions and meters for each world.

No `fx.relic` call was added. The relic-gated path is an alternative reward, not a second relic.

## 4. Verification

| Check | Result |
|---|---|
| Targeted tests: `stage26-echoes`, `stage25-third-road`, `stage11-content`, `stage17-content`, `stage10-mastery` | **24/24** in 5 files |
| Full game-core suite | **56 files / 792 tests**, all passed |
| `contentProblems()` | empty for all six worlds |
| Four places and four adventures per world | PASS |
| Fourth adventure requires the third | PASS |
| Fourth road blocked without its place | PASS |
| Fourth road blocked until the third is done | PASS |
| Relic-gated final choice closed without the relic | PASS |
| Relic-gated final choice open with the relic | PASS |
| Deterministic full fourth-road playthrough (Dark Fantasy) | PASS; final branch awards `wealth +15`, `order-of-ash +7`, `reputation +4` and completes the adventure |
| Game-core build | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 12 routes |
| Web lint | PASS, only the pre-existing `play-screen.tsx:175` hook warning |

## 5. Limitations

- The fourth road is still an epilogue: it ends the current content chain and does not open a fifth.
- Places are discovered randomly, at most one per year. A life may not see the fourth place; the existing discovery rules are unchanged.
- The named NPCs exist in adventure text only. No persistent NPC records, portraits, schedules or affinity tracks were added.
- The relic condition reads `lineage.relics`; a life whose third-road final branch did not award the relic can still complete the non-relic path.
- No new effect types, relics, save fields, API routes, UI components or database tables.
- RU/EN text is lore only; no new art or audio.

## 6. Rollback

No database migration, API contract or save-schema change was introduced. Rolling back means reverting the R5.4 content, the updated content-count tests, `test/stage26-echoes.test.ts`, this document and the PROJECT_STATUS row. Existing saves remain valid: `adventure.discovered`, `adventure.done` and `lineage.relics` are unchanged in shape.

The current production rollback target remains `020a2ad` until this work is released; production runtime stays `bc7decb`.
