# R5.3 — Relics of the Third Road

**Status:** implemented and verified locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none  
**Production runtime:** `020a2ad` (not changed by this work)

## 1. What was added

R5.3 gives each of the six third-road adventures a family relic as an alternative final reward. The relic is awarded by exactly one final branch, while the other branch keeps its existing material or political reward. No new effect types, save fields, API routes or database tables were added.

The relics use the existing `RELICS` catalog in `packages/game-core/src/legacy/stories.ts`, the existing `fx.relic(id)` DSL helper and the existing `applyRelic` engine path. Acquisition is deduplicated and its configured effects apply once, as with the original six relics.

## 2. Relics

| Relic id | RU name | EN name | Effects |
|---|---|---|---|
| `drowned-bell` | Колокол утопленницы | The Drowned Bell | `corruption -10`, `karma +4` |
| `caravan-ledger` | Журнал каравана | Caravan Ledger | `wealth +20`, `guild-craft +3` |
| `iron-shrine-tablet` | Железная дощечка | Iron Shrine Tablet | `inner-cultivation +3`, `qi-deviation -5` |
| `star-well-cup` | Чаша звёздного колодца | Cup of the Star Well | `dao-heart +8`, `karma +3` |
| `red-gate-core` | Ядро Красных Врат | Red Gate Core | `gate-threat -10`, `association +4` |
| `star-chart` | Звёздная карта | The Star Chart | `court-favor +6`, `arcana +3` |

All effect ids belong to the world that awards the relic: dark fantasy, isekai, murim, xianxia, hunter and academy respectively.

## 3. Branches

| World | Third-road adventure | Final step | Relic branch | Other branch | Relic |
|---|---|---|---|---|---|
| Dark Fantasy | `df.bell-toll` | `toll` | `deep` | `chapel` | `drowned-bell` |
| Isekai | `is.lost-caravan` | `ledger` | `league` | `guild` | `caravan-ledger` |
| Murim | `mu.shrine-debt` | `choice` | `burn` | `alliance` | `iron-shrine-tablet` |
| Xianxia | `xi.star-trial` | `choice` | `keep` | `tell` | `star-well-cup` |
| Hunter | `hu.red-gate-raid` | `core` | `report` | `corp` | `red-gate-core` |
| Academy | `ac.star-chart` | `dome` | `tower` | `court` | `star-chart` |

Each chosen branch now makes the transfer explicit in its success text:

- the bell's clapper is taken before the bell is sunk;
- a page with the character's own entry is torn from the ledger;
- the tablet bearing the character's name is taken before the rest burn;
- the cup with the reflection is hidden under the robe;
- the Association lets the character keep a shard of the Red Gate core;
- the Mage Tower makes the character a copy of the chart.

The other branches keep their existing rewards unchanged.

## 4. Verification

| Check | Result |
|---|---|
| Targeted tests: `stage04-3-relics`, `stage25-third-road`, `stage11-content` | **35/35** in 3 files |
| Full game-core suite | **55 files / 788 tests**, all passed |
| `contentProblems()` | empty for all six worlds |
| Relic catalog | 12 relics; ids match keys; RU/EN names and descriptions non-empty |
| Relic acquisition | each new relic added exactly once; configured effects applied once |
| Final-branch awards | each relic awarded only by its chosen branch; the other branch awards none |
| Game-core build | PASS |
| Web typecheck | PASS |
| Web production build | PASS, 12 routes |
| Web lint | PASS, only the pre-existing `play-screen.tsx` hook warning |

## 5. Limitations

- Relics are attached only to third-road final branches; earlier roads and legacy events were not extended.
- The other final branch keeps its existing reward and does not receive a relic.
- Descriptions are lore text only; no new art or item UI was added.
- Third-road places still open randomly, at most one per year, so a life may not see the road that carries a relic.
- No new effect types, save fields, API routes or migrations.
- Relics are inherited through the existing `lineage.relics` path and remain part of save schema 14.

## 6. Rollback

No database migration, API contract or save-schema change was introduced. Rolling back means reverting the R5.3 content, catalog, tests and this document; existing saves remain valid because `lineage.relics` and save schema 14 are unchanged. Production continues to run `020a2ad` until the release is reviewed and deployed; the standing rollback target remains `4f074e8`.
