# Endemion Life — Gameplay Status

**Scope:** actual behavior in `packages/game-core` at local HEAD `cda9a39` (engine identical to production `ca72b8b` for the audited systems) plus API-side live/social features.
**Rule applied:** UI presence or documentation is not evidence of a working system. Every status below is based on code paths and tests.

---

## 1. Status summary

| System | Status | One-line verdict |
|---|---|---|
| Character creation | **COMPLETE (narrow)** | Choice of universe/name/gender/race/origin/temperament; stats and birth context are rolled. No point-buy. |
| Character simulation | **PARTIAL** | Aging, six life stages, health, death, personality and goals work; no disease, injury, pregnancy or equipment. |
| RPG progression | **PARTIAL** | XP/levels, 8 stats, 12 skills/world, talents, tracks, professions, education, specializations; level unlocks almost nothing. |
| Quests | **PARTIAL / one world** | Five fixed quests in isekai only. |
| Narrative engine | **COMPLETE** | Conditions, effects, checks, success/failure, scheduling, delayed consequences, history, localization. |
| Narrative content | **PARTIAL** | 94–102 event definitions/world, but ~75 are shared; local branches are real, long-range branching is sparse. |
| Relationships | **PARTIAL** | Affinity, nine interactions, NPC–NPC marriage/children, three NPC story arcs; no dialogue graph or player marriage action. |
| Family / dynasty | **PARTIAL–STRONG** | Kin graph, NPC life simulation, succession, inheritance laws, guardianship, chronicle, achievements, relics model. Social memory resets; relics unreachable. |
| Six worlds | **PARTIAL** | All six implemented with distinct rules, meters, tracks, factions, goods and adventures; shared template and generic world model. |
| Economy | **PARTIAL** | Working single-player income/expenses, cycles, 3-good market/world, region stock; no player-to-player economy. |
| World simulation | **PARTIAL** | Deterministic per-life settlements/factions/activity feed and dynasty influence; not shared, content mostly dark-fantasy. |
| Adventures | **PARTIAL** | Two 3-step adventures and two places per world; 12 total. |
| Mastery / endgame | **PARTIAL** | Eight-objective checklist and skill mastery; explicitly no rewards or new loop. |
| Live world | **PARTIAL / disabled** | Two shared templates, contribution and claim; zero production windows, admin token absent. |
| Insights | **PARTIAL** | Server-side anonymous facts and summary; no auto-balancing. |
| Multiplayer | **MISSING / BLOCKED** | No shared characters, presence, realtime, trade, guilds or shared simulation. |

---

## 2. Character creation and simulation

### 2.1 Creation

`CharacterInput` accepts `universeId` plus optional `name`, `gender`, `raceId`, `originId`, `temperamentId` (`packages/game-core/src/character/generator.ts:19-26`). Unknown IDs and invalid names are rejected before any roll (`:59-67`). The UI exposes all five optional choices plus "born now" random creation.

- Stats are **not point-bought**. They are `2d5` plus race/origin/temperament modifiers, clamped to 30 (`generator.ts:91-96`).
- Each world has 3–4 races, 4 origins, 5 social classes (6 for hunter), and 8 temperaments shared across worlds.
- Birth adds family kind (full, orphan, foundling, single, bastard), parents, siblings, a possible grandparent, family name, birthplace, omen, 1–3 talents (some dormant), 0–1 weakness, a possible family secret, hidden potential/destiny and a biography (`character/birth.ts:41-67,94-186`).
- Starting wealth, reputation, karma, flags, skills and faction scores come from the origin profile (`generator.ts:98-124`).
- The player cannot choose starting profession, education, specialization, equipment or stat allocation.

**Assessment:** a real hybrid creation system, not a random-only placeholder. Its agency is identity-level, not build-level.

### 2.2 Attributes and resources

Eight stats: strength, intelligence, agility, vitality, wisdom, charisma, luck, willpower (`stats.ts:3-11`). Resources: health, energy, mana, stamina (`stats.ts:62-72`). Health maximum = `40 + vitality×4 + (level−1)×5 + trackRank×15` (`character/derived.ts:34-43`). Yearly healing is about 25% of max plus vitality/2, reduced in elder stage (`life/aging.ts:74-85`).

### 2.3 Age, stages and death

- Six stages (`infant`, `child`, `teen`, `adult`, `middle`, `elder`) scaled by universe lifespan (`life/stages.ts:23-30`).
- `advance` processes 1–10 years per action (`engine/game.ts:396-403`).
- Natural death starts 8 years before lifespan and rolls `3% + 3%/year − vitality/luck resistance`, clamped 1–95%, hard cap lifespan+20 (`life/death.ts:7-20`).
- Event, health and meter effects can kill earlier (`engine/effects.ts:388-406,447-448`; `world/rules.ts`).
- Player death is permanent for that life; succession is optional.

### 2.4 Personality and goals

Eight temperaments modify stats, growth preferences and karma (`character/temperaments.ts:15-76`). Temperament maps to one adult goal (`character/goals.ts:137-148`), one mastery objective (`endgame/mastery.ts:100-108`) and unlocks choices in one common event (`narrative/common.ts:11-54`).

Personality is static: no mood, trait evolution, values model or preferences beyond karma/reputation.

### 2.5 What is missing

- Disease, injury, pregnancy, childbirth risk, disability and recovery loops.
- Equipment, inventory, carrying capacity, housing, property or possessions.
- Daily/seasonal schedule, location simulation or travel time.
- Player-initiated job search, education enrollment or training actions; these are event effects.
- Non-binary gender or character customization beyond the five fields.

**Status: COMPLETE for the implemented narrow creation model; PARTIAL for life simulation as a whole.**

---

## 3. RPG systems

### 3.1 XP and levels

XP requirement is `100 × level`, maximum level 100 (`character/derived.ts:6-11`). Each level grants +1 random stat and full health (`engine/effects.ts:54-67`). Levels are displayed and contribute to health, but **no shipped event, quest, adventure or world rule checks `level`**. The condition type exists (`narrative/types.ts:29`), but static search found no content use. This makes level a soft power counter, not a progression gate.

### 3.2 Skills

Nine common skills plus three world skills = 12 per world (`rpg/common.ts:5-15`; `rpg/skills.ts:11-28`). Skills grow from talents, profession, path, interactions, events and education (`life/aging.ts:60-72`). Skill checks add up to +25% and are clamped 5–95% (`engine/checks.ts:19-37`).

### 3.3 Checks

One formula covers stats, skills, talents, weaknesses, meters and NPC opponent power. Luck modifies ±0.5% per point. There are no critical successes, partial successes, opposed skill checks, resource costs or multi-round contests. This is sufficient for narrative resolution but not for tactical RPG play.

### 3.4 Professions, education and specialization

- Eight professions per world (three world-specific, five common) (`rpg/skills.ts:30-40`; `rpg/common.ts:18-24`).
- Income = base + mean(stat)/4 + skill/10 (`economy/economy.ts:60-74`). Profession is assigned by events (`engine/effects.ts:337-345`), not chosen through a job action.
- Three education tiers per world; higher tiers grant skills and are monotonic (`effects.ts:348-357`).
- Three specializations per world, one per life, granting +10 skill and a stat bonus (`effects.ts:359-366`).

There are no promotions, workplace events, wages, unemployment loops or professional projects.

### 3.5 Talents and weaknesses

Seven common talents and five common weaknesses, plus 3–4 world talents and 2 world weaknesses. They affect growth, skills, checks, path factor, healing and income (`rpg/talents.ts:56-79`; `rpg/common.ts:57-75`). Dormant talents can awaken through conditions.

### 3.6 Factions

Three factions per world, each a score from −100 to 100 (`types.ts:184-185`). Faction scores are used in conditions, checks and world standing, and can drift through events and world rules. There is no membership object, rank, duty, faction questline or organization management.

### 3.7 Quests

**Only isekai has quests.** `quests` is declared exclusively in `universes/isekai.world.ts:93-99`; `questYearly` exits immediately for every other world (`world/quests.ts:18-20`). Five fixed quests (lore 15, wealth 100, rank 2, friend affinity 60, remove a weakness) have deadlines and flat rewards/penalties.

There are no quest chains, faction quests, repeatable quests, choice-driven objectives or reward scaling. The other five worlds have events and adventures but no quest system.

### 3.8 Adventures

All six worlds have two places and two adventures (`adventure/content.ts:13-477`). Each is a three-step, 2–3-choice instance with checks, rewards and one-time completion (`adventure/adventure.ts:50-168`). The heir does not inherit adventure progress (`legacy/succession.ts:359-364`), so adventures are repeatable across generations.

Adventure is abstract narrative choice, not a combat/dungeon system: no enemies, HP attrition, loot, party or procedural layout.

### 3.9 Balance observations

- Skill/stat caps 100; path thresholds 15–240; check cap 5–95%; wealth cap 1,000,000,000.
- Market spread (buy 1.25×, sell 0.8×) and stock cap prevent a simple buy/sell loop; tests assert this.
- Level rewards are random stat points, so two characters at level 50 can diverge without player control.
- The isekai quest “wealth 100” is trivial for most adult professions; “friend affinity 60” depends on interaction access.
- `ask-help` is a repeatable gold faucet: success adds 10–25 gold (family) or 5–15 (non-family) without debiting the NPC (`character/interactions.ts:123-139`). Gifts debit the player but do not credit the NPC (`:54-70`). This is an economy consistency bug, not just a balance choice.

**Status: PARTIAL.** The skeleton is real and broad; the content gates and combat/quest depth are thin.

---

## 4. Story and events

### 4.1 Engine

The narrative DSL is the strongest gameplay subsystem. Conditions cover stats, flags, karma, reputation, wealth, hardship/cycle, strain/prosperity, deeds, achievements, level/rank, origin/race/temperament/ability/skill/talent/weakness, NPC/affinity, meters/factions/class/standing, profession/education/specialization, dormant talent/hidden/secret/quest/years left, generation/renown/thread/story, missing kin/marriage, settlement/world faction, goal/relic/story stage/choice/completion (`narrative/types.ts:9-93`).

Effects include stats, resources, reputation, karma, wealth, XP, path/breakthrough, flags, abilities, scheduling, death, skills, talents/weaknesses, NPC creation/role/affinity/death/skill, meters, strain/prosperity, settlement/influence, factions/class, profession/education/specialization, delayed consequences, renown/threads, missing kin, adoption, relics and story progress (`engine/effects.ts:408-539`). All declared effects are implemented.

Selection is deterministic: 40–75% chance by life stage, default three-year cooldown, last four events suppressed, weight reduced by occurrence count, one pending event at a time (`narrative/selection.ts:18-104`; `engine/game.ts:280-287`). Consequences fire automatically, at most two per year (`narrative/consequences.ts:9-30`).

### 4.2 Content volume

- 75 shared event definitions: 14 common, 19 people, 12 economy, 19 legacy, 11 milestone.
- 13–20 world-specific definitions per world.
- Total index: 94–102 definitions per world, depending on the world.
- 31 world consequences, 1 common consequence, 4 lineage consequences.
- Two full `storyProgress` arcs: `story.broken-oath` (3 stages, two endings) and `story.ancestor-promise` (dark-fantasy).
- One two-event romance chain (`common.first-love → common.love-test`).
- Eleven `scheduledOnly` continuations, 12 `fx.schedule` uses, 35 `fx.later` uses, 2 `fx.lineageLater` uses.

### 4.3 Branching reality

Most events are one-shot 2–3-choice scenes. Choices differ in requirements, checks and immediate effects. This is genuine local branching, but not a stateful dialogue tree. Only two arcs preserve multi-stage choice memory. There is no free-text dialogue, NPC conversation graph, dynamic scene composition or faction/quest storyline.

Event density is one event per year, so a 70-year life sees tens of scenes, many of them shared across worlds. A player exploring all six worlds will recognize the shared pool.

### 4.4 History and localization

Every history entry contains localized title/text, choice, outcome, check and changes (`types.ts:586-603`). Chronicle mapping groups entries into life categories (`life/chronicle.ts:43-90`). All content is RU/EN through `LocalizedText`; there are roughly 1,968 `t()` calls in content.

**Known defect:** delayed lineage consequences lose their source provenance. `legacy/lineage.ts:53-67` sets `ctx.source`, applies effects, then sets `ctx.source = undefined` before `emit("consequence")`. The test `stage01-life-upgrade.test.ts > keeps the decision provenance when a delayed consequence arrives` fails (`sourceEventId` is `undefined`). Even reordering would record the consequence id rather than `item.src`. This degrades dynasty chronicle traceability, not core state.

**Status: engine COMPLETE; content PARTIAL.**

---

## 5. Relationships and family

### 5.1 Kin graph

`family/kin.ts` stores only `parents`, `spouseId`, `formerSpouses` and `adopted`; siblings, grandparents, aunts/uncles, niblings, cousins and in-laws are derived (`kin.ts:30-225`). Validation catches parent-age violations, cycles, duplicate parents, dead spouses and non-mutual marriage (`kin.ts:239-288`).

### 5.2 NPC life simulation

NPCs live yearly lives with 20 behaviors: education, first job, promotion, job change/loss, mentor, class up/down, marriage, child, adoption, divorce, illness, accident, battle, training, missing and retirement (`character/npc-life.ts:151-434`). Limits: 40 living NPCs, 90 total, 20% yearly event chance, at most three people entries per year (`npc-life.ts:23-29`).

NPC death can be old age, illness, accident, battle or unknown; widows are created and estates distributed by world law (`family/events.ts:89-148`).

### 5.3 Player relationships

Nine interactions (talk, gift, help, court, etc.) raise affinity or produce small effects. `court` raises affinity and advances an NPC story but does not marry (`character/interactions.ts:171-185`). Marriage occurs only through events (`common.love-test`, `legacy.marriage-alliance`, `mu.clan-duty`). Adoption occurs through `legacy.adopt-heir` or `fx.adopt`.

There is no player-initiated marriage, divorce, adoption, courtship loop or relationship status UI action. NPC–NPC divorce exists (`npc-life.ts:356-366`), but no player post-marriage divorce path was found. Player “divorce” in `common.love-test` is a pre-marriage partner split (`narrative/common.ts:266-278`).

### 5.4 NPC stories

Three NPC story archetypes exist. Affinity unlocks personal story stages and entries in the dossier. This is real but small; there is no dialogue graph or branching conversation.

### 5.5 Succession

Succession requires a dead life that has not already continued, plus a living blood or adopted candidate allowed by the world’s inheritance law (`legacy/succession.ts:110-136,461-468`). The heir becomes the player character; the deceased becomes an NPC record; dates rebase to the heir’s birth; lineage generation increments; achievements/chronicle/renown carry (`succession.ts:170-386,477-607`). Maximum generation is 1000.

The database adds a unique `predecessor_id`, so double succession is prevented even under concurrency.

### 5.6 Inheritance laws

Six distinct laws (`legacy/laws.ts:35-149`):

| World | Rule | Control age | Levy / notable carry |
|---|---|---|---|
| Dark fantasy | Primogeniture | 16, regency | 10% Order tithe; corruption 20%, ember 30% |
| Isekai | Equal partition | 15, no regency | 8% guild duty; no System favour |
| Murim | Clan merit | 16, no regency | 15% clan share; no qi deviation |
| Xianxia | Sect claim / merit | 12, regency | 25% sect share; 50% karmic debt |
| Hunter | Civil code / chosen heir | 18, no regency | 20% inheritance tax; full gate threat, 10% fame |
| Academy | Imperial entail / eldest | 16, regency | 5% Crown fee; 50% court favour/scandal |

Guardianship is bookkeeping: a minor heir’s share is held by a guardian until control age (`succession.ts:265-309`; `legacy/lineage.ts:37-52`). There are no guardian decisions or events.

### 5.7 Generational state

Persists: lineage name, generation, epoch, renown, lives, chronicle (max 400, trimmed to 340), achievements (36, once per lineage), trait counts, threads, pending consequences, stories, inheritance record, relics, lineage story progress and world influence.

Resets: character stats/skills/level/XP, goal, character story progress, memory, pending event, scheduled events, consequences, quest state, adventure, mastery, **all `social` relationships and NPC story states**, current economy hardship/goods and current-life history.

The heir receives partial stat inheritance, some talents/weaknesses/flags, 30% of predecessor reputation/factions and law-based wealth/class (`succession.ts:180-319`).

### 5.8 Relics, threads, achievements and chronicle

- Six relics with one-time effects are defined (`legacy/stories.ts:19-56`; `effects.ts:542-559`).
- Five thread types (`legacy/stories.ts:9-15`).
- 36 achievements, once per lineage (`legacy/achievements.ts:29-101`).
- Life score has six parts and nine titles, excluding money (`legacy/summary.ts:50-83`).
- Dynasty identity is derived from renown/achievements/threads; faction recognition is capped ±30 (`legacy/present.ts:781-862`).

**Defect:** no shipped event, quest or adventure invokes `fx.relic(...)`. Relics are reachable only by direct test calls (`test/stage04-3-relics.test.ts:68`), so in normal play the relic system is unreachable content.

**Defect:** `buildHeir` creates a state without `social`, so NPC relationships and NPC story memory reset at succession (`succession.ts:321-384`). This is a meaningful dynasty continuity gap.

**Status: PARTIAL–STRONG.** The model and succession are real and tested; content reachability and social continuity are incomplete.

---

## 6. The six worlds

All six follow one template: 4 origins, 4–6 social classes, 3 factions, 12 skills, 3–4 world talents, 2 world weaknesses, 8 professions, 3 education tiers, 3 specializations, 3 family secrets, 5 path ranks, 3 settlements, 2 places, 2 adventures and 3 market goods. Differentiation comes from identity, meters, path rules, events, goods and inheritance law.

| World | Identity | Distinct mechanics | World-specific events | Adventures | Quests |
|---|---|---|---|---:|---:|---:|
| **Dark fantasy — The Ashen Kingdoms** | Sunless oathbound kingdoms, Mist and Ash | Corruption + Last Flame; Order/Mist oaths; corruption can kill at 90+; 15 `df.*` + 5 `world.*` definitions | **20** | 2 | 0 |
| **Isekai — Ardenvale** | Reincarnated in a guild/System world | System favour; five fixed System quests with deadlines; past-life memory flags | **14** | 2 | **5** |
| **Murim — The Nine Rivers** | Martial clans and inner energy | Qi deviation; demonic path builds deviation, damages at 60, kills at 100; faction drift | **13** | 2 | 0 |
| **Xianxia — The Heavenly Verge** | Cultivation, dao heart and karma | Dao heart + karmic debt; spirit root; tribulation chain; long lifespan | **13** | 2 | 0 |
| **Hunter — Neo-Seoul** | Gate outbreaks and hunter rank | Gate threat + fame; district-break at 80; rank-based clear income | **13** | 2 | 0 |
| **Academy — The Lireval Empire** | Nobility, court and mana circles | Court favour + scandal; estate promotion by decree; academy student flag | **13** | 2 | 0 |

### 6.1 World-by-world notes

**Dark fantasy** is the most content-rich and the only world with dynamic settlement/faction events (`world.settlement-crisis`, `world.ancestor-promise`, `world.faction-invitation`). Corruption and ember are wired into yearly rules and death. It still lacks an Order hierarchy, mutation system and more than two adventures.

**Isekai** is the only quest world. System favour decays and accelerates the path. Past-life memory is a flag plus a few checks; there is no technology tree, Earth-knowledge economy, reincarnation meta-progression or System UI beyond text.

**Murim** has the strongest danger meter: yearly qi deviation damage and death. Dark/orthodox factions move automatically. “Face” is not a separate mechanic; there is no sect management, duel circuit or honor economy.

**Xianxia** uses dao heart and karmic debt to modify path growth; tribulation is one event chain, not a general breakthrough risk. Alchemy/formations exist only as flavor, one specialization and events.

**Hunter** uses gate threat as a timer that schedules one district-break event; fame decays and clear income scales with rank/fame. There is no dungeon crawler, party play, guild raid, monster roster or equipment.

**Academy** wires court favour/scandal and can auto-raise social class at high favour. “Academy” is three education entries plus events; there is no class schedule, exam system, club, duel or social calendar. The Rose Society is a faction score, not an organization.

### 6.2 Shared-world verdict

Six worlds exist as **content/rule variants of a single-player life simulator**. They are not six persistent servers, six shared economies or six multiplayer maps. A player in Dark Fantasy cannot meet, trade with or affect a player in Isekai, and two players in the same world do not share settlements, factions, markets or events.

---

## 7. Economy, market and region

### 7.1 What works

- Income and expense lines: profession, guild, trade, class, thrift, world, cycle, tax, living (`economy/economy.ts:50-84`).
- Adults from age 16; living cost by social standing and world factor; hardship after shortfall; −1 reputation/year after three hardship years (`:102-119`).
- Wealth clamp 0..1,000,000,000 (`stats.ts:74-77`).
- Cycles slump/normal/boom with ±20% earnings; 15% chance to leave normal, 25% to return (`economy.ts:26-29,86-100`); per-world names/tax/living factor (`economy/worlds.ts:21-84`).
- Three goods per world; buy = base × cycle × stock × 1.25; sell = base × cycle × stock × 0.8; stock cap 20, quantity cap 5 (`economy/market.ts:17-92`).
- Goods are consumed one per year for skill/meter/faction effects (`market.ts:118-166`).
- Region stock 0–100 starts at 60, +8/year, buy −4, sell +3; strain/prosperity 0–100; adventure marks once; per-life (`economy/region.ts:13-172`).
- Tests assert buy > sell in all cycle/stock combinations and that no simple arbitrage exists.

### 7.2 What is missing

- **No player-to-player economy.** `trade` exchanges with an abstract market; there is no counterparty, offer, contract, auction or player-set price.
- **No shared market.** `economy.goods` and `region.stock` are fields of one player’s `GameState`; one player cannot move another’s price or stock.
- **No businesses, production, wages, contracts or property.** Profession/class income are formulas.
- **No economic ledger** beyond history changes and yearly economy records.
- **`ask-help` faucet** creates gold without debiting the NPC; gifts destroy gold without crediting the NPC. This breaks conservation and can be farmed once per NPC per year.
- **Adventure rewards recur per generation** because adventure state resets on succession.

**Status: PARTIAL.** A functional single-player economy, not a player-driven one.

---

## 8. World simulation, factions and dynasty influence

### 8.1 Implemented

`worldTick` runs once per advanced year after `worldYearly` (`engine/game.ts:221-225`). Each world has three settlements and three factions (`world/state.ts:25-132`).

- Settlements track population, prosperity, stability and dominant faction. Prosperity follows economy cycle, dynasty influence and random drift; stability follows prosperity; population grows/shrinks; crises and recoveries create activity entries (`world/state.ts:224-236`).
- Factions track power, influence and standing; character faction score feeds influence, power drifts; dynasty influence adds ±10 (`world/state.ts:89-92,237-243`).
- Activity feed keeps 24 entries, newest first, kinds settlement/faction/crisis/discovery/family (`types.ts:621-636`; `world/state.ts:175-189`).
- Dynasty influence is stored per settlement/faction, ±5, max 8 entries (`types.ts:450-463`); renown ≥30 gives +1 prosperity to all settlements; renown ≥50/−50 creates recognition/disgrace entries (`world/state.ts:191-223`).
- World conditions can gate events (`when.settlement`, `when.worldFaction`).

### 8.2 Limitations

- **Per-life:** all world state is inside `GameState.world`; the RNG is derived from the life seed and age (`world/state.ts:198-202`). There is no global world row and no other-player input.
- **Generic model:** all worlds use the same settlement/faction structure; no trade routes, territory, laws, diplomacy, faction goals or membership.
- **Content coverage 1/6:** settlement/influence effects and the five `world.*` events exist only in dark-fantasy (`universes/dark-fantasy.world.ts:322-395`).
- **Clock resets at succession:** `state.tick = state.life.age`, so the world “year” jumps backward to the heir’s age even though settlement state persists.
- **Faction recognition has an arbitrary modifier:** `faction.id.charCodeAt(0) % 7 - 3` (`legacy/present.ts:826`).

**Status: PARTIAL.** A real deterministic simulation, but local to one save.

---

## 9. Live ops, insights and mastery

### 9.1 Live windows

Two pure templates: daily watch (goal 25, 1 contribution/life, 40 gold) and weekly store (goal 60, 3/life, 80 gold). UTC windows move draft→scheduled→active→completed→archived (`live/ops.ts:5-35`; `live/templates.ts:19-49`).

API behavior: contributions increment a global `liveWindow.progress`; each life can contribute once per year; claim grants gold and a flag in one transaction (`apps/api/src/live/live.service.ts:192-274`). Production currently has zero live windows.

**Integrity defect:** claim is recorded only as a mutable snapshot/`claimedAt` pair. Restoring the life to a pre-claim snapshot clears the claim flag and `claimedAt` via `releaseUndoneClaims`, allowing the same life to claim the same window again. See `SECURITY_AUDIT.md` L-1. This is a P1 economy exploit if live windows are enabled.

### 9.2 Insights

Facts: `life.created`, `life.died`, `track.rank`, `level.up`, `quest.done/failed`, `adventure.done/failed`, `market.trade`, `live.joined/claimed`, `action.rejected`. Retention 90 days; minimum sample 8; hard-failure threshold 70%; no auto-balancing (`live/insights.ts:1-70`; `apps/api/src/insights/insights.service.ts:85-95`).

Insights are anonymous aggregates, not a world simulation. They cannot change gameplay.

### 9.3 Mastery

Eight objectives: all places, all adventures, path skill 80, highest rank, highest education, 8 achievements, master-of-world, temperament bent (`endgame/mastery.ts:46-109`). `masteryYearly` records objectives/skills once and grants **no gold, XP or stats** (`:120-140`); the UI is a checklist (`:169-193`). It is a completion tracker, not an endgame loop.

---

## 10. Multiplayer-relevant gameplay

`GameState` has one seed, one RNG state, one character, one life, one world and one lineage (`types.ts:638-689`). `applyAction` deep-clones and advances one life (`game.ts:372-441`). Succession creates a new state for one heir (`succession.ts:461-607`).

Shared features outside `game-core`:

| Feature | Shared scope | Affects another player? |
|---|---|---|
| Friends/block ties | Player graph | No gameplay effect |
| Live windows | Global progress counter | Only the claimant’s gold/flag; progress is cosmetic |
| Insights | Anonymous aggregates | No |
| Portal profile (uncommitted) | Read-only display name/life counts | No |

There is no presence, realtime transport, shared character, co-op, PvP, chat, guild, player trade or shared world tick.

**Status: MISSING / BLOCKED.** The deterministic per-life model is a good foundation for an authoritative server, but it is not a multiplayer architecture.

---

## 11. Test coverage for gameplay

- 42 game-core test files, 489 static `it`/`test` declarations; 609 tests executed in this audit.
- Broad coverage of determinism, birth, aging, skills, checks, events, conditions, effects, chains, consequences, kin validation, NPC life, adoption, guardianship, succession laws, chronicle, achievements, economy, market spread, region, adventure locks, content references, long-term soak and save migration.
- 1 real failing test (lineage consequence provenance).
- 2 slow/flaky tests at the default 5 s timeout (`stage04-events`, `stage04-import` xianxia); both pass at 30 s.
- No test proves relic reachability through content; the relic test calls the effect directly and even accepts `relics` being `undefined`.
- No test covers the `ask-help` faucet, gift/NPC wealth consistency, player marriage/divorce actions or shared-world behavior.
- Live/insights game-core tests cover pure rules only; DB-backed concurrency lives in API tests.

---

## 12. Gameplay gap summary

| Target pillar | Current state | Gap to target |
|---|---|---|
| Life simulation | Aging, family, NPC life, economy, health, death | Disease/injury, pregnancy, equipment, schedule, housing, player-directed daily life |
| RPG | Stats, skills, paths, professions, education, specializations, checks | Level-gated content, combat, equipment, quest chains, meaningful build choices |
| Story | Real DSL and 94–102 definitions/world | More world-specific and long-range branching content; dialogue; fewer shared events |
| Relationships | Affinity, interactions, NPC–NPC life, three story arcs | Player marriage/divorce actions, dialogue graph, more arcs, social memory across generations |
| Dynasty | Kin graph, succession, laws, guardianship, chronicle, achievements | Reachable relics, social continuity, world clock continuity, player wills/law choice |
| Living worlds | Per-life settlements/factions/feed | Shared global state, cross-player consequences, content in all six worlds |
| Multiplayer | Friends/live counters only | Authoritative shared world, presence, realtime/async sync, trading, guilds |
| Economy | Single-player market/region/cycles | Player-to-player trade, shared market, businesses, ledger, conservation fixes |
| Social organizations | Faction scores | Membership, ranks, goals, guild management, collective projects |
| Six worlds | Six distinct rule/content variants | Depth per world, unique systems beyond meters, shared-world identity |

The game is a credible **single-player life-sim RPG with dynasty**. It is not yet a **multiplayer living-world RPG**.
