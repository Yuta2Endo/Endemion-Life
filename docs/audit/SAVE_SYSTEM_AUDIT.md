# Endemion Life — Save System and Data Integrity Audit

**Stage:** 00 — Complete Project Audit  
**Date:** 2026-11-13  
**Scope:** `packages/game-core/src/engine/save.ts`, `game.ts`, `import.ts`, API life/restore/succession/import services, Prisma schema and migrations, backups.  
**Constraint:** no save schema, save data, database row, or migration was modified.

## 1. Executive summary

The current save format is **schema version 8**, confirmed in code (`SAVE_SCHEMA_VERSION = 8`), not merely in documentation. The migration chain 1→8 exists and is covered by tests for formats 1–4. Production still contains old-format lives (one schema 1 alive, two schema 2 dead, two schema 5 dead), all of which are read through migration/validation, so backward compatibility is exercised by real data.

The core design is sound for a single-player game:

- The server stores the full authoritative `GameState` as JSON plus a DB `schemaVersion` column.
- Every action is versioned, idempotent by `actionId`, and written with history and a snapshot in one transaction.
- Restore creates a new version and deletes later history/snapshots, preventing a simple “load old save and keep both branches” divergence.
- Succession creates a new life with a unique predecessor, lineage ID, and server-generated salt.
- Import is explicitly marked `local-import`, regenerates the seed/RNG, strips unverified hidden values, and is idempotent by `(playerId, importId)`.
- Ten additive migrations exist; none drops or rewrites historical rows.

The risks are in edge semantics, not the basic format:

1. **Live claim → restore → claim duplicates rewards** (P1; latent, 0 live windows in production).
2. **Restore does not revert the action ledger, insights, or live progress**, so “undone” outcomes remain in aggregate data and replay behavior.
3. **`parseSave` is deep but not exhaustive**; optional world/relic/story branches are shallowly checked.
4. **Import trusts client age/version/history** within caps; a long name can become a 500.
5. **Migration fixtures skip formats 5–7**, so the middle of the chain is tested indirectly, not with real snapshots.
6. **Corrupt JSON becomes a generic 500**, with no player-facing recovery path.
7. **No account deletion/export**, which is a privacy lifecycle gap rather than a save-format bug.

No evidence of current save corruption or player-progress loss was found in production.

## 2. Format and versioning

- `GameState.schemaVersion` is written by `newGame` and normalized by `applyAction`.
- `Life.schemaVersion` is a DB column, default 1; the API writes the state version alongside the state.
- `migrateSave(raw)` requires a plain object and an integer `schemaVersion >= 1`; it rejects versions above 8 with `INVALID_SAVE`.
- For each version 1–7, the corresponding migration runs and sets `schemaVersion` to the next value. A missing transition is an error.
- `parseSave` then validates the migrated shape and returns a typed `GameState`.

**Historical version map:**

| Version | Introduced content |
|---:|---|
| 1 | Original Stage 01 life |
| 2 | Family, NPCs, talents, world meters |
| 3 | Kin, lineage, chronicle, succession |
| 4 | Economy |
| 5 | Market goods |
| 6 | Adventure |
| 7 | Region |
| 8 | Mastery (Stage 10 numbering) |

The DB has ten migrations: init, accounts/sessions, Endemion ID, Stage 02 schema version, Stage 03 lineage, Stage 04 import, Stage 07 ties, player name search, Stage 15 live, Stage 16 insights. All are additive.

## 3. Save lifecycle

### Create

`POST /api/lives` accepts universe/name/gender/race/origin/temperament and an optional seed. `newGame` creates a full state, initial history, and a snapshot. The seed is currently client-chosen, which is acceptable for single-player but incompatible with competitive multiplayer.

### Act

`POST /api/lives/:id/actions` sends `{ actionId, expectedVersion, action }`. The server:

1. locks the life row by `(id, playerId)`;
2. detects an existing `(lifeId, actionId)`;
3. compares `expectedVersion`;
4. parses and migrates the save;
5. applies the pure action;
6. updates life state/version/age/status/schemaVersion;
7. inserts history, a snapshot (last 50), and a game action;
8. writes insight facts after commit.

A duplicate action ID with the same canonical payload replays; a different payload returns `409 ACTION_ID_REUSED`; a stale version returns `409 VERSION_CONFLICT`.

### Restore

Restore is allowed only if the life has no successor and the lineage has not continued. It locks the life, finds the target snapshot, parses it, calls `restoreState` (bumps version and rerolls RNG), deletes history entries at/after the target sequence and snapshots newer than the target, releases live claims whose flags disappeared, writes a restore entry and a new snapshot, and optionally records a restore action.

**This is not a full branch rollback.** `game_actions`, insights, and `live_windows.progress` are not reverted. A stale action ID from the undone branch may replay as a no-op or return the current state. The live claim exploit follows from this.

### Succession

`POST /api/lives/:id/succession` requires `actionId`, `expectedVersion`, and `heirId`. The server locks the predecessor, validates the heir, applies the per-world inheritance law with a server UUID salt, marks the predecessor dead, creates the heir with `lineageId`, `generation`, and `predecessorId`, and writes history/snapshot/action. A unique predecessor prevents double succession.

### Import

`POST /api/lives/import` accepts a client-authored state/history under a 2 MB body limit, 2,000 history entries, and per-text limits. `prepareImport`:

- validates/repairs the state;
- regenerates seed and RNG;
- strips unverified hidden values;
- clamps wealth by age and some resources;
- fixes invalid pending events;
- validates history sequence is strictly increasing and below the import entry.

The life is stored with `origin = "local-import"` and a unique `(playerId, importId)`. A duplicate import returns the existing life. Imported lives still progress and appear in normal lists.

## 4. Validation coverage

`parseSave` validates:

- top-level seed, RNG, version, next sequence;
- character identity, stats 1–100, resources ≥0, level/XP, wealth 0…1e9, reputation, karma −100…100, abilities, track, class, talents, weaknesses, skills, factions, profession, education, specialization, story progress;
- life age ≥0, stage, alive flag;
- flags, auto mode, milestones, pending/scheduled events;
- background, hidden, up to 200 NPCs with unique IDs and per-NPC checks;
- meters −1000…1000, consequences (id/age/source), quest, completed quests, recent events;
- lineage via `checkLineage` (generation 1…1000, renown, lives, chronicle ≤1000, unique achievements, traits, threads ≤20, pending ≤20, stories, names, inheritance, relics, optional story progress/world influence);
- memory ≤50;
- economy, adventure, region, mastery;
- optional world (tick, settlements, factions, activities arrays);
- optional social IDs;
- `kinProblem` for cycles, age consistency, and marriage validity.

**Gaps:**

- `lineage.relics`, `lineage.worldInfluence`, `lineage.storyProgress`, and character story progress are shallowly checked.
- World settlement/faction/activity contents are not deeply validated.
- Region logs validate only kind/age.
- Adventure logs do not verify that steps and choices are consistent.
- Social is optional and only IDs are checked.
- Not every NPC/kin cross-reference is checked beyond `kinProblem`.
- `migrateV1` returns the save unchanged on an invalid shape rather than failing immediately; `parseSave` later rejects it, but the error is less precise.
- Import does not bound age or name length before the DB write.

## 5. Database constraints

| Constraint | Purpose |
|---|---|
| `lives(player_id, import_id)` unique | Import idempotency |
| `lives.predecessor_id` unique | One heir per predecessor |
| `life_snapshots(life_id, version)` unique | One snapshot per version |
| `history_entries(life_id, seq)` unique | Ordered history |
| `game_actions(life_id, action_id)` unique | Action idempotency |
| `live_parts(window_id, life_id)` unique | One part per life/window |
| `live_windows.slot_key` unique | Daily/weekly template uniqueness |
| `insights(name, ref)` unique | Fact deduplication |

Cascades delete lives/snapshots/history/actions/sessions/ties on player deletion. `lives.predecessor_id` is `ON DELETE SET NULL`. `live_parts` has no FK to `lives`, only to players/windows.

There is no DB check that `lives.schema_version = state.schemaVersion`, no check constraint on `status`/`origin`, and no `life_id` FK on live parts.

## 6. Production compatibility evidence

Production aggregate (read-only):

- schema 1: 1 alive, server origin;
- schema 2: 2 dead, server;
- schema 5: 2 dead, server;
- schema 8: 16 alive, 22 dead, server;
- 0 local-import lives;
- 6 lineages, max generation 4, 10 lives with a predecessor;
- 1,642 snapshots, 5,381 actions, 8,037 history entries.

This demonstrates that old formats 1/2/5 load in production and that succession has real use. It does not prove every optional branch of format 8 is exercised; many systems (social, live, portal, late-game relics) have little or no production data.

## 7. Data-integrity risks

| ID | Sev | Risk | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| D-01 | **P1** | Live reward duplication via restore | `live.service.ts` claim; `lives.service.ts` `releaseUndoneClaims`; window progress not reverted | Repeatable gold, corrupt shared progress | Make claims immutable/ledgered; restore branch-aware; test claim→restore→claim |
| D-02 | P2 | Restore leaves action/insight history from the undone branch | `game_actions` not deleted; insights append-only | Replay ambiguity, misleading analytics | Mark branch/voided actions; derive analytics from active branch |
| D-03 | P2 | Replay returns current state, not original response | Replay path returns locked row | Client may receive a newer state with old entries | Store response or deterministic replay |
| D-04 | P2 | Shallow optional validation | `parseSave` optional branches | Crafted/corrupt data can reach game logic | Strict schemas, property-based tests, fuzz |
| D-05 | P2 | Sparse migration fixtures | Only v1–v4 fixtures | v5–v7 transitions can regress unnoticed | Add real fixtures for each version |
| D-06 | P2 | Import trust | arbitrary age/version/history; long name | Fabricated progression, 500 on long names | Bound fields; return 400; mark non-competitive |
| D-07 | P2 | Corrupt state → 500 | `stateOf` parse; no typed recovery | Player sees generic failure; support burden | Typed 409/422, recovery/export path, alert |
| D-08 | P3 | DB version can diverge from state version | column vs JSON | Wrong migrations/lists | Write-time check and repair job |
| D-09 | P3 | `live_parts` orphan/no life FK | schema | Orphans on future delete/transfer | Add FK + cleanup |
| D-10 | P3 | No account export/deletion | no route/UI | Privacy/compliance; saves cannot be removed | Export + delete with grace period |

No active corruption or loss was observed. The P1 is latent but must be fixed before live windows are enabled.

## 8. Recovery and backups

- Backups run daily/manual: `pg_dump --format=custom --compress=6`, checksum, read-only file, retention, optional S3. Last success: 2026-11-13 03:30.
- Backups are **not encrypted** and contain PII, password hashes, encrypted refresh tokens, session hashes, and state.
- No down migrations; rollback means restore the database backup and roll back the code image.
- Restore was not tested in this audit. A restore drill should be mandatory before multiplayer.
- The API validates state on every read; a corrupt row fails closed with 500, not silent bad gameplay. That is safer than serving corrupt data but offers no recovery UI.

## 9. Recommendations

**Do not change the save schema in Stage 01.** First make the lifecycle correct around version 8:

1. Define restore as a branch operation: immutable action ledger, branch IDs, voided actions/insights, and a live-reward ledger.
2. Add real fixtures for versions 5, 6, 7; assert migration idempotency and field preservation.
3. Tighten import bounds (age, name, version) and return 400, not 500.
4. Deep-validate optional branches or explicitly quarantine them.
5. Add a typed corruption response and an export/recovery path.
6. Add write-time `schemaVersion` consistency checks.
7. Add encrypted backups and a tested restore drill.
8. Only after these are green, consider format 9 for shared-world data.

**Compatibility promise to preserve:** all existing format 1–8 saves must continue to load; migrations must be additive; no production row may be rewritten in place without a backup and a reversible plan.
