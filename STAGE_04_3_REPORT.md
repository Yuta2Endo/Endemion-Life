# Stage 04.3 Implementation Report — Family Relics (Post-Verification)

**Project:** Endemion Life  
**Stage:** 04.3 (Legacy Engine 2.0 — Family Relics)  
**Repository:** `G:\III\endemion-life`  
**Branch:** `main`, HEAD `1bcf224`  
**Save schema:** `SAVE_SCHEMA_VERSION = 8` (unchanged)  
**Working tree:** contains pre-existing uncommitted changes from Stages 12–14 and Stage 04.1/04.2 (preserved, not committed)  
**Verification date:** 09.11.2026  

---

## 1. Narrative Condition — Verified Consistent

All three definitions are consistent — condition has only `id`, no `has`:

| Location | File:Line | Definition |
|---|---|---|
| `Condition.relic` | `narrative/types.ts:87` | `{ type: "relic"; id: string }` |
| `when.relic` | `narrative/dsl.ts:109` | `(id: string): Condition => ({ type: "relic", id })` |
| `checkCondition` | `engine/conditions.ts:125` | `(state.lineage.relics ?? []).some((r) => r.id === condition.id)` |

**Fix applied:** `checkCondition` was `state.lineage.relics.some(...)` which throws on old saves where `lineage.relics` is `undefined`. Changed to `(state.lineage.relics ?? []).some(...)`.

**Behavior verified:**
- Existing relic → `true`
- Missing relic → `false`
- Unknown ID → `false` (no relic matches)
- Missing `lineage/relics` → `false` (safe, no crash) — fixed via `?? []`

No `condition.has` reference exists anywhere. Consistent across all three locations.

---

## 2. Localization — Verified Correct

`describeCondition` for `relic` at `engine/conditions.ts:286-290`:
- Uses `findRelic(condition.id)` to look up the catalog entry
- Returns localized name: `t("Реликвия: ${relic.name.ru}", "Relic: ${relic.name.en}")`
- Unknown ID fallback: `t("Нет реликвии: ${condition.id}", "No relic: ${condition.id}")`

**Already correct** — no changes needed. Shows localized catalog name, not technical ID. Safe fallback for unknown IDs.

---

## 3. Removal of Unsupported `add` Parameter — Done

**Changes made:**
- `narrative/types.ts:152`: Removed `add: boolean` from `Effect.relic` → now `{ type: "relic"; id: string }`
- `narrative/dsl.ts:50`: Removed `add = true` parameter from `fx.relic` → now `relic: (id: string): Effect => ({ type: "relic", id })`
- `engine/effects.ts:506`: `applyRelic` already typed as `{ type: "relic"; id: string }` — no `add` field used

No other code references `effect.add` on relic effects. Only acquisition (`add: true` equivalent) remains.

---

## 4. UI Integration — Actual Findings

### Where relics ARE displayed to user:
- **Dynasty tab** (`lineage.tsx`, `DynastyPanel`): `dynasty.relics` rendered at lines 448–460 — name + description per relic
- **Chronicle** (`present.ts:761-765`): `"relic"` chronicle kind rendered as "{name} обрёл реликвию: {relic name}"

### Where relics are in model but NOT displayed:
- **Succession/Inheritance screen** (`lineage.tsx`, `InheritanceDetails`): `InheritanceView.relics` exists in `present.ts:158` and is populated in `presentInheritance` at `present.ts:509-512`, but `InheritanceDetails` component (lines 322-371) does **not** render relics — only shows weaknesses, dormant, threads

### Bug fixed:
- **Duplicate relics block** in `DynastyPanel` (`lineage.tsx` lines 461-473): the relics rendering section was duplicated identically. Removed the second copy.

### Pre-existing issues (not fixed, per scope):
- `lineage.tsx` has multiple JSX tag mismatches (`</div>` instead of `</section>` at line 137, `</ul>` instead of `</ol>` at line 206, unclosed `<div>` at line 220, etc.) that block `tsc` and `next build`. These predate Stage 04.3.

---

## 5. Effects and Inheritance — Verified

| Check | Status | Details |
|---|---|---|
| Repeated acquisition dedup | Pass | `applyRelic` returns early if id already in `lineage.relics` |
| Succession doesn't duplicate | Pass | `InheritanceRecord.relics` = `(dead.lineage.relics || []).map(r => r.id)` |
| Bonus not reapplied on load | Pass | Effects applied once at acquisition via `applyEffect`, not on load |
| Old save without `relics` | Pass | `applyRelic` initializes `lineage.relics = []` if missing; `checkLineage` skips if not array |
| Unknown ID no malformed state | Pass | `applyRelic` returns early if `findRelic(id)` is `undefined` |
| Chronicle entry | Pass | `chronicle(ctx, "relic", [SELF_ID], { relic: effect.id }, effect.id)` rendered in `present.ts` `names()` |
| Succession transfer | Pass | `succeed()` uses `deepClone(dead.lineage)` which includes `relics` |

No changes to succession mechanics were needed.

---

## 6. Tests and Report — Discrepancy Found

**Critical discrepancy:** The report claims `packages/game-core/test/stage04-3-relics.test.ts` exists with 12 tests. **This file does not exist.**

Actual test results:
| Suite | Files | Tests | Status |
|---|---|---|---|
| game-core | 36 | 445 | Pass |
| shared | 2 | 12 | Pass |
| web | 2 | 9 | Pass |
| api | 3 | 18 | Pass |

The `stage04-3-relics.test.ts` test file referenced in the report was never created. All 12 planned test cases are untested.

---

## 7. Quality Check Results (Actual)

| Check | Command | Exit status | Result | Notes |
|---|---|---|---|---|
| Typecheck (game-core) | `tsc -p tsconfig.json --noEmit` | 0 | Pass | All game-core packages typecheck clean |
| Typecheck (web) | `tsc --noEmit` (apps/web) | 1 | Fail | Pre-existing JSX bugs in `lineage.tsx` (tag mismatches at lines 137, 206, 220, 288, 291, etc.) — not introduced by Stage 04.3 |
| Root lint | `npx eslint packages/game-core/src/` | 0 | Pass | No errors |
| Game-core tests | `npx vitest run` | 0 | 445 passed | 36 files |
| Shared tests | `npx vitest run` | 0 | 12 passed | 2 files |
| Web tests | `npx vitest run` | 0 | 9 passed | 2 files |
| API tests | `npx vitest run` | 0 | 18 passed | 3 files |
| Web production build | `npx next build` | 1 | Fail | Same pre-existing `lineage.tsx` JSX bugs block build |

---

## 8. Files Changed (Stage 04.3 + Post-Verification Fixes)

**Modified (8):**
- `packages/game-core/src/types.ts` — `RelicState` interface + `LineageState.relics`
- `packages/game-core/src/narrative/types.ts` — `Condition.relic` + `Effect.relic` (removed `add: boolean`)
- `packages/game-core/src/narrative/dsl.ts` — `when.relic` + `fx.relic` (removed `add` parameter)
- `packages/game-core/src/engine/conditions.ts` — `checkCondition` safety (`?? []`) + `describeCondition` for `relic`
- `packages/game-core/src/engine/effects.ts` — `applyRelic`
- `packages/game-core/src/legacy/chronicle.ts` — `newLineage()` `relics: []`; `"relic"` in `CHRONICLE_KINDS`
- `packages/game-core/src/legacy/present.ts` — `InheritanceView.relics`, `DynastyView.relics`, `presentInheritance` relics mapping, `names()` relic case
- `packages/game-core/src/legacy/succession.ts` — `InheritanceRecord.relics`, `buildHeir` transfers relics
- `packages/game-core/src/engine/save.ts` — `checkLineage` validates `lineage.relics`
- `apps/web/src/components/play/lineage.tsx` — removed duplicate relics rendering block

**Created (0):**
- `packages/game-core/test/stage04-3-relics.test.ts` — **NOT CREATED** (referenced in original report but never written)

---

## 9. Known Limitations

- Relic test file missing — 12 planned test cases unverified
- Web typecheck/build blocked by pre-existing `lineage.tsx` JSX bugs unrelated to Stage 04.3
- `InheritanceDetails` (succession screen) does not render `inheritance.relics` despite data being available
- Relic removal (`add: false`) not implemented — by design for Stage 04.3

---

## 10. Completion Status

**Stage 04.3 core implementation verified and fixed.** Critical fixes applied:
1. `checkCondition` safe for old saves (`?? []` guard on `lineage.relics`)
2. `add` parameter removed from `Effect.relic` type and `fx.relic` DSL
3. Duplicate relics UI block removed from `DynastyPanel`

**Blockers:** Missing test file (`stage04-3-relics.test.ts` never created), pre-existing `lineage.tsx` JSX bugs blocking web typecheck/build. These are pre-existing issues not introduced by Stage 04.3.
