# Frontend Stabilization Report — STAGE 01

**Status:** COMPLETE  
**Scope:** desktop Dossier, mobile overflow, safe areas/touch targets, loading/error behavior, CSP integration confirmation.

---

## D1. Desktop Dossier duplication

### Problem
`apps/web/src/components/play/play-screen.tsx` uses a three-column desktop grid. The mobile Dossier block was rendered with `max-lg:hidden`, which means “hide below `lg`” — so at `lg` and above it became visible and joined the grid as a fourth child. Because the desktop Dossier is also rendered inside the event column, desktop could show a duplicate or misplaced Dossier, especially on the People tab.

### Root cause
Incorrect breakpoint utility:
```text
tab === "people" ? "block lg:hidden" : "max-lg:hidden"
```
`max-lg:hidden` is visible at `lg`, not hidden.

### Fix
`apps/web/src/components/play/play-screen.tsx`:
```text
tab === "people" ? "block lg:hidden" : "hidden"
```
The mobile Dossier now mounts only below `lg`. The desktop Dossier remains the single `hidden lg:block` copy.

### Verification
- Typecheck passed.
- Production build passed.
- Full Playwright suite passed at desktop Chrome and Pixel 7, including Dossier tab navigation.
- Manual check at 1280 and 1440 px: exactly one Dossier in the desktop grid; mobile Dossier absent at desktop widths.

---

## D2. Mobile homepage overflow

### Problem
At 390 px the homepage had `scrollWidth = 448` (58 px horizontal overflow). Decorative absolute-position glow elements with fixed 520 px/256 px sizes extended past the viewport, and the page did not clip horizontal overflow.

### Root cause
- Hero glow `absolute` element was larger than the viewport and not contained.
- `body` had no horizontal overflow containment.

### Fix
- `apps/web/src/app/page.tsx`: added `overflow-hidden` to the hero section; preserved the glow visually.
- `apps/web/src/app/layout.tsx`: `overflow-x-clip` on body.
- `apps/web/src/app/globals.css`: `overflow-x: clip` on body.
- Later diagnostic found a second, independent overflow at 320 px caused by the header (logo + Worlds + Account + language switch). Fixed by responsive header sizing:
  - `site-header.tsx`: logo `text-sm tracking-normal`, `sm:text-xl sm:tracking-[0.2em]`; nav `gap-0.5 sm:gap-5`; links `text-xs sm:text-sm`.
  - `account-link.tsx`: `text-xs sm:text-sm`.
  - `language-switch.tsx`: `text-[10px] sm:text-xs`, `px-1 sm:px-2`.
  - `store-badge.tsx`: hidden below 360 px.

### Verification
Diagnostic at 320, 390, 412 px on a real play screen:
```text
320: bodyScroll=320, docScroll=320
390: bodyScroll=390, docScroll=390
412: bodyScroll=412, docScroll=412
no elements with right edge > viewport
```
Homepage and worlds/create pages were also covered by Playwright at Pixel 7.

---

## D3. Safe areas and touch targets

- `layout.tsx` viewport: `width=device-width`, `initialScale=1`, `viewportFit="cover"`.
- `globals.css`: body left/right `env(safe-area-inset-*)`.
- `site-header.tsx`: top safe-area padding.
- Play mobile navigation: bottom safe-area padding.
- Header links/CTAs: `min-h-11` (44 px) where applicable; play tabs already 48 px.
- Store badge hidden on very narrow screens so it does not consume header width.

---

## D4. Loading, error, and timeout behavior

- Added `apps/web/src/app/loading.tsx` — localized loading surface.
- Added `apps/web/src/app/error.tsx` — client error boundary with retry; does not print raw errors.
- `apps/web/src/lib/api.ts`: all fetches now use `AbortSignal.timeout(15_000)` unless a caller supplies its own signal. Network failures map to `NETWORK`.
- Existing play-screen loading/error states retained. Cloud save list already had a loading/error path.

---

## D5. CSP and build

`apps/web/next.config.ts` now sends a CSP in production:
```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://endemion.online;
font-src 'self' data:;
connect-src 'self';
worker-src 'self' blob:;
manifest-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```
Dev additionally allows `unsafe-eval` and localhost websocket/HTTP for Next.js tooling.

Verified with `curl -I http://localhost:3000`: header present. The 62-test Playwright suite passed with CSP active, so authentication, API calls, fonts, and existing UI were not broken.

**Follow-up:** replace `'unsafe-inline'` with nonce/hash-based CSP when the styling/script architecture permits. Documented, not attempted in STAGE 01.

---

## Test evidence

| Check | Result |
|---|---|
| `pnpm typecheck` | PASS |
| `pnpm --filter @endemion/web build` | PASS |
| `pnpm test:e2e` | **62/62 passed** (desktop Chrome + Pixel 7) |
| Overflow diagnostic 320/390/412 | PASS |
| CSP header present | PASS |

**Residual risks:** no visual regression snapshots; Android WebView rendering verified only by build, not on a physical device/emulator; CSP still permits inline scripts.
