# Endemion Life — Website Design Improvement Plan

**Status:** proposal only. No UI implementation in this document.
**Scope:** `apps/web`, `packages/ui`, design tokens, page composition, motion, accessibility, responsive behavior and visual assets.
**Constraint:** preserve all existing gameplay, server authority, six worlds, RU/EN and current test coverage.

---

## 1. Executive direction

The current site is competent and atmospheric, but it reads as a **dark-gold fantasy template**:
Cormorant Garamond headings, Manrope UI, near-black background, gold gradient titles,
rounded panels with the same border and shadow, and an ornamental divider on almost every page.
The six worlds differ mainly by an accent colour. The interface does not yet express the
actual product: a **living dynastic chronicle** where one life is a folio in a longer family archive.

The redesign should move from "fantasy game landing page" to:

> **The Living Chronicle** — an atlas of six worlds, a folio for every life, and a spine of years
> that makes inheritance and consequence visible.

This is not a reskin. It changes hierarchy, composition and the primary visual artifact while
keeping the existing screens and data.

### One memorable element

The **Chronicle Spine**: a persistent year rail that runs through the play screen and the dynasty
archive. Birth, choices, consequences, death and succession are notches on the same vertical line.
On desktop it is the right column; on mobile it becomes a horizontal year rail above the current event.
It is navigation, history and identity in one component. Everything else stays quiet.

### What to preserve

- Dark, nocturnal atmosphere and restrained gold as the "ink and brass" base.
- Strong serif display voice; the problem is repetition, not serif type itself.
- World emblems and per-world accent colours.
- Dense, information-rich play screen; do not turn it into a mobile card feed.
- RU/EN parity, safe-area handling and reduced-motion support.
- Existing evidence-based mechanics and server-authoritative actions.

### What to stop doing

- Gold gradient on every page title.
- Ornamental divider under every header.
- Identical rounded cards with identical soft shadows for every content type.
- Uppercase tracked eyebrow labels above every section.
- Ambient glow blobs and repeated `animate-rise` on hero elements.
- Six worlds distinguished only by `theme.accent`.
- A second, parallel "marketing site" voice next to the game voice.

---

## 2. Current-state audit

| Area | Current evidence | Design problem | Severity |
|---|---|---|---|
| Visual identity | `globals.css`: ink/gold/bone/blood/jade, Cormorant + Manrope | Distinctive only as genre mood; easily confused with other dark fantasy sites | High |
| Card system | `packages/ui/src/panel.tsx`: one `rounded-xl` gradient panel + shadow for all content | No hierarchy between narrative, data, form and danger | High |
| Home | `app/page.tsx`: hero + demo + lives + six cards + screenshot + three pillars | Too many sections with equal weight; the product proof arrives after decoration | High |
| Worlds | `app/worlds/page.tsx`: shared dashboard, compact list, then six detailed cards | Duplicate representations; comparison is buried; worlds feel like data records | High |
| Play | `play-screen.tsx`: 300 / 1fr / 340 grid, four tabs, dossier repeated for mobile | Dense but flat; event, history and self compete; mobile reads as a form | High |
| Type scale | Display 4xl–7xl, body 14–16px, many 10–11px labels | Small labels and wide tracking reduce legibility; few intermediate sizes | Medium |
| Colour | `bone-500` on `ink-950`, gold-on-gold gradients | Contrast risk in secondary text; gold stops signalling importance | Medium |
| Motion | `animate-rise` on hero children, glow, hover lift | Generic entrance choreography; no motion tied to a year or a choice | Medium |
| Social | `app/social/page.tsx`: three stacked panels, centred heading | Utility forms have the same ceremonial weight as the game | Medium |
| Accessibility | focus-visible and reduced-motion exist; no skip link; many 10px labels | Keyboard path and small text are incomplete | High |
| Performance | ~472 KB compressed initial JS/CSS; largest chunk ~707 KB raw | Full engine and dictionaries reach the client; illustration work must not add more | Medium |
| Assets | One ending screenshot; SVG emblems | No world atmosphere, no lineage artifact, no visual reward | Medium |

### What is already good

- The palette is coherent and not garish.
- World emblems and `--world-accent` are a useful seed for a real world system.
- The play screen already prioritises the event and exposes the chronicle.
- Touch targets were raised to 44px in key paths and safe areas are handled.
- `Panel`, `Button`, `Meter`, `Tag` exist as shared primitives; this is enough to evolve,
  not replace, the design system.

---

## 3. Design concept: The Living Chronicle

### 3.1 Principles

1. **A life is the hero.** The first screen should show a real or sample life folio, not an abstract promise.
2. **The archive is the navigation.** Years, generations and world ages are the same timeline.
3. **Six worlds, one binding.** Shared chrome, typography and interaction; each world changes material,
   palette, emblem and density, not the whole layout.
4. **One bold gesture.** The Chronicle Spine carries the identity. Remove ambient decoration elsewhere.
5. **Data is engraved, not decorated.** Meters, chances and wealth use ticks, rules and labels,
   not gradients and glow.
6. **Consequence is visible.** Every choice should show what changed and where it will be remembered.
7. **Readable first.** 16px minimum body, 12px minimum metadata, AA contrast, 68ch maximum reading width.

### 3.2 Page character

- Home: an opening folio, not a feature landing page.
- Worlds: an atlas of six plates.
- Create: a birth rite in three deliberate steps.
- Play: a desk with the current year in the centre and the chronicle at the edge.
- Dynasty: a family archive room.
- Social: a guild ledger and directory, quieter than play.
- Account: a private register, not a marketing page.

---

## 4. Visual system

### 4.1 Base palette

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#08090B` | page ground |
| `ink-900` | `#101217` | primary surface |
| `ink-800` | `#171A20` | raised surface |
| `line` | `#292C34` | hairline borders |
| `bone-100` | `#E9E2D4` | primary text |
| `bone-300` | `#C2BAAB` | secondary text |
| `bone-500` | `#928B7E` | metadata only, never body |
| `brass` | `#B9924F` | shared accent, focus, primary action |
| `blood` | `#B24B37` | danger, death, irreversible |
| `jade` | `#6FA98A` | success, recovery, growth |

Remove the wide radial glows from `body`. Keep a single static grain layer at 2–3% and only on
large surfaces, or remove it entirely on mobile.

### 4.2 World materials

Each world gets four tokens, not one accent:

| World | Ground | Accent | Secondary | Material cue |
|---|---|---|---|---|
| Ashen Kingdoms | `#0B0A09` | `#C2543A` ember | `#7E3B2E` rust | soot, forged iron, torn edge |
| Ardenvale | `#08110F` | `#58A58A` system jade | `#9BC7D9` glass | clean grid, glass, measured light |
| Nine Rivers | `#0A0F14` | `#6F93AC` river steel | `#B08A5A` seal | ink wash, brushed rule, hanging seal |
| Heavenly Verge | `#0C0D12` | `#7C8FB8` lapis | `#C8A96B` cloud gold | silk, thin line, vertical rhythm |
| Neo-Seoul | `#0C0C0D` | `#D08A3E` sodium | `#8B79B6` gate violet | concrete, hazard mark, scan line |
| Lireval Empire | `#100B0C` | `#9B4552` oxblood | `#C6A76A` brass | lacquer, engraved rule, salon symmetry |

Rules:

- Accent is used for one primary action and one state, not for headings, borders and icons at once.
- World ground may tint the page by 2–4%, never replace the shared base.
- A world page may change one structural motif (for example, Nine Rivers uses a vertical seal rail;
  Neo-Seoul uses a compact data strip), but not the navigation model.

### 4.3 Typography

Proposed pairing, subject to Cyrillic coverage verification:

- **Display / narrative:** Alegreya (humanist serif, calligraphic roots, strong at 24–64px).
  Fallback: Lora. If neither covers all RU glyphs, keep Cormorant for display and change the UI face.
- **Interface / body:** Golos Text (Cyrillic-first grotesque, clear at 12–16px).
  Fallback: Manrope.

Do not add a third family. Numbers may use tabular figures from Golos Text rather than a monospace face.

Scale:

| Role | Size / line-height | Weight |
|---|---|---|
| Hero | 56–72 / 1.02 | 600 |
| Page title | 36–48 / 1.08 | 600 |
| Section title | 24–32 / 1.15 | 600 |
| Event title | 24–30 / 1.2 | 600 |
| Body | 16 / 1.65 | 400 |
| UI | 14 / 1.45 | 500 |
| Metadata | 12 / 1.4 | 500 |
| Micro label | 11 / 1.3 | 600, sentence case |

Rules:

- Sentence case for labels. Uppercase only for short world names or sealed marks.
- No letter-spacing above `0.12em`; current `0.35em` eyebrows are costume.
- Maximum reading width 68ch; event text 58–64ch.
- One gradient text treatment per page maximum; ideally none. Use solid bone for headings and
  brass for one emphasized word only when it carries meaning.

### 4.4 Layout and surface

- 12-column grid, max width 1280px, 24px gutters, 8px spacing base.
- Section rhythm: 64px mobile, 96px desktop. No section gets a card merely to separate it.
- Radius: `2px` for narrative folios, `8px` for controls, `999px` only for status pills.
- Elevation: 1px border + surface shift. No soft black drop shadows. A single inset top highlight
  is allowed on raised surfaces.
- Dividers: use real rules between data rows; ornamental dividers only at the close of a page.
- Background: one shared ground; world tint applied via a top band or side rail, not full-page wash.

### 4.5 Iconography and illustration

- One custom line-icon set, 1.5px stroke, 20/24px grid: age, health, wealth, skill, relationship,
  travel, guild, legacy.
- World emblems stay, but redraw on a consistent 48px grid with a single stroke weight.
- Add one atmospheric illustration per world, used as a wide 21:9 plate on the world page and a
  small crop in the atlas. Style: engraved line + flat mineral colour, not painterly AI fantasy.
- Generate guild heraldry procedurally from the guild name and world palette (shield geometry,
  initials, two charges). This gives identity without bespoke art per guild.
- No emoji as UI icons.

### 4.6 Motion

- One page-load reveal: title and folio rise 6px over 240ms, then stop.
- Year advancement: the Chronicle Spine adds one notch; the current folio crossfades in 180ms.
- Choice confirmation: the selected row seals with a 160ms border/background change; outcome text
  appears with a 120ms fade. No confetti, no shake, no continuous glow.
- Hover: 1px border shift and 80ms colour change. No card lift.
- Respect `prefers-reduced-motion`; all essential state changes must remain visible without motion.

---

## 5. Information architecture and navigation

### 5.1 Header

Current header is a thin utility bar with a small logo, two links, account, store badge and language.
Target:

- Height 64px desktop / 56px mobile.
- Wordmark left, primary links centre (`Worlds`, `Play`, `Chronicle` when signed in), account right.
- One visible primary action: `Begin a life` or `Continue`.
- Language switch becomes a compact `RU / EN` segmented control with 44px targets.
- Remove the external `Endemion` link from the primary nav; move it to the footer or account menu.
- Add a skip link before the header.

### 5.2 Global routes

Keep the existing routes. Add no new top-level section until the content justifies it.

- `/` — opening folio.
- `/worlds` — atlas.
- `/create/[universe]` — birth rite.
- `/play/[id]` — life desk.
- `/account` — private register.
- `/social` — guild and player ledger.
- `/insights` — keep as an operator page, visually separated from player navigation.

### 5.3 Mobile navigation

- Global: header plus a single menu sheet; no permanent bottom bar outside play.
- Play: four-item bottom bar (`Year`, `Event`, `Self`, `Chronicle`), safe-area aware.
- Current duplicate Dossier branch must stay removed; one component instance per breakpoint.

---

## 6. Page-by-page redesign

### 6.1 Home `/`

Current: hero > demo > recent lives > world cards > ending screenshot > three pillars.
Target: four movements, each with one job.

```text
┌──────────────────────────────────────────────────────────────┐
│ header                                                       │
├───────────────────────────────┬──────────────────────────────┤
│ "Every life leaves a line."   │  FOLIO 07                   │
│ short lead                    │  Mira, 34                   │
│ [Begin a life] [See worlds]   │  Ashen Kingdoms             │
│                               │  last choice / heir / years │
│                               │  [Continue]                 │
├───────────────────────────────┴──────────────────────────────┤
│ THE YEAR RAIL — one interactive year, choice + consequence   │
├──────────────────────────────────────────────────────────────┤
│ ATLAS — six wide world plates, one mechanic each             │
├──────────────────────────────────────────────────────────────┤
│ DYNASTY STRIP — recent lives as branches, not cards          │
├──────────────────────────────────────────────────────────────┤
│ closing CTA                                                  │
└──────────────────────────────────────────────────────────────┘
```

Implementation:

- Replace the centred hero with a 7/5 split. The right side is a real folio component, reusing
  `LifeView` summary data when available; otherwise a clearly labelled sample.
- Reuse `YearDemo`, but make it the only interactive proof above the atlas and show the consequence
  immediately, not after a link.
- Replace `WorldCard` grid with `WorldPlate`: full-width horizontal plate, 21:9, emblem left,
  name/tagline centre, one mechanic and lifespan right. On mobile it becomes a 4:3 plate.
- Replace `LivesList` cards with a single dynasty strip: horizontal lineage branches with age at death
  and generation.
- Remove the separate ending screenshot and three pillars. Their content moves into the atlas or
  the closing statement.
- Keep one ornament, at the closing CTA only.

Acceptance:

- Product proof is visible without scrolling at 1440×900 and 390×844.
- One primary CTA per viewport.
- No horizontal overflow at 320/360/390/414.
- First meaningful paint does not wait for client-side life data.

### 6.2 Worlds `/worlds`

Current: shared-world dashboard, compact list, six duplicate detailed cards.
Target: atlas first, living world second.

- Header: `Choose a world` + one sentence, no ornament.
- Six `WorldPlate`s in a 2-column desktop grid; each exposes three scannable facts:
  lifespan, central mechanic, inheritance law.
- A `Compare` control opens a real table: world, tone, mechanic, law, difficulty, lifespan.
- `SharedWorldPanel` moves below the atlas behind a tab labelled `Living world`, not above the choice.
- World detail is an expandable plate, not a duplicate card plus list. Keep `details` for progressive
  disclosure, but style summary as a row action.
- `BornNow` becomes the single primary action inside each plate; `create` link becomes secondary.

Acceptance:

- A new player can name the six worlds and one difference between them after 20 seconds.
- No duplicated representation of the same world on one screen.
- World accent is visible without relying on colour alone (emblem + material motif + label).

### 6.3 Create `/create/[universe]`

Current: one long form with fieldsets and two birth buttons.
Target: three-step birth rite with a persistent folio preview.

1. **Origin** — world summary, difficulty, inheritance law, one sample life.
2. **Identity** — name, gender, race, origin, temperament; preview updates live.
3. **Fate** — upbringing package and point-buy; show final stats and one sentence of likely life.

- Left column: step content. Right column: sticky folio preview with name, world, stats, starting
  traits and `Begin life`.
- Progress indicator is a three-notch rule, not numbered circles.
- Validation appears inline; the primary button states what happens (`Begin life`, not `Submit`).
- Keep the existing form schema and server actions; this is composition only.

Acceptance:

- A first-time player can complete creation without opening a help panel.
- All controls remain 44px; no horizontal scroll at 320px.
- Preview does not require a network round trip per keystroke.

### 6.4 Play `/play/[id]`

Current: 300 / 1fr / 340 desktop grid, four tabs, mobile dossier duplicate, dense card stack.
Target: a life desk with one obvious centre.

```text
┌──────────────────────────────────────────────────────────────┐
│ Mira · 34 · Ashen Kingdoms        wealth 240   [save] [menu] │
├───────────────┬──────────────────────────────┬───────────────┤
│ SELF          │ CURRENT YEAR                 │ CHRONICLE     │
│ portrait/sigil│ 34                           │ 0 birth       │
│ health        │ event title                  │ 12 oath       │
│ wealth        │ event text                   │ 18 consequence│
│ skills        │ [choice A  72%]              │ 30 death      │
│ household     │ [choice B  locked]           │ 31 succession │
│ collapsible   │ outcome / next year          │ filter        │
├───────────────┴──────────────────────────────┴───────────────┤
│ mobile: Year | Event | Self | Chronicle                      │
└──────────────────────────────────────────────────────────────┘
```

- Header strip: name, age, world, wealth, save/menu. No large decorative title.
- Left column: one `CharacterFolio` with collapsible sections; no nested `Panel` inside `Panel`.
- Centre: `EventStage` — year marker, event title, prose, choices, chance and requirements.
  Choices are full-width rows, not small buttons. Locked choices explain the requirement.
- Right: `ChronicleSpine` — sticky, compact, grouped by year; selecting a notch opens a detail drawer
  rather than reflowing the page. Load earlier stays at the bottom.
- Remove the tab-based desktop switching. Tabs remain mobile-only.
- Mobile: default `Event`; the year rail sits above the event; Dossier opens as a full-height sheet;
  no duplicate Dossier instance.
- Outcome: show a `What changed` block with at most five changed values, then the next action.
- Death: transition to `LifeSummary` as a folio closing, with heirs and dynasty consequences visible
  before the primary button.

Files: `play-screen.tsx`, `character-sheet.tsx`, `event-card.tsx`, `timeline.tsx`, `dossier.tsx`,
`now-panel.tsx`, `life-summary.tsx`.

Acceptance:

- At 1440px, the event and choices are visible without scrolling after load.
- At 390px, the primary action is reachable with one thumb and no horizontal overflow.
- Every choice displays chance/requirement/cost in text, not colour alone.
- Keyboard focus order follows header → event → choices → chronicle.

### 6.5 Dynasty and legacy

Current: family tree, person cards, chronicle, inheritance details inside a large dossier.
Target: an archive room with two layers.

- Layer 1: `DynastyTree` — generations as rows, living/dead as solid/outline, player line highlighted.
- Layer 2: `ChronicleSpine` filtered by generation; selecting a person filters the spine.
- Inheritance is a comparison sheet: current estate, shares, home kept/sold, relics, heir control age.
- Heir choice uses a `seal` interaction: select a candidate, see consequences, confirm with the heir’s name.
- Move long lists into drawers; keep the tree and the selected person visible together.

Acceptance:

- Five generations are legible without horizontal scrolling at 1024px.
- Heir consequences are readable before confirmation.
- Relics and property appear as inherited objects, not generic tags.

### 6.6 Social, guilds and living world

- `/social`: replace three ceremonial panels with a compact `Great Hall`:
  - top: guild directory and player search side by side;
  - guild detail: heraldry, roster, projects, audit, requests;
  - social ties: a quiet list below, not the first thing on the page.
- Guild heraldry is procedural and unique; roles use text labels plus one icon, not colour alone.
- `SharedWorldPanel`: treat as a world ledger: season header, settlement rows with prosperity/stability,
  faction balance, event feed. No six equal cards inside a card.
- Live windows become a dated ledger with status stamps; keep the existing claim rules visible.

Files: `social/page.tsx`, `guild-panel.tsx`, `social-panel.tsx`, `live-board.tsx`,
`shared-world-panel.tsx`, `world-participation.tsx`.

### 6.7 Account and insights

- Account: one column, 720px max; sections `Identity`, `Sessions`, `Security`, `Danger zone`.
  No hero ornament. Destructive actions use a distinct blood outline and a typed confirmation.
- Insights: operator-only, visually separate; no player navigation entry.
- Error/loading/empty states: use the same folio language, one sentence and one action.

---

## 7. Component plan

| Component | Change | Effort |
|---|---|---|
| `Panel` | Variants `plain`, `raised`, `inset`, `danger`; remove universal gradient/shadow; new radius scale | M |
| `Button` | Primary/secondary/quiet/danger; consistent 44px; loading state; icon slot | S |
| `Meter` | Engraved tick scale with visible threshold labels; accessible `role="meter"` | M |
| `Tag` | Semantic tones and optional world sigil; no decorative tags | S |
| `Ornament` | One per page maximum; optional alternative `Rule` component | S |
| `WorldEmblem` | Consistent 48px grid, currentColor, world-specific secondary mark | M |
| `WorldPlate` | New atlas component replacing `WorldCard` on home/worlds | L |
| `LifeFolio` | Reusable folio summary: name, age, world, last choice, heir count | M |
| `ChronicleSpine` | New timeline primitive shared by play and dynasty | L |
| `EventStage` | Choice rows, chance/requirement, outcome block | L |
| `CharacterFolio` | Collapsible self panel replacing nested card stack | M |
| `GuildHeraldry` | Procedural SVG from name + world | M |
| `EmptyState` / `ErrorState` | Shared copy and action pattern | S |
| `Sheet` | Mobile full-height dossier/choice sheet with focus trap | M |

All components remain in `packages/ui` only if they are generic; game-specific components stay in
`apps/web/src/components`.

---

## 8. Responsive and touch

- Breakpoints: 360, 768, 1024, 1280, 1536.
- Test 320, 360, 390, 414, 768, 1024, 1440, 1920.
- No fixed 3-column play grid below 1024.
- 44×44px minimum for every interactive target; 12px minimum gap between adjacent targets.
- Use `dvh`, safe-area insets and `overflow-x: clip`; no horizontal overflow at any breakpoint.
- Forms: one column below 640; inline validation; keyboard type set per field.
- Sticky elements: header only; chronicle uses `position: sticky` within its column, not fixed.
- Hover states must not be required to discover an action.

---

## 9. Accessibility

Target: WCAG 2.2 AA.

- Contrast: body text ≥ 4.5:1; large text ≥ 3:1; focus indicator ≥ 3:1 against both surfaces.
- Replace `bone-500` body usage; reserve it for non-essential metadata.
- Add skip link, `main` landmark, one `h1` per page, logical heading order.
- All meters have text values and `role="meter"` with `aria-valuemin/max/now`.
- Choices expose disabled reason in text, not only `opacity`.
- Dialogs/sheets trap focus, restore focus, close on Escape; `details` summaries remain keyboard operable.
- Error summary at the top of forms; link errors to fields with `aria-describedby`.
- No colour-only world, role or danger encoding.
- Test with keyboard only, 200% zoom, screen reader and reduced motion.

---

## 10. Performance and asset budget

Current baseline: ~472 KB compressed initial JS/CSS; largest raw chunk ~707 KB.

Targets:

| Metric | Target |
|---|---|
| Home initial compressed JS/CSS | ≤ 300 KB |
| Play route initial compressed JS | ≤ 350 KB after code splitting |
| LCP (mobile, production) | ≤ 2.5 s |
| CLS | ≤ 0.05 |
| INP | ≤ 200 ms |
| Fonts | 2 families, ≤ 4 files, subset RU/EN, `swap` |
| World plate image | ≤ 120 KB AVIF/WebP per plate, responsive `srcset` |
| Visual regression | Home, worlds, create, play, dynasty, social at 390/768/1440 |

Actions:

- Keep catalogs/server data in server components; do not import full `game-core` into client bundles.
- Dynamically import `Dossier`, `Lineage`, `AccountPanel` and heavy social panels.
- Remove unused icon/animation code; keep one motion utility.
- Preload only the display font actually used above the fold; lazy-load secondary weights.
- Use `next/image` with explicit sizes for world plates and ending art.
- Add Lighthouse CI budgets before visual polish lands.

---

## 11. Copy and localisation

- Write in the game’s voice: short, concrete, no marketing superlatives.
- One action name per flow; the confirmation repeats it.
- Empty states invite the next action; errors state what happened and how to recover.
- Avoid the current pattern of a tracked uppercase eyebrow plus a large title plus a lead plus a second lead.
- Russian and English must have equal information density; no truncated Russian in controls.
- Keep world names and proper nouns consistent with `messages.ts` and the catalog.
- Remove duplicate explanatory paragraphs on home; one lead, one proof.

---

## 12. Implementation phases

No calendar estimates: effort is relative and depends on available design/engineering time.

### Phase 0 — Baseline and decisions (S)

- Capture screenshots of every route at 390/768/1440.
- Inventory all `Panel`, `Button`, `Meter`, `Tag`, `Ornament` usages.
- Confirm font licensing and Cyrillic coverage for Alegreya/Golos Text; fallback decision.
- Approve the Living Chronicle direction and the six world material table.
- Add visual regression baseline; do not change production yet.

### Phase 1 — Design-system foundation (M)

- Tokens: base palette, world materials, type scale, spacing, radius, elevation, motion.
- Rework `Panel`, `Button`, `Meter`, `Tag`, `Ornament`; add `Rule`, `EmptyState`, `Sheet`.
- Header/footer, skip link, focus styles, 44px audit.
- Acceptance: component gallery at all breakpoints; contrast and keyboard checks pass; no page redesign yet.

### Phase 2 — Home and worlds (L)

- `WorldPlate`, `LifeFolio`, new home composition, atlas, compare table, living-world tab.
- Acceptance: product proof above the fold; six worlds distinguishable without colour; overflow 0; LCP target.

### Phase 3 — Creation (M)

- Three-step rite, sticky folio preview, inline validation, mobile controls.
- Acceptance: first-time completion without help; RU/EN parity; no schema change.

### Phase 4 — Play desk (L)

- `EventStage`, `CharacterFolio`, `ChronicleSpine`, mobile sheets, death/succession transition.
- Acceptance: event and choices above the fold; keyboard order; no duplicate Dossier; mobile overflow 0.

### Phase 5 — Dynasty archive (L)

- Tree, generation-filtered spine, inheritance comparison, heir seal.
- Acceptance: five generations legible; consequences visible before confirmation; no data change.

### Phase 6 — Social, guilds, living world, account (M)

- Great Hall, procedural heraldry, world ledger, quiet account register.
- Acceptance: roles/projects readable; destructive actions distinct; no API change.

### Phase 7 — Art and motion polish (M)

- Six world plates, icon set, one page transition, year-notch motion, outcome transition.
- Acceptance: asset budget met; reduced-motion equivalents; no ambient animation loops.

### Phase 8 — Accessibility, performance, QA (M)

- Keyboard/screen-reader/zoom audit; contrast fixes; bundle splitting; Lighthouse CI; visual regression.
- Acceptance: WCAG 2.2 AA checklist; performance budgets; cross-browser and Android WebView smoke.

---

## 13. Measurement

Track before and after:

- Time to first meaningful action on home (`Begin a life` or `Continue`).
- Creation completion rate and field error rate.
- Play screen: choices per session, time to choose, scroll depth before first choice.
- Mobile: horizontal overflow count, tap-target failures, layout shift.
- Accessibility: axe violations, keyboard traps, contrast failures.
- Performance: LCP/CLS/INP, initial compressed JS/CSS, font bytes.
- Qualitative: five-second test ("what is this game?"), world recognition test (six worlds).

Success is not "it looks prettier". Success is: a new player understands the dynastic premise,
can name a world difference, begins a life faster, and can read the chronicle without fighting the UI.

---

## 14. Risks and non-goals

### Risks

- **Over-styling.** Six world materials can become noisy. Limit each world to one structural motif.
- **Font risk.** Cyrillic coverage and licensing must be verified before replacing fonts.
- **Performance regression.** Art and motion can erase the current fast load; enforce budgets in CI.
- **Test brittleness.** Markup changes will break Playwright selectors; migrate to role/test-id selectors
  in the same phase.
- **Scope creep.** This plan does not add gameplay, multiplayer features or new data models.
- **False depth.** A beautiful archive cannot compensate for thin content; keep sample folios honest.

### Non-goals

- No full rewrite of Next.js, the API or `game-core`.
- No new gameplay systems, economy, chat or trading.
- No 3D, WebGL, parallax or auto-playing audio.
- No cream-parchment fantasy cliché, glassmorphism or neon cyberpunk skin.
- No new dependency without an explicit decision and bundle-cost review.

---

## 15. First ten actions

1. Approve or reject the Living Chronicle direction.
2. Capture the current visual baseline at 390/768/1440.
3. Verify Alegreya/Golos Text Cyrillic coverage and licensing; decide fallback.
4. Add the new tokens alongside the current tokens, without switching the site yet.
5. Build a component gallery for the five core primitives.
6. Replace the home hero with the folio split in a branch.
7. Build `WorldPlate` and test it with all six worlds at all breakpoints.
8. Build `ChronicleSpine` against existing `HistoryEntry[]` data.
9. Redesign `EventStage` choices and outcome states.
10. Run the first accessibility and bundle-budget gate before art polish.

---

## 16. File map

Primary:

- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/worlds/page.tsx`
- `apps/web/src/app/create/[universe]/page.tsx`
- `apps/web/src/app/play/[id]/page.tsx`
- `apps/web/src/components/site-header.tsx`
- `apps/web/src/components/world-card.tsx`
- `apps/web/src/components/year-demo.tsx`
- `apps/web/src/components/play/play-screen.tsx`
- `apps/web/src/components/play/character-sheet.tsx`
- `apps/web/src/components/play/dossier.tsx`
- `apps/web/src/components/play/event-card.tsx`
- `apps/web/src/components/play/timeline.tsx`
- `apps/web/src/components/play/life-summary.tsx`
- `apps/web/src/components/social/guild-panel.tsx`
- `apps/web/src/components/world/shared-world-panel.tsx`
- `packages/ui/src/panel.tsx`
- `packages/ui/src/button.tsx`
- `packages/ui/src/meter.tsx`
- `packages/ui/src/tag.tsx`
- `packages/ui/src/ornament.tsx`
- `apps/web/src/lib/messages.ts`

This plan is deliberately implementation-ready but not implemented. The next step is approval of the
direction and Phase 0/1 only.
