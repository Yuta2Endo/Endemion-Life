# R1.1 — First Life Guide

**Status:** implemented locally, verified, not deployed<br>
**Scope:** onboarding and first-life guidance; no save-schema change<br>
**Baseline:** production `66aab0a` / docs `f1a829f`, save schema 14

## 1. Problem

A new player could create a life and then face a dense play desk, multiple tabs, a character folio, an event stream, a dossier, world meters and long-term systems without a clear "what do I do now?" path. The game explained its state, but not the next meaningful action.

## 2. What was added

A new `LifeGuide` panel at the top of the life desk:

- shows whether this is the first life or a later generation;
- names the current life chapter: early years, becoming, adult life, last chapter, a waiting decision, or completed life;
- gives a short, concrete instruction for that chapter;
- shows the character's life goal and progress once the goal exists;
- provides one primary action: open the waiting event, live a year, or read the completed life;
- provides a secondary action to open the dossier;
- shows a first-life checklist:
  1. make the first decision;
  2. reach adulthood;
  3. open the dossier;
- lets the player hide the checklist without losing the chapter guidance.

The guide adapts to the real `LifeView` state; it does not invent progress or rewards.

## 3. State and persistence

Guide memory is client-local and per life:

```text
localStorage["endemion-life-guide:<lifeId>"] = {
  eventSeen: boolean,
  dossierOpened: boolean,
  dismissed: boolean
}
```

- No new API.
- No new database table.
- No save schema change.
- If `localStorage` is unavailable, the guide still works; checklist memory simply does not persist.

## 4. Files

- `apps/web/src/components/play/life-guide.tsx`
- `apps/web/src/components/play/play-screen.tsx`
- `apps/web/src/components/play/life-guide.test.tsx`

## 5. Verification

- Web unit tests: **11 files / 30 tests passed**.
- Web typecheck: PASS.
- Web production build: PASS, 13 routes.
- Desktop/mobile visual check: guide renders at 1440 and 390 without horizontal overflow.
- Existing play-screen actions remain unchanged; the guide only adds a primary shortcut and chapter text.

## 6. Known limitations

- The guide does not yet write analytics events.
- The chapter copy is intentionally compact; it does not replace the full dossier or event text.
- The first-life checklist is local-only and not synchronized across devices.
- A dedicated Playwright test for checklist persistence is still pending.
- Life goal is set by the existing adulthood logic; before that the guide explains that the goal will form later.

## 7. Next slices

- R1.2: first-life completion metric and funnel events.
- R1.3: health/career/relationship chapter prompts tied to actual choices.
- R1.4: "what changed" summary after major outcomes.
