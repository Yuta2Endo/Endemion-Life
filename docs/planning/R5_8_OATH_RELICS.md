# R5.8 — Oath Relics

**Status:** COMPLETE AND DEPLOYED (2026-11-15 20:19 UTC)  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

Each of the six worlds received a fourth and final oath — a capstone that requires the third oath and awards a unique world relic.

- Oaths per world: **3 → 4** (24 total).
- Relic catalog: **18 → 24**.
- No engine, API, DB or save changes: the content uses the existing oath chain, `fx.relic(...)`, Atlas oath board and relic codex.

## 2. Capstones and relics

| World | Oath | Relic | Relic effect |
|---|---|---|---|
| Dark Fantasy | `df.q-last-light` — «Последний свет» / "The last light" | `oath-ember` — «Уголь последнего света» / "Last Light Ember" | corruption −10, reputation +5 |
| Isekai | `is.q-contract` — «Контракт без срока» / "The endless contract" | `guild-seal` — «Печать Гильдии» / "Guild Seal" | wealth +30, guild +6 |
| Murim | `mu.q-oath` — «Клятва без имени» / "The nameless oath" | `nameless-blade` — «Клинок без имени» / "Nameless Blade" | martial-arts +5, qi-deviation −8 |
| Xianxia | `xi.q-dao` — «Слово Дао» / "The word of the Dao" | `dao-feather` — «Перо Дао» / "Dao Feather" | dao-heart +12, karmic-debt −8 |
| Hunter | `hu.q-zero` — «Нулевые врата» / "Gate Zero" | `red-gate-mark` — «Метка Красных Врат» / "Red Gate Mark" | gate-threat −10, fame +8 |
| Academy | `ac.q-star` — «Звезда над троном» / "Star above the throne" | `court-star` — «Звезда двора» / "Court Star" | court-favor +10, scandal −6 |

Every capstone has a high but reachable goal built from existing world skills, factions and meters, an 8–10 year limit, minAge 20–22, a strong reward (`xp`, relic, faction, reputation, wealth or ability) and a real penalty.

## 3. Chain behavior

- Capstones are locked until their third oath is completed.
- Third oaths now point to their capstone with `next`.
- On success, the capstone is added to `questsDone`, awards the relic and ends the chain.
- On failure, the penalty applies and the chain ends; the capstone must be accepted again later.
- `oathProblems()` remains the content gate and reports no problems for any world.

## 4. Verification

| Check | Result |
|---|---|
| Targeted oath, relic, Atlas and content tests | **4 files / 105 tests PASS** |
| Full game-core suite | **59 files / 816 tests PASS** |
| Game-core build | PASS |
| Shared typecheck | PASS |
| Web typecheck | PASS |
| Web lint | PASS (only pre-existing `play-screen.tsx:177` warning) |
| Web build | PASS, 12 routes |
| Web tests | **12 files / 32 tests PASS** |
| `oathProblems()` | empty for all six worlds |
| Migration diff | none; schema 14 |

## 5. Limitations

- One active oath at a time; a capstone cannot be started while another oath is active.
- A failed capstone does not auto-repeat and is not marked completed.
- Relics are awarded only on capstone success.
- The Atlas shows all four oaths and all three world relics without a separate unlock step.
- No new notification type; oath completion is already written to life history.

## 6. Deployment

- Code commit **`6e4a2b6`**; production runtime **`6e4a2b6`**.
- Deploy run **43757049609**, success. CI **43756641866** success; Security **43756641843** success.
- Deploy history:
  - `2026-11-15T20:18:17Z deploy-start 6e4a2b6 from 6915063`
  - `2026-11-15T20:18:44Z deploy 6e4a2b6 ok from 6915063`
- Production migrations: **26**; save schema 14.
- `/api/health` 200 with database and redis up; `/api/contracts?universeId=hunter` 200; guest `/api/notifications` 401; web `/` 200.
- Rollback target: **`6915063`**; no migration.

## 7. Rollback

No migration and no save-schema change. Application rollback is safe; the extra content is additive.
