# Development Gap Analysis — Endemion Life

**Audit date:** 2026-11-13  
**Compared against:** the target GDD in `docs/Endemion_Life_Development_Blueprint_RU.docx` (v1.0, 13 Nov 2026) and the STAGE 00 mission brief.  
**Status definitions:** COMPLETE = implemented and reachable in normal play; PARTIAL = working subset or shallow implementation; MISSING = no implementation; BLOCKED = code exists but cannot be used safely/reliably; NOT VERIFIED = evidence insufficient.

> Documentation is not treated as implementation evidence. Each row is based on source inspection, production data, or executed tests.

---

## 1. Summary scorecard

| System | Current status | Target status | Gap | Priority |
|---|---|---|---|---|
| Life Simulation | PARTIAL | Deep life sim: health, education, career, property, relationships, aging, death | Core loop exists; health is derived, no injury/illness system, no property/business, limited choice | P1 |
| RPG | PARTIAL | Stats/skills/checks, quests, rewards, specializations, world mechanics | XP/levels have no content gates; 5 quests in one world only; no equipment/combat | P1 |
| Story Engine | COMPLETE (engine) / PARTIAL (content) | Conditional events, choices, long-term consequences, world-specific arcs | DSL is real; 94–102 definitions/world but ~75 shared; only two long-range arcs | P1 |
| Dynasty & Legacy | PARTIAL–STRONG | Generational family, inheritance, family property, cross-player dynasties | Succession/laws/kin exist; relics unreachable, world clock/social memory reset, no player families | P1 |
| Living Worlds | PARTIAL | Six persistent worlds with shared population/economy/politics | Six distinct private simulations; no shared world state or tick | P1 |
| Multiplayer | MISSING | Persistent shared world, presence, families, trade | No shared state, realtime, chat, or player economy | P0 (strategic) |
| Social Systems | PARTIAL | Friends, guilds/orders, families, reputation, shared projects | Friend/block and live goals only; 0 ties/windows in production; no guilds/chat | P2 |
| Economy | PARTIAL | Player-driven economy, businesses, trade, sinks/faucets | Per-life NPC market, 3 goods/world; no player trade, ledger, or shared prices | P1 |
| Web | COMPLETE (playable) / PARTIAL (quality) | Stable, responsive, accessible web client | Playable; duplicate Dossier bug, mobile overflow, no loading/error boundaries, bundle weight | P1 |
| Android | BLOCKED | Signed, tested Android app on Play | Remote shell exists; build unreproducible, no signing/Play compliance/safe areas | P1 |

**Overall:** a credible **single-player life-sim/RPG foundation** exists. The target is a **multiplayer living-world RPG**; the shared-world layer is essentially absent. The gap is large but incremental, not a rewrite.

---

## 2. Detailed comparison

### 2.1 Life Simulation

**Target:** character creation, attributes, skills, age, progression, health, personality, state transitions, education, career, property, relationships, meaningful death.

**Current:**
- Creation: universe, name, gender, race, origin, temperament; stats are rolled (2d5 + modifiers, capped 30), not point-bought. Birth adds family, parents, siblings, grandparent, omen, talents, weaknesses, secret (`character/generator.ts`, `character/birth.ts`).
- Eight temperaments; six life stages; aging and death; derived health = `40 + vitality*4 + (level-1)*5 + rank*15`.
- Stats/resources, skills, education, profession, specialization, factions, goal, track.
- NPC life simulation (aging, career, marriage, children, death) and nine interaction types.
- No illness/injury system, no disability, no property, no business, no player-owned household, no travel between settlements.
- Death is mostly age/health/event-driven; no detailed cause-of-death model exposed to the player.

**Gap:** deepen health/illness/injury, education/career choices, property/business, household, travel, and player agency in creation. **Priority P1.**

### 2.2 RPG Systems

**Target:** progression, skills, specializations, rewards, quests, world mechanics, balanced development.

**Current:**
- XP/levels, skill growth, skill checks in events, professions, education, specializations.
- Talents/weaknesses, factions, reputation, karma, track rank.
- World mechanics are real and distinct: corruption/ember, system favor, qi deviation, dao-heart/karmic debt, gate threat/fame, court favor/scandal (`world/rules.ts`).
- Quests: only isekai has system quests (5). Other worlds have no quest system, only events.
- No equipment, inventory items, combat, dungeons, bosses, or loot.
- Level is largely disconnected from content: most events are age/flag-gated, not level-gated.

**Gap:** quest framework for all worlds, level-gated content, equipment/inventory, meaningful specialization branches, reward economy. **Priority P1.**

### 2.3 Story Engine

**Target:** event generation, conditions, choices, consequences, history, randomness, world-specific events, long-term arcs.

**Current:**
- Real event DSL: conditions, choices, `requires`, stat checks, effects, delayed consequences, chains, flags, track/faction/meter changes.
- Narrative engine is pure and deterministic; choices and outcomes are recorded with provenance (except a lineage-consequence bug documented in `GAMEPLAY_STATUS.md` and `STAGE_00_REPORT.md`).
- 94–102 event definitions per world counting shared pool; world-specific counts: dark-fantasy 20, isekai 14, murim/hunter/academy/xianxia 13 each.
- Two long-range story arcs; most content is single-event or short consequence chains.
- History/timeline and chronicle surfaces exist.
- Localization RU/EN for content via `LocalizedText`.

**Gap:** more world-specific events, longer arcs, cross-life consequences, faction/political storylines, event pacing/anti-repetition. **Priority P1.**

### 2.4 Dynasty & Legacy

**Target:** family relationships, death, heirs, inheritance, family history, generational progression, family property, cross-player dynasties.

**Current:**
- Kin graph, lineage, generation, chronicle, achievements, traits, threads, relics, inheritance, names, world influence.
- Per-world inheritance laws: primogeniture, equal partition, clan merit, sect claim, civil code, entail; control age, regency, shares, levies, meter carry (`legacy/laws.ts`).
- Substantial succession: heir candidates, server salt, unique predecessor constraint, new heir state, lineage continuity.
- NPC life simulation and family events; guardianship bookkeeping exists.
- Relics exist in data/tests but are not reachable in normal play.
- On succession, `world.tick` resets to 0 and social memory resets; family reputation/world influence carry only partially.
- No player-to-player family, marriage, adoption, shared household, or cross-account inheritance.

**Gap:** make relics reachable, persist world/social state across generations, family property/heirlooms, player family interactions. **Priority P1.** This is the strongest differentiator and should be deepened before multiplayer families.

### 2.5 Six Game Worlds

**Target:** six distinct worlds with identity, mechanics, content, progression, economy, events.

**Current:** all six exist as data + rules + world companion:

| World | Identity | Unique mechanics | Content | Status |
|---|---|---|---|---|
| Dark Fantasy — Ashen Kingdoms | Oathbound grim kingdom | Mist/Order oaths, corruption, ember, 15% death at high corruption | 20 world events, 6 consequences | PARTIAL–STRONG |
| Isekai — Ardenvale | System/portal fantasy | Past-life memory, system favor, 5 system quests | 14 world events, 5 consequences | PARTIAL–STRONG |
| Murim — Nine Rivers | Martial clans | Demonic path, qi deviation, faction shifts, death at 100 | 13 world events, 5 consequences | PARTIAL |
| Xianxia — Heavenly Verge | Cultivation | Dao-heart, karmic debt, spirit roots | 13 world events, 5 consequences | PARTIAL |
| Hunter — Neo-Seoul | Gate apocalypse | Gate threat, fame, district break, awakened income | 13 world events, 5 consequences | PARTIAL |
| Academy — Lireval Empire | Court intrigue | Court favor, scandal, class rise | 13 world events, 5 consequences | PARTIAL |

All six have 3 mechanics, meters, factions, origin profiles, a market with 3 goods, 2 adventure places, 2 adventures per world, and inheritance law. Differentiation is real but content volume is modest and ~75 events are shared. Only isekai has quests. Economies are structurally similar (3 goods, same markup).

**Gap:** more unique events/arcs per world, world-specific economies and progression, distinct quest structures, shared-world identity. **Priority P1.**

### 2.6 Multiplayer

**Target:** persistent shared world, player presence, shared state, families, trade, economy, world simulation.

**Current:** single-player authoritative lives; shared `Tie` and `LiveWindow` metadata only; no realtime, chat, player trade, guilds, or shared world.

**Gap:** the entire shared-world layer. See `MULTIPLAYER_GAP_ANALYSIS.md`. **Priority P0 strategically, but blocked by STAGE 01 stabilization.**

### 2.7 Social Systems

**Target:** friends, guilds/orders, families, reputation, shared projects, social organizations.

**Current:**
- `Tie`: friend request/accept/block; profile search by exact name; 0 ties in production.
- Live windows: seasonal shared goals; 0 windows in production; admin routes disabled because `LIVE_OPS_TOKEN` absent from compose.
- No chat, notifications, presence, guild/order, shared project, family across players, or moderation tools.
- `/social` page is an orphan route and says “There is no public board yet”.

**Gap:** presence/chat, guilds/orders, shared projects, moderation, notifications. **Priority P2 after multiplayer foundation.**

### 2.8 Economy

**Target:** player-driven economy, businesses, trade, persistent currency, sinks/faucets, price discovery.

**Current:**
- Per-life economy: cycles (slump/normal/boom), hardship, wealth cap 1,000,000,000.
- Market: 3 goods/world, 1.25 buy / 0.8 sell markup, stock max 20; `trade` does not advance time.
- Region: per-life stock/strain/prosperity.
- `ask-help` can mint gold from NPCs; no ledger.
- No player-to-player trade, inventory items, businesses, wages, rent, taxes, or shared prices.

**Gap:** ledger, shared market, player trade/escrow, businesses, sinks/faucets, anomaly detection. **Priority P1 after multiplayer foundation; fix live duplication first.**

### 2.9 Web Platform

**Target:** stable, responsive, accessible web client; Web + Android share account/progress.

**Current:**
- Next.js 16 App Router, React 19, Tailwind 4; 8 routes; playable core loop; server-authoritative API; same-origin cookies.
- Mobile: `/worlds` and `/create` fit; homepage has 58px horizontal overflow at 390px; CTAs 38px; play bottom tabs 48px.
- Desktop play: duplicate/misplaced Dossier because the mobile wrapper is `max-lg:hidden` at `lg` and becomes a fourth grid child (`play-screen.tsx:337,433-441`); default tab is `event`, so it appears by default.
- No route-level `loading.tsx`/`error.tsx`; no fetch timeouts; cloud list errors silently hidden.
- Full `game-core` and 58.8KB dictionary shipped to all clients; all dossier panels statically imported.
- E2E: 25 tests × desktop/mobile, several conditional skips; no save/restore, social, live, OIDC, or Android tests.
- No CSP.

**Gap:** layout fixes, error/loading states, bundle splitting, accessibility, E2E expansion. **Priority P1.**

### 2.10 Android

**Target:** signed, tested app on Play; shared account/progress; offline/network handling; safe areas; push.

**Current:** Capacitor remote shell, targetSdk 36/minSdk 24, first-party cookie/OIDC design; but build unreproducible (no Capacitor deps/lockfile), no signing/AAB/Play assets, no safe-area CSS, local-mode fallback, thin-wrapper/account-deletion risk.

**Gap:** release engineering and QA. **Priority P1; see `ANDROID_READINESS.md`.**

---

## 3. Target GDD coverage matrix

| GDD requirement | Current | Gap |
|---|---|---|
| Life simulator × RPG × story | PARTIAL | Deepen health/career/property; level-gated content |
| Generations/family/legacy | PARTIAL–STRONG | Reachable relics, persistent world/social state, player families |
| Six distinct worlds | PARTIAL | More unique content/economy/quests |
| Persistent shared world | MISSING | World/shard/season, tick, projections |
| Player families/communities | MISSING | Family/household/guild tables and consent |
| Trade/business/shared economy | MISSING | Inventory, escrow, ledger, market |
| Server authority | COMPLETE (solo) | Extend to shared state |
| Web + Android, shared account | Web PARTIAL, Android BLOCKED | Release engineering |
| Migrations/tests/recovery | PARTIAL | More fixtures, restore/world consistency, backup encryption |

---

## 4. What must not be rebuilt

- `packages/game-core` deterministic engine and event DSL.
- Six-universe registry and world rules.
- Server-authoritative action pipeline with row locks/idempotency.
- Save schema 8 and additive migration chain.
- Existing UI/dossier/timeline/lineage surfaces.
- Auth/session/OIDC foundation.

The correct strategy is **preserve, stabilize, then extend** — not a second engine or a microservice rewrite.

---

## 5. Prioritized gap order

1. **STAGE 01:** fix live duplication, OIDC revocation, release reproducibility (production SHA/portal/Android), duplicate Dossier, local-mode fallback, failing tests.
2. **STAGE 02:** deepen life simulation and make RPG progression matter.
3. **STAGE 03:** complete dynasty/legacy (relics, persistence, family property).
4. **STAGE 04:** shared world read model + tick.
5. **STAGE 05:** multiplayer foundation (presence/realtime/account-gated shared play).
6. **STAGE 06:** social organizations, trade, ledger, businesses.
7. **STAGE 07:** Android release.
8. **STAGE 08:** final QA/load/disaster recovery/release.

The sequence is deliberate: every later stage multiplies consistency and security requirements, so the solo core must be boringly reliable first.
