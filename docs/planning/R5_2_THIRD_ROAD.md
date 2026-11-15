# R5.2 — The Third Road

**Status:** implemented and verified locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

R5.2 expands the Road and Atlas content from two places and two adventures per world to **three places and three adventures per world**.

Each new third road:

- opens at a new world-specific place;
- requires the existing second adventure;
- has three steps;
- contains at least one check or condition;
- ends with two different rewarded outcomes;
- uses only existing effect, skill, faction, meter and ability ids.

No engine, API, save schema or database change was required.

## 2. New content

| World | Place | Adventure | Requires |
|---|---|---|---|
| Dark Fantasy | `df.sunken-bell` — Затонувшая звонница | `df.bell-toll` — Звон под водой | `df.ash-relic` |
| Isekai | `is.sunken-road` — Затонувшая дорога | `is.lost-caravan` — Пропавший караван | `is.second-contract` |
| Murim | `mu.iron-shrine` — Железная кумирня | `mu.shrine-debt` — Долг клинка | `mu.river-debt` |
| Xianxia | `xi.star-well` — Звёздный колодец | `xi.star-trial` — Испытание звёздного колодца | `xi.spring-trial` |
| Hunter | `hu.red-gate` — Красные Врата | `hu.red-gate-raid` — Рейд на Красные Врата | `hu.gate-c` |
| Academy | `ac.observatory` — Башня обсерватории | `ac.star-chart` — Звёздная карта | `ac.second-favour` |

### Dark Fantasy

The sisters of the sunken chapel ask that a bell be taken down before it rings for the dead again. The final choice leaves it with the Order of Ash or sinks it deeper, trading reputation for relief from corruption.

### Isekai

A merchant caravan vanished on the old road. The Guild pays for an answer, not for the goods. The final choice returns the ledger to the Guild or sells it to the Merchant League.

### Murim

The Iron Shrine has collected the debts of all three schools. The final choice gives the debt to the Orthodox Alliance or burns the tablets, earning the favour of the beggars and the demonic cult.

### Xianxia

The star well opens once in a generation. The final choice tells the truth to Cloud Peak and gains spirit sense, or keeps the reflection and accepts a deeper karmic debt.

### Hunter

The Association assembles an off-the-books party for the Red Gate. The final choice reports to the Association for reputation and fame, or calls Hanseong for much more money and less fame.

### Academy

The rector asks for a star chart to be delivered without showing it to the Mage Tower or the Rose Society. The final choice gives the chart to the Imperial Court or to the Mage Tower.

## 3. Engine behaviour

The existing adventure engine already supports any number of places and adventures:

- `discoverYearly` may discover one eligible undiscovered place per year;
- `adventureBlock` checks active adventure, age, place discovery, prerequisites, completion and failure;
- `presentAdventure` exposes all three roads automatically;
- the R5.1 Atlas reads the same board and updates its progress totals automatically;
- the web Road and Atlas panels require no new UI code.

The third place increases the discovery pool. A life may need more years to reveal all three places, but no save migration is needed.

## 4. Masters and progress

The existing mastery objectives already describe "all places" and "all adventures". They now include the third road automatically:

- `roads` requires all three places;
- `deed` requires all three adventures;
- `master-of-world` requires all places, all adventures and the path skill at mastery.

Tests were updated to reflect the expanded world.

## 5. Verification

| Check | Result |
|---|---|
| `contentProblems()` | empty for all six worlds |
| Three places and three adventures per world | PASS |
| Third adventure requires the second | PASS |
| Third road blocked without its place | PASS |
| Third road blocked until the second is done | PASS |
| Full third-road playthrough per world | PASS |
| Game-core targeted tests | **28/28** |
| Full game-core suite | **55 files / 784 tests** |
| Game-core build | PASS |
| Web lint | PASS (only pre-existing `play-screen.tsx` warning) |
| Web typecheck | PASS |
| Web production build | PASS, 12 routes |

## 6. Limitations

- The worlds now have three roads, not the larger multi-arc content target.
- No new world events were added; the event target was already met.
- Existing places and roads were not rewritten.
- Discoveries remain random and limited to one place per year.
- There are no deep links from the Atlas to a specific road.
- The new roads reuse existing effect types and ability ids only.
- No new save fields, API routes or database tables.

## 7. Rollback

No database migration or API contract was added. Application rollback is safe; the third roads exist only in code and the web bundle.
