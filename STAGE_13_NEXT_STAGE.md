# Stage 13 Next Stage

## Status of Stage 13
Complete: deterministic ≥10-generation late-game soak for all six worlds, saturation comparison vs Stage 11–12 baseline, scoped lint-debt fixes, full validation passed, reports written. No deploy/commit/push.

## Recommended next steps (Stage 14 candidates)

1. Reproduce Stage 13 on CI / clean checkout to confirm `pnpm typecheck` → `pnpm lint` → full test suite green order, since web tests rely on packages being built (`dist`).
2. Decide whether the long-lived-world succession limitation (xianxia/academy/murim cannot reach 10 real generations because player reproduction events cap at ~45 while lifespans exceed 100) is a defect worth a balance change. If yes, evaluate extending `common.heir` maxAge / adding older reproduction or adoption without touching `SAVE_SCHEMA_VERSION`.
3. Address the pre-existing web `react-hooks/exhaustive-deps` warning (`apps/web/src/components/play/play-screen.tsx:170`) only with a safe `useCallback` refactor of `perform`, since adding `perform` to the deps array as-is would re-run the timer effect every render.
4. Consider extending web E2E (`apps/web/e2e/game.spec.ts`) world-summary visibility assertions that were added in Stage 12 but not executed.

## Deliverables location
- `STAGE_13_AUDIT_REPORT.md` — findings, soak tables, balance decision, lint state.
- `STAGE_13_IMPLEMENTATION_REPORT.md` — changes, validation results, files added.
- `STAGE_13_NEXT_STAGE.md` — this file.

No deploy, no commit, no push performed.
