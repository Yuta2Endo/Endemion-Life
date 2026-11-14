# Website design implementation report

Status: **implemented, verified and live in production on `42a572c`; the formal accessibility/performance QA gate is the current follow-up slice.**
No gameplay, save-schema, API or database changes were made.

## QA gate

The Phase 8 follow-up adds a permanent browser gate in `apps/web/e2e/design.spec.ts`:

- horizontal-overflow checks for `/`, `/worlds`, `/create/hunter`, `/account`, `/social` at 320/390/1440;
- six world plates on the home atlas;
- skip-link keyboard path;
- axe WCAG 2.0/2.1/2.2 A+AA scans for public surfaces and the play desk;
- a transfer-size regression ceiling for the home page.

Axe found and the slice fixed two real issues: the logo link accessible name did not match its visible text, and footer language buttons were below the 24×24 CSS-pixel target minimum. The timeline inspect button also had an `aria-label` that omitted most of its visible content; it now uses its visible text as the accessible name.

Measured on the local production build at a mobile-sized viewport:

| Resource | Encoded bytes |
| --- | ---: |
| JavaScript | 477,109 |
| CSS | 11,090 |
| Fonts | 126,652 |
| Document | 24,959 |
| **Total** | **~639,810 (640 KB)** |

The gate enforces a **600 KB JS** and **750 KB total** regression ceiling. The plan's aspirational 300 KB initial payload is **not met**; the remaining gap is the client-side game/play bundle and is recorded as future performance work.

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
| 8 | Skip link, visible focus on auth/create fields, form names, touch behaviour | `42a572c` |
| QA gate | Axe WCAG scans, structural responsive checks, transfer budget | current follow-up |

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
| Playwright desktop + mobile | **74 / 74 passed** (includes 12 design-gate checks) |
| Axe WCAG 2.0/2.1/2.2 A+AA | **PASS** on home, worlds, create, account, social and play desk, desktop and mobile |
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

These are uncompressed build artefacts, not transfer sizes. The QA gate measures the actual encoded transfer of the home page: **477,109 B JS + 11,090 B CSS + 126,652 B fonts + 24,959 B document ≈ 640 KB**. The gate fails above **600 KB JS** or **750 KB total**. Lighthouse CI, code-splitting of play/dynasty panels, and pixel visual-regression baselines remain future work.

## Accessibility checklist

- [x] Skip link and focus target.
- [x] Visible `focus-visible` treatment on header, creation, auth and play controls.
- [x] Wrapping labels for form fields; names on auth/create inputs.
- [x] `aria-label` on icon-only controls, tabs, progress and live regions where present.
- [x] Keyboard-operable play/dossier tabs (covered by Playwright).
- [x] `prefers-reduced-motion` disables animation and transition durations.
- [x] `color-scheme: dark` and matching theme colour.
- [x] 44px key touch targets, safe-area padding, no horizontal overflow.
- [x] Formal axe WCAG 2.0/2.1/2.2 A+AA gate in Playwright.
- [x] Structural responsive and transfer-budget gates.
- [ ] Lighthouse CI performance budget.
- [ ] Full screen-reader, 200% zoom and Android WebView smoke audit.
- [ ] Pixel visual-regression baselines for every route.

## Constraints preserved

- No gameplay, save-schema, API or database changes.
- Save schema remains **14**; production migrations remain **13**.
- Six worlds and deterministic `game-core` untouched.
- Portal files and the 74 untracked Stage 11 reports / blueprint `.docx` remain out of design commits.
- Design work is live in production on `42a572c`; this QA follow-up needs its own deploy approval.
