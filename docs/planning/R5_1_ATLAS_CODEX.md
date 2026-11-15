# R5.1 — The Atlas: World Codex

**Status:** implemented and verified locally; release pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none

## 1. What was added

The Atlas is a read-only in-game compendium for all six worlds. It turns existing world definitions, progression and adventure discoveries into one archive that makes each world's identity and rules visible without changing game state.

The first R5 slice adds:

- a pure `presentAtlas(snapshot)` function in `packages/game-core/src/atlas/atlas.ts`;
- an `AtlasView` with world identity, laws, mechanics, meters, progression, social classes, factions, places and adventures;
- progress counters for discovered places, completed adventures, known factions and available mechanics;
- a new **Atlas** tab in the life dossier between **World** and **Road**;
- a web panel localized in Russian and English.

No save field, API route, database table or migration was added. The view is built on the client from the existing life view.

## 2. Atlas contents

### World identity

- Name, tagline and description.
- World laws.
- Lifespan and the local name of magic or its equivalent.
- Theme accent used by the panel.

### Mechanics and scales

- Every world mechanic with its localized name and description.
- Current values of world-specific meters, with danger highlighting.

### Path and society

- Track name, description, points name, current points and rank.
- Current and next rank thresholds with a progress bar.
- Social classes with standing, income, occupations and a marker for the character's current class.
- Factions with current standing, or "no ties" when the character has not encountered them.

### Places and roads

- Both places of the world.
- Undiscovered places hide their name, description and adventures; only an age hint is shown.
- Discovered places reveal their localized lore and nested adventures.
- Adventure statuses: completed, failed, active, available, locked.
- Lock reasons: age, undiscovered place, missing prerequisite, pending event.
- Prerequisite names and reward descriptions.

## 3. Purity and determinism

`presentAtlas` is a pure function:

- it receives a narrow `AtlasSnapshot`;
- it does not read the database or files;
- it does not use randomness;
- it does not mutate the snapshot;
- identical snapshots produce identical views.

This keeps the module inside the pure deterministic `game-core` boundary.

## 4. Web integration

`apps/web/src/components/play/atlas-panel.tsx` builds the snapshot from `LifeView`:

- `universeId`;
- `life.life.age`;
- `life.character.track`, `factions`, `socialClassId`;
- `life.profile.meters`;
- `life.adventure`.

The new tab is registered in `apps/web/src/components/play/dossier.tsx`. The panel uses the existing `Panel` component and bilingual `useI18n()` helpers.

## 5. Verification

| Check | Result |
|---|---|
| Atlas game-core tests | **5/5** |
| Full game-core suite | **54 files / 781 tests** |
| Game-core build | PASS |
| All six worlds build non-empty Atlas data | PASS |
| Deterministic output for identical snapshots | PASS |
| Undiscovered place masking | PASS |
| Completed, failed and active adventure statuses | PASS |
| Age lock, rank progress and faction standing | PASS |
| Web lint | PASS (only pre-existing warnings) |
| Web typecheck | PASS |
| Web production build | PASS, 12 routes |

## 6. Limitations

- R5.1 makes existing content legible; it does not yet add the 30–40 events per world required by the full R5 target.
- Each world currently has two places and two adventures.
- Undiscovered places intentionally hide their lore.
- There are no deep links from the Atlas to the Road tab or a specific adventure.
- There is no server-side Atlas endpoint; the client builds it from the life view.
- Reading the Atlas does not create progress or notifications.
- Long arcs, quests, relics and NPC storylines remain future R5 slices.

## 7. Rollback

No database migration or API contract was added. Application rollback is safe; the Atlas exists only in code and the web bundle.
