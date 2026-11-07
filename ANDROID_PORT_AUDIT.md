# Endemion Life — Android port audit

Date: 2026-11-06. Audit only. No production deploy, no auth change, no Android project generated, no APK built.

Source inspected: clone of https://github.com/Yuta2Endo/Endemion-Life at `2812b01` (`main`). Live check: `GET https://life.endemion.online/api/health` returned `status: ok`, database up, redis up. `/opt/endemion-life` was not opened in this session; production facts below that are not in that health response are cited from `STAGE_01_5_FINAL_REPORT.md` (2026-11-03) and are marked as such.

## 1. Project overview

Endemion Life is a browser life simulator with RPG and story choices. The player is born in one of six worlds, ages year by year, and the server applies each choice.

Production site: https://life.endemion.online  
Stack (README): Next.js 16.4.4, React 19, TypeScript, Tailwind CSS 4.3.3, NestJS 12.3.2, PostgreSQL 18, Prisma 7, Redis 8, pnpm workspaces, Vitest, Playwright, Docker Compose, Nginx.

The web app is not a static site. `apps/web` is a Next.js App Router server (`next start`, Docker target `web` runs `apps/web/server.js`). The API is a separate NestJS process. Nginx sends `/api/*` to the API and everything else to Next.js. The browser only talks to its own origin so the session cookie stays first-party.

Game rules live in `packages/game-core` and do not touch the network or the database. The server is the source of truth (`docs/architecture.md`).

## 2. Documentation inventory

### Present

| Document | Role | Freshness |
| --- | --- | --- |
| `README.md` | Stack, local run, command table | Current for the repo layout |
| `docs/architecture.md` | Monorepo, saves, auth, worlds, economy, adventures | Body covers later stages; the title still says "Stage 01–06, Stage 07" |
| `docs/AUTHENTICATION.md` | Guest sessions, scrypt passwords, guest-life transfer | Accurate for the password path. Production login is Endemion ID (see below) |
| `docs/ENDEMION_ID.md` | OIDC via `auth.endemion.online` | Current and required for Android |
| `docs/DEPLOYMENT.md`, `HTTPS_SETUP.md`, `DATABASE_BACKUPS.md`, `ROLLBACK.md`, `PRODUCTION_CHECKLIST.md`, `MONITORING.md`, `GIT_WORKFLOW.md`, `GITHUB_ACTIONS_DEPLOYMENT.md`, `LOAD_TEST_REPORT.md` | Ops | Not re-verified on the server in this session |
| `STAGE_01_REPORT.md` through `STAGE_24_REPORT.md`, plus audits, plans, and status files | Delivery history | Stage 24 (2026-11-06): game-loop polish done, not declared release-ready, not deployed in that stage |
| `STAGE_01_5_FINAL_REPORT.md` | Production verification | Server snapshot from 2026-11-03. Do not treat every row as still true without a new SSH check |
| `UPDATE_PLAN.md`, `RELEASE_READINESS_CHECKLIST.md`, `RELEASE_CANDIDATE_VALIDATION.md` | Release notes | Checklist is short; not an Android plan |

### Missing

| Expected | Result |
| --- | --- |
| `V03_STATUS.md` | **Missing.** There is no file with this name. Save format is an integer on the life, currently schema 8 (`docs/architecture.md`, Stage 10). "V03" in older notes means save format 3 (lineage), which is already migrated in `migrateV2`. |
| Android, Capacitor, or mobile-port docs | **Missing** before this audit |
| Dedicated QA manual | **Missing.** Mobile coverage is Playwright project `mobile` (`Pixel 7`) in `apps/web/playwright.config.ts` |
| PWA manifest / service worker | **Missing** |

### Decisions that bind the port

- Server applies `advance`, `choose`, `interact`, `trade`, `venture`, succession, and restore. The client sends an intention plus `actionId` and `expectedVersion`.
- Session is cookie `el_session`: HttpOnly, SameSite=Lax, Secure in production, 365 days. The database stores only SHA-256 of the token.
- Production sign-in is Endemion ID. `STAGE_01_5_FINAL_REPORT.md` records `POST /api/auth/login` → 410 `USE_ENDEMION_ID`. Redirect URI is `<PUBLIC_URL>/api/auth/oidc/callback`.
- Cloud lives are the real game. localStorage is a prototype. Imported lives are marked `origin = local-import` forever because past outcomes were computed on the device.
- Six worlds, lineage, economy, region, adventures, mastery, and player ties already exist. Do not re-implement them in Kotlin.

### Known debt (from repo docs and code, not a new test run)

- Stage 24: not signed off for release; production was not compared in that stage; browser was not opened by hand.
- Stage 01.5: SMTP empty, monitor alerts only to logs, Sentry/healthchecks not set, shared server and shared S3 key with the main Endemion site. Owner action, not an Android code change.
- Local mode still runs `applyAction` in the browser (`apps/web/src/lib/store/local.ts`). Rankings must not trust it.
- `architecture.md` title is stale.
- This machine cannot build Android yet (section 5).

## 3. Frontend

| Item | Finding |
| --- | --- |
| Framework | Next.js `16.4.4`, React from the pnpm catalog, `apps/web` |
| Build | `next build`. Docker sets `NEXT_OUTPUT_STANDALONE=1`. There is no `output: "export"`. |
| Entry | `apps/web/src/app/layout.tsx` (root, fonts, header, footer). Pages: `/`, `/worlds`, `/create/[universe]`, `/play/[id]`, `/account`, `/reset-password`, `/social`, `/insights`, `not-found`. |
| Routing | App Router. Client navigation uses `next/link` and `next/navigation` (`useRouter`, `usePathname`, `notFound`). |
| UI | Tailwind 4 via `@tailwindcss/turbopack`. Shared widgets in `packages/ui` (Button, Panel, Meter, Tag, Ornament). Visual system: ink background, gold accent, Cormorant Garamond + Manrope from `next/font/google` (self-hosted at build, not a runtime Google fetch). |
| Assets | `apps/web/public/` has `.gitkeep`, `shot-event.png` (44 KB), `shot-ending.png` (78 KB). No large media bundle in git. |
| API access | Browser calls same-origin `/api/*` with `credentials: "same-origin"` (`apps/web/src/lib/api.ts`). Next rewrites `/api/:path*` to `API_INTERNAL_URL` (`apps/web/next.config.ts`). In production Nginx owns `/api/*`. |
| Mobile already in the web UI | Play screen: phone tabs, sticky "now" bar, `100dvh`, scroll-margin for choices. Playwright has a Pixel 7 project. Stage 24 reports 27/27 mobile tests on that day. **Not re-run in this audit.** |
| Loading / errors | Play screen states `loading`, `missing`, `error`. Network failure keeps the action id and offers retry (`play.offlineKept`). Account and OIDC errors redirect to `/account?idError=`. |

Server Components and `next/font` mean the current build cannot be copied into a Capacitor `webDir` without a new client build.

## 4. Backend

| Item | Finding |
| --- | --- |
| Framework | NestJS 12 on Express (`apps/api`). Global prefix `api`. |
| Modules | Session, auth, Endemion ID, lives, catalog, social, live windows, insights, health, mail, Prisma, Redis rate limit. |
| Auth | Cookie session. Password login still in the code, disabled in production when `ENDEMION_ID=true` (410). OIDC Authorization Code + PKCE S256. Short cookie `el_oidc` on path `/api/auth/oidc/callback` only. |
| Database | PostgreSQL via Prisma 7. Tables include `players`, `sessions`, `accounts`, `lives`, `life_snapshots`, `history_entries`, `game_actions`, `ties`, `oidc_logins`. |
| Player data | Lives belong to `Player`, not to the device. `players.endemion_sub` ties the player to Endemion ID. |
| Persistence | `lives.state` JSON plus `version`. Last 50 snapshots. History rows. Actions unique on `(lifeId, actionId)`. |
| Realtime | **No WebSocket, SSE, or Socket.IO** in the web or API source. |
| Other | Helmet (HSTS off in the app; Nginx sends it), JSON body 16 KB, import route 2 MB, Redis rate limits, Sentry optional. |

## 5. Game systems (what actually exists)

| System | Where | Depends on |
| --- | --- | --- |
| Character creation | `packages/game-core` birth + `POST /api/lives` + `/create/[universe]` | Universe id, optional seed. Server seed salt on import. |
| Aging / events | `applyAction` `advance` / `choose` | Server RNG state inside the save. |
| RPG | Stats, skills, talents, track, checks in `game-core` | Same save document. |
| Six worlds | `universes/` | Content in the package, not a CMS. |
| Story | Event DSL, delayed consequences | Save flags. |
| People | NPC graph inside the save. `interact` once per pair per year. | Server. |
| Inventory-like | No generic backpack. Market goods (`economy.goods`, qty) and region warehouse. | `trade` action. |
| Quests | Ardenvale system quests plus per-world adventures (`state.adventure`) | `venture` action. Not a separate quest service. |
| Lineage | `POST /api/lives/:id/succession` | Ended life, heir id, new life row. |
| Saves | Server snapshots and restore. Local prototype in localStorage. | Account/session for cloud. |
| Accounts | Endemion ID in production; guest until login; guest lives move on sign-in. | Cookie + OIDC. |
| Social | `ties` table, `/api/social`, `/social` page. Not shared gameplay. | Signed-in player with a name. |
| Live windows | Stage 15, ops token, off unless `LIVE_OPS_TOKEN` is set. | Not required for the Android shell. |

## 6. Android compatibility

| Area | Risk in Android WebView |
| --- | --- |
| Cookies | `el_session` is Secure + SameSite=Lax + HttpOnly. It is stored for `https://life.endemion.online` only. A `https://localhost` or `capacitor://` origin will not send it. |
| OIDC | Login is a top-level redirect to `auth.endemion.online` and back to `/api/auth/oidc/callback`, which sets `el_session`. The callback must hit the **same cookie jar** as the game. Chrome Custom Tabs set the cookie in Chrome, not in the WebView. |
| CSRF | Mutating requests must be `application/json`. If `Origin` is present it must be in `CORS_ORIGINS` (`apps/api/src/common/request.guard.ts`). A bundled origin not on that list gets 403. Do not weaken this. |
| localStorage | Used for the prototype store, the play-guide flag, and locale is a **document cookie** `el_locale` (`messages.ts`), not only localStorage. WebView will keep these only for the site origin. |
| IndexedDB | Not used. |
| WebSocket | Not used. |
| File upload/download | No player file API. Import is JSON POST, 2 MB. |
| Keyboard / hover | Buttons work by click. Many styles are hover-colored; they still have a resting style. No keyboard-only control found. |
| Touch | Phone layout exists under 1024px. Bottom tab bar has no `safe-area-inset-bottom`. |
| Back | Client-side Next routes. Android back must go through `history.back()` or it will exit the activity. |
| Orientation | Portrait is the intended phone layout. Width ≥ 1024px switches to the three-column desktop play screen. |
| Fullscreen | Not requested by the site. A shell can draw edge-to-edge; the site does not. |
| External links | Footer and header open `https://endemion.online`, privacy, terms, community, and `mailto:`. Inside a WebView these replace the game unless the shell sends them to the system browser. |
| Deep links | No app links today. OIDC return is a normal HTTPS URL on the game host. |
| HTTPS | Production redirects HTTP to HTTPS and sends HSTS (Stage 01.5). The shell must keep certificate checks on. |
| Fonts | Built with `next/font`. The live site serves them. No extra font host is required at runtime. |
| Service worker / PWA | None. No install prompt, no offline cache. |

## 7. Capacitor feasibility

Capacitor fits as a **native shell around the existing site**. It does not fit as a drop-in packager for the current Next.js build.

| Question | Answer |
| --- | --- |
| Integrate without a frontend rewrite? | Yes, if the WebView loads `https://life.endemion.online`. No, if the Next.js app must be bundled: App Router server components, `next/font`, rewrites, and server locale have no static export. |
| Can this machine build Android today? | **No.** Node `v26.13.0` is installed (repo asks for Node ≥ 24). `corepack` is not on `PATH`. `java` is `1.8.0_511` only. `%LOCALAPPDATA%\Android\Sdk` is absent. `ANDROID_HOME` is unset. |
| Node | 24 or newer, matching README. Node 26 is already on this PC. |
| Java | Capacitor 7 Android builds need JDK 21. JDK 8 on this PC is not enough. Do not guess a newer Capacitor major until Stage 03 pins it. |
| Android SDK | Install current SDK Platform and build-tools (API 35 is the Capacitor 7 baseline). Pin `minSdk`, `targetSdk`, and Gradle in Stage 03 from the Capacitor version's release notes. |
| Existing scripts | `pnpm` scripts are web/api/test/docker only. No `cap` script. |
| Plugins expected | App (back button), SplashScreen, StatusBar, Browser only if a flow must leave the WebView, App plugin for `appUrlOpen`. No push, camera, or filesystem plugin is required by the game. |
| WebView limits | Cookie jar separate from Chrome. OAuth inside the WebView can be blocked by an IdP. `server.url` remote mode needs a cleartext exception **off** (HTTPS only). |
| Offline | Not feasible for the real game without a new client. Cloud lives need the API. The local prototype only runs if the Next.js JS has already loaded, and it is not the source of truth. A remote WebView shows a network error when the site is down; it does not fall through to localStorage. |

### Comparison

| | A. Capacitor + bundled UI | B. Capacitor loads the live site | C. PWA | D. Native rewrite |
| --- | --- | --- | --- | --- |
| Complexity | High. New static client or a forked renderer. Next server cannot be bundled. | Low for the shell. UX still happens in the website. | Lowest. No store binary. | Highest. New UI and a second rules client, or a thin native UI over the same API. |
| Performance | Good after a real client build. Current SSR HTML would be gone. | Same as Chrome for this text UI. Cold start depends on the network. | Same as the site. | Best ceiling, irrelevant for this text game. |
| Offline | Only if the untrusted local store is shipped on purpose. | None, beyond an native error screen. | Only with a service worker, which does not exist and still could not apply cloud turns. | Would invent a second save path. Do not. |
| Maintenance | Two frontends or a permanent export mode. | One frontend. Store release is for the shell; game updates ship with the website. | One frontend. No Play listing unless a TWA is added. | Two products. |
| Fits current auth and saves | Poor unless production CORS, cookie `Domain`, and the OIDC redirect URI are changed. That is a production auth change and is out of scope. | Strong, if OIDC finishes in the **same** WebView that stores `el_session`. | Strongest cookie story: it is the site. | Must call the same API. Easy to fork saves by mistake. |
| Long term | Justified only if Play policy or offline becomes a requirement. | Right shell while the game stays a website. | Right product if a store listing is not required. | Not justified. |

### Recommendation

**B. Capacitor Android application whose WebView loads `https://life.endemion.online`, with OIDC completed inside that same WebView.**

This is not chosen because it is the smallest patch. A bundled app would be a second origin. The session cookie, CSRF allow-list, and Endemion ID redirect URI are all bound to `https://life.endemion.online`. Moving them means editing production auth. The brief forbids that, and it would be the wrong trade: the server must stay the source of truth, and the phone must stay the same player.

Rules for the shell:

- HTTPS only. Certificate checks stay on.
- Do not set `androidScheme` as the game origin.
- Do not put the API on another host from the WebView.
- Do not open Endemion ID in a Custom Tab unless the whole UI also uses Chrome's cookie jar (TWA). A Custom Tab login will not sign in the WebView.
- If `auth.endemion.online` rejects the WebView user agent, or Play rejects a thin WebView, switch the shell to a Trusted Web Activity (Bubblewrap) on the same URL. That is still not a rewrite.
- Do not ship the localStorage rules engine as the Android game.

## 8. Mobile UX

The site already has a phone play layout (`apps/web/src/components/play/play-screen.tsx`): four tabs, sticky year bar, bottom nav `lg:hidden`, footer padding `pb-24` so the bar does not cover it. Identity (ink, gold, display serif) should stay.

Must change before calling the phone UI done:

| Issue | Where | Change |
| --- | --- | --- |
| Gesture / 3-button inset | Bottom nav `fixed inset-x-0 bottom-0` has no `padding-bottom: env(safe-area-inset-bottom)`. Viewport export does not set `viewportFit: "cover"`. | Add safe-area padding and `viewport-fit=cover` so the tab bar clears the system bar. |
| Small type | Many labels are `text-[11px]` or `text-[10px]` (header "Life", tabs, create form, meters). | Raise touch labels to at least 12px. Keep the display face. |
| Touch size | `packages/ui` Button `md` is `px-4 py-2 text-sm` (under 44px tall). Language switch is `px-2 py-1`. | Min height 44px on phone for primary actions, choices, and year buttons. |
| Header crowding | Worlds, account, language, store badge share one row (`site-header.tsx`). | Allow wrap or a compact menu under 380px. Do not remove Worlds or Account. |
| Desktop layout on tablets | `lg:` (1024px) shows three columns. | Check a 10" landscape tablet. If columns crush, keep the phone tabs up to a higher breakpoint. |
| Hover-only feedback | Gold borders often strengthen on `hover:`. | Resting focus/pressed styles already exist on some controls. Check choice cards on a device. |
| External pages | Header/footer leave the origin. | In the shell, open `endemion.online` and `mailto:` outside the game WebView. |
| Loading | Play route is a client fetch after HTML. | Keep the existing loading line. The shell needs its own timeout/error when the host does not load. |
| Dialogs | Saves use `<dialog>` and `100dvh`. | Confirm the restore dialog clears the bottom nav and the IME. |
| Back | No in-app back handler. | Shell: back consumes history, then asks before exit on `/`. |
| Orientation | No lock. | Do not force portrait in the site. Optional portrait lock is a product choice in Stage 04. |

Do not redesign worlds, the character sheet, or the color system.

## 9. Saves and accounts

Cloud (the mode Android must use):

1. `POST /api/session` or OIDC callback sets `el_session`.
2. `POST /api/lives` creates a row: `player_id`, `state`, `version`, `schema_version`, seed.
3. `POST /api/lives/:id/actions` with `{ actionId, expectedVersion, action }` runs in a transaction, `SELECT … FOR UPDATE`.
4. Replay of the same `actionId` returns the stored result. Wrong version returns `409 VERSION_CONFLICT`.
5. Snapshots: last 50. Restore bumps version and drops the future branch.
6. Guest who signs in keeps those lives (guest row becomes the account player, or lives move onto the existing Endemion ID player). Documented in `docs/AUTHENTICATION.md` and `docs/ENDEMION_ID.md`.

Local (must not become a second Android save):

- Keys `endemion-life:v1:*` in localStorage. Ids start with the local prefix.
- Same `game-core` rules, but the device rolls the RNG.
- `POST /api/lives/import` can upload one life. Server replaces seed/RNG, may clamp illegal values, sets `origin = local-import`.
- After a successful import the local record is frozen (`MOVED`).

Multi-device: two phones with the same Endemion ID share the player and therefore the lives. Conflicts are version checks, not merges. Last write wins only after a reload; a stale client is told to reload.

Offline turns: not supported for cloud lives. A failed request keeps `actionId` so a retry does not double-apply. Do not queue turns on the device and apply them locally.

Backups: server `pg_dump` (Stage 01.5). The app does not need its own backup.

Migration: none, if the app is the same origin and the same cookie. No schema change. No Android-only table.

Data-loss cases to test in Stage 05:

- WebView cookie wiped by the OS → user looks logged out; lives remain on the server after Endemion ID login.
- User plays as guest on the phone, then logs into an older account → guest lives transfer once. Test this; do not "fix" it in the client.
- User plays in local mode because `/api/health` failed → those lives are not the cloud lives until import. The remote shell should not enter this mode if the site failed to load.

## 10. Security

| ID | Severity | Finding |
| --- | --- | --- |
| S1 | HIGH | OIDC in a different browser than the game WebView drops `el_session` in the wrong jar. The app looks logged out. Fix by keeping the flow in one jar. Do not copy the cookie into JavaScript. |
| S2 | HIGH | A bundled `capacitor://` or `https://localhost` origin cannot use the production cookie or OIDC redirect. "Fixing" that by adding origins or turning off `COOKIE_SECURE` is a production auth change. Do not do it in the port. |
| S3 | HIGH | Disabling WebView certificate checks to debug the proxy would expose the session. Forbidden. |
| S4 | MEDIUM | Remote WebView runs whatever the site serves. A compromised `life.endemion.online` becomes the app. Same as the browser. Pinning is optional later; do not pin in a way that breaks Let's Encrypt renewal. |
| S5 | MEDIUM | JavaScript bridge. Default Capacitor bridge is not needed for play. Do not expose tokens, `ENDEMION_ID_CLIENT_SECRET`, or `ENDEMION_ID_TOKEN_KEY` to the app. Those stay on the server. |
| S6 | MEDIUM | `allowNavigation` / intent URLs. Restrict navigation to `life.endemion.online` and `auth.endemion.online`. Send other hosts to the system browser. |
| S7 | LOW | Deep link / App Link on the callback can be claimed by a second app if asset links are wrong. If App Links are added, assetlinks.json must name only this package. |
| S8 | LOW | Debug WebView and `server.url` pointing at a dev machine must be build-type flags, not the release manifest. |
| S9 | INFO | Session token is not in JS (HttpOnly). Logs on the server already strip cookies (`apps/api/src/common/logger.ts`). |
| S10 | INFO | CSRF allow-list and JSON content-type are appropriate. SameSite=Lax fits same-site top-level OIDC returns. |
| S11 | INFO | Local save is explicitly untrusted. Shipping it as offline play would let the device invent outcomes. |
| S12 | INFO | This audit did not re-check SSH, firewall, or `.env` mode on the server. Stage 01.5 said those were sound on 2026-11-03. Absence of a new check is not a finding that they failed. |

No claim is made that the whole project is secure.

## 11. Performance

The client is a text UI. Git holds two screenshots under 80 KB each. There is no canvas game loop and no WebSocket chatter.

Expect:

- Cold start of a remote WebView waits on HTML from Next.js, then JS, then `GET` life + history.
- `game-core` is imported into the client (local store and view helpers). Bundle size was not measured in this audit (dependencies are not installed).
- Play screen re-renders a wide tree (sheet, dossier, timeline). Stage 24 already reduced some phone confusion. No new render audit was run.
- API rate limit is 120/min/IP in config, with a stricter auth limit. A phone on carrier NAT shares that budget with other users. Not a reason to raise it for Android.
- Server RAM was 2 GB shared with the main site (Stage 01.5). An Android client does not change that.
- WebView crash risk is low for this UI. The heavy case is a very long history page, already paged (`nextBefore`).

Optimization plan (Stage 07, not now): measure the production JS transfer on a phone, lazy-load dossier panels if the trace shows it, and keep images as they are. Do not rewrite rendering in this stage.

## 12. Technical risks

See `ANDROID_PORT_RISKS.md`. The ones that change the architecture are: cookie origin, OIDC jar, Play "webview only" policy, and this PC missing JDK 21 and the Android SDK.

## 13. Recommended architecture (short)

Capacitor shell, remote URL `https://life.endemion.online`, same API, same accounts, same `lives` rows. Native work is back button, splash, status bar, navigation allow-list, and a native failure page. Game UX changes stay in `apps/web` so the browser and the app match. No second save system.
