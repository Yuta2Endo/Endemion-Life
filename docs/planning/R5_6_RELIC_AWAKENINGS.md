# R5.6 — Relic Awakenings

**Status:** implemented and verified locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none  
**API routes:** unchanged  
**Production runtime:** `47593ac` (not changed by this local work)  
**Rollback target:** `47593ac`

## 1. What was added

R5.6 gives the six third-road relics a late-game continuation and makes them visible in the Atlas.

1. **Six awakened relics** — one stronger form for each third-road relic:
   - `drowned-toll` (dark fantasy);
   - `ledger-unbound` (isekai);
   - `named-tablet` (murim);
   - `full-sky-cup` (xianxia);
   - `red-gate-heart` (hunter);
   - `starless-chart` (academy).
2. **Six awakening events** — one per world, gated by the matching third-road relic. Each event is available once per dynasty, offers `awaken` or `seal`, and uses only existing conditions and effects.
3. **Atlas relic codex** — the Atlas now lists the world's relic and its awakened form, marks which are owned, and adds a relic progress counter.
4. **`LegacyBrief.relics`** — an additive presentation field so the web Atlas can read owned relics without a new API route or a save change.

## 2. How it works

- `RELICS` entries gained an optional `universeId`; the six third-road relics and their awakened forms are tagged with their world.
- Awakening events are common definitions but require both `when.world(...)` and `when.relic(...)`. Until the relic is owned they are ineligible, so the event pool and deterministic trajectories before the relic are unchanged.
- Each event has `lineageMax: 1` and `maxOccurrences: 1`; a dynasty can awaken each relic once.
- `awaken` grants the stronger relic through `fx.relic(...)` and a small health cost. The stronger relic applies its own permanent effects on acquisition.
- `seal` leaves the base relic unchanged and grants a smaller common reward instead.
- `presentAtlas` maps `RELICS` by `universeId`, so every world shows exactly two relics: the base relic and its awakened form.

## 3. Verification

| Check | Result |
|---|---|
| Targeted: `stage28-relic-awakening`, `stage21-atlas`, `stage04-3-relics` | **3 files / 36 tests PASS** |
| Full game-core suite | **58 files / 806 tests PASS** |
| `eventProblems()` | empty for all six worlds |
| `presentAtlas` relic ownership and totals | PASS |
| Event closed without relic / open with relic | PASS |
| Old save without `lineage.relics` renders legacy safely | PASS |
| Stage 04 API e2e (old save open + market) | **11/11 PASS** |
| Awaken adds the stronger relic; seal does not | PASS |
| Game-core build | PASS |
| Web typecheck | PASS |
| Web lint | PASS, only the pre-existing `play-screen.tsx:175` warning |
| Web production build | PASS, 12 routes |

## 4. Limitations

- Awakening events use the ordinary event roll, so they may arrive several years after the relic.
- No new save field, database table, API endpoint or notification.
- The Atlas shows relic lore and ownership but no separate relic art.
- The awakened form is permanent for the dynasty; there is no downgrade or choice reversal.
- `presentLegacy` and `presentLineage` guard missing `lineage.relics` with `?? []`, so old snapshots that predate the relic array still open.
- Existing saves remain valid; relics already owned will make the new events eligible.

## 5. Rollback

No database migration, API contract or save-schema change was introduced. Rolling back means reverting:

- `packages/game-core/src/legacy/stories.ts` (relic metadata and six awakened relics);
- `packages/game-core/src/narrative/relic-awakenings.ts` and the `COMMON_EVENTS` import;
- `packages/game-core/src/atlas/atlas.ts` (relic views and progress);
- `packages/game-core/src/legacy/present.ts` (`LegacyBrief.relics`);
- `apps/web/src/components/play/atlas-panel.tsx` and `apps/web/src/lib/messages.ts`;
- the R5.6 tests, this document and the `PROJECT_STATUS.md` row.

Existing saves remain valid. The production rollback target remains `47593ac`.
