# Website design implementation report

Status: **implemented and verified locally, committed to `main` in design commits through Phase 7; Phase 8 accessibility hardening is the final uncommitted slice.**
Production deployment of the design work has **not** been requested or performed by this work.

## Direction

The Living Chronicle: an atlas of six worlds, a folio for every life, and a chronicle spine of years. The life is the hero; the archive is navigation; one bold gesture per page; data is engraved rather than decorated.

## Delivered phases

| Phase | Scope | Commit |
| --- | --- | --- |
| 0–2 | Design tokens, typography, panel/button primitives, header, home hero and atlas, world plates | `75828b0` |
| 3 | Three-step birth rite, sticky folio preview, mobile submit bar | `f18abdb` |
| 4 | Life desk header, Chronicle Spine timeline, event stage, character sheet | `62804d9` |
| 5 | Dynasty folio, generation chips, heir seal, death summary | `bad0048` |
| 6 | Great Hall social layout, procedural guild heraldry, quiet account register | `c68f93a` |
| 7 | Six distinct world plate illustrations, line-icon set, year-notch and page motion | `c9575ce` |
| 8 | Skip link, visible focus on auth/create fields, form names, touch behaviour | final accessibility slice |

## Phase 8 changes

- `apps/web/src/app/layout.tsx`: added a first-focus skip link to `#main-content`; the content wrapper is focusable.
- `apps/web/src/app/globals.css`: skip-link styles, `touch-action: manipulation` on interactive controls, intentional tap highlight, reduced-motion exclusion.
- `apps/web/src/components/create-form.tsx`: name and seed inputs now have `name` attributes and visible `focus-visible` outlines.
- `apps/web/src/components/account/account-panel.tsx` and `reset-password-form.tsx`: email, password, verification code and new-password fields have names and visible focus outlines.
- `apps/web/src/lib/messages.ts`: RU/EN skip-link copy.

## Verification

| Gate | Result |
| --- | --- |
| Web unit tests | **10 files / 28 tests passed** |
| Web typecheck | **PASS** |
| Web production build | **PASS**, 12 routes |
| Playwright desktop + mobile | **62 / 62 passed** |
| Lint | **0 errors**, 1 pre-existing `play-screen.tsx` exhaustive-deps warning |
| Horizontal overflow | 0 at **320 / 390 / 768 / 1440** |
| Skip link | first Tab focuses “Перейти к содержимому”; Enter moves focus to `#main-content` |
| Console/page errors | none on home/worlds at tested widths |

Screenshots are in `C:/Users/sasha/AppData/Local/Temp/opencode/`:
`design-phase7-home-1440.png`, `design-phase7-home-390.png`,
`design-phase7-worlds-1440.png`, `design-phase7-worlds-390.png`,
`design-phase7-cards.png`, `design-a11y-skip.png`.

## Performance baseline

Measured from the production build in `apps/web/.next/static`:

- JavaScript: **21 chunks, 1,861,137 bytes uncompressed**; largest chunk 841,577 bytes.
- CSS: **66,725 bytes**.
- Fonts: **11 files, 261,716 bytes** (Alegreya + Golos Text, RU/EN subsets).
- World plates are inline SVG; no raster art or new image payload was added.
- No new runtime dependency was introduced.

These are uncompressed build artefacts, not transfer sizes. Formal Lighthouse CI budgets, code-splitting of play/dynasty panels, and visual-regression snapshots remain future work.

## Accessibility checklist

- [x] Skip link and focus target.
- [x] Visible `focus-visible` treatment on header, creation, auth and play controls.
- [x] Wrapping labels for form fields; names on auth/create inputs.
- [x] `aria-label` on icon-only controls, tabs, progress and live regions where present.
- [x] Keyboard-operable play/dossier tabs (covered by Playwright).
- [x] `prefers-reduced-motion` disables animation and transition durations.
- [x] `color-scheme: dark` and matching theme colour.
- [x] 44px key touch targets, safe-area padding, no horizontal overflow.
- [ ] Formal axe/Lighthouse CI gate.
- [ ] Full screen-reader, 200% zoom and Android WebView smoke audit.
- [ ] Visual-regression baselines for every route.

## Constraints preserved

- No gameplay, save-schema, API or database changes.
- Save schema remains **14**; production migrations remain **13**.
- Six worlds and deterministic `game-core` untouched.
- Portal files and the 74 untracked Stage 11 reports / blueprint `.docx` remain out of design commits.
- No production deploy was performed as part of the design implementation.
