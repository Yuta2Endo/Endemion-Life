# Endemion Life — Living World Engine audit

**Дата:** 2026-11-07  
**Базовая ветка:** `main` at `1c5bb41616cdeb4d916ee6349a9a16d3f1e34f28`  
**Production:** `https://life.endemion.online/` (deployment этого workstream не выполняется)

## Итог

Текущая `main` уже содержит значительную часть character/world foundation, которая в историческом отчёте Stage 02 была описана как отдельная ветка:

- шесть вселенных и world-specific rules;
- deterministic `GameState`/`applyAction` pipeline;
- NPC lifecycle, kin graph, marriages, children, careers, illness, accidents, battles, missing/returning and retirement;
- relationships, professions, factions, meters and delayed consequences;
- save validation/migrations through schema version `8`;
- shared `LifeView`, dossier, timeline and responsive play screen;
- Stage 01 progression modes, milestones, current/final summaries and chronicle provenance.

Это подтверждено чтением текущих файлов и существующих unit/E2E suites. Исторический commit `66602fb` (`origin/feature/stage-02`) не является безопасной точкой для cherry-pick: он предшествует последующим Stage 03–10 changes, а его собственный report explicitly оставляет NPC self-life for a later stage. Поэтому его код не вливается и не используется как второй source of truth.

## Найденные расхождения с Living World Engine scope

### 1. Нет отдельного persistent world-state projection

`GameState` содержит character-centric `meters`, `factions`, `economy`, `region`, `npcs` и `lineage`, но не содержит компактного общего состояния живого мира:

- settlements/regions as named entities;
- population/health/wealth or stability values;
- faction power/relations as world-owned values;
- current world activity feed suitable for a world-level panel.

Current `world/rules.ts` changes player meters and emits history entries, while `npc-life.ts` updates NPCs. This is authoritative and reusable, but the world itself is not yet represented as a first-class projection.

### 2. No activity feed contract

Visible notable NPC/world changes are emitted into `HistoryEntry` (`people`, `quest`, `year`) and some NPC changes are kept in NPC logs or lineage chronicle. There is no bounded, localized, typed feed that the UI can render without interpreting all history entries.

### 3. Existing UI has a safe integration point

`PlayScreen` already has:

- one authoritative `perform(GameAction)` path;
- mobile tabs and desktop three-column layout;
- `NowPanel`, `Dossier`, `Timeline`, current summary and localized messages;
- responsive overflow handling for the family tree/timeline.

The least risky UI extension is a world/activity section inside the existing dossier/now surface, not a second page or a second action/event system.

### 4. E2E coverage gap

`apps/web/e2e/game.spec.ts` covers creation, progression, event choice, save reload, language, dossier, NPC interaction and timeline basics. It does not separately assert:

- `setMode` manual/auto/milestones;
- milestone stop/choice flow;
- current summary fields;
- delayed consequence provenance detail;
- timeline inspection on a narrow viewport.

Those tests should be added after the data projection is stable.

## Compatibility constraints

- Reuse `GameState`, `applyAction`, `HistoryEntry`, `EngineContext.source`, seeded RNG and the existing save/API pipeline.
- Do not use `Math.random()` in simulation.
- Do not raise `SAVE_SCHEMA_VERSION` for optional additive state unless migration and backward-compatibility tests are required and implemented. The first implementation should normalize absent world fields at action/presentation boundaries, matching the existing Stage 01 approach.
- Keep all six universes valid and deterministic.
- Keep the existing dark RPG visual system, desktop three-column layout and mobile tab navigation.
- Do not restore deleted historical stage documents or touch untracked Android/asset work.

## Recommended implementation order

1. Add an additive `world` state with bounded settlements, faction/world summaries and activity entries.
2. Normalize absent `world` state for old saves and validate bounds without changing the schema version.
3. Run the world tick from the existing yearly `advance` cycle, using the NPC-derived RNG stream and `EngineContext.source` for emitted entries.
4. Expose a redacted/localized world view through the existing `LifeView` projection.
5. Render the feed in the existing dossier/now surface with RU/EN labels and narrow-screen overflow protection.
6. Add deterministic unit tests, save round-trip/legacy normalization tests, and the missing Stage 01/02 Playwright scenarios.

## Historical documents

The working tree contains user deletions of historical `STAGE_*.md` files. Their contents remain available through Git history for audit only. This audit intentionally does not restore those deletions.
