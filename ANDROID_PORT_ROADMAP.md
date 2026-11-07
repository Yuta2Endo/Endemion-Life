# Endemion Life — Android port roadmap

Date: 2026-11-06. Source: `ANDROID_PORT_AUDIT.md` at git `2812b01`.

Architecture: Capacitor Android shell that loads `https://life.endemion.online` in its own WebView. OIDC stays in that WebView. Game UI changes stay in `apps/web`. No second save system. No production auth change.

Order is adjusted from the brief. Mobile CSS can land on the website before the native project exists, because the site is already the Android UI. Native work waits until JDK 21 and the Android SDK are installed. Auth and saves are tested as soon as a debug shell can open the live site, before polish.

Do not start the next stage until the previous stage's acceptance criteria are met and the owner asks for it.

## STAGE 01 — Android port audit

**Status: complete** (this delivery). No APK. No Capacitor project.

- Objectives: read the repo and live health, judge Capacitor, document saves, auth, UX, security, and performance.
- Tasks: documentation inventory, architecture read, compatibility notes, four markdown deliverables.
- Dependencies: public repo and `GET /api/health`. Server SSH was not required.
- Expected files: `ANDROID_PORT_AUDIT.md`, `ANDROID_PORT_ROADMAP.md`, `ANDROID_PORT_RISKS.md`, `STAGE_01_ANDROID_PORT_AUDIT_REPORT.md`.
- Acceptance: architecture cited from source; recommendation chosen; production code untouched.
- Testing: none of the game suites were run. Live health was fetched once.
- Risks: audit can go stale if `main` or production auth changes. Re-read `docs/ENDEMION_ID.md` before Stage 03.

## STAGE 02 — Mobile UX adaptation

**Status: complete in the working tree** (2026-11-06). Not deployed. Not committed. Playwright was not run: the local Postgres volume rejected the example password, and that volume was not wiped. See `STAGE_02_MOBILE_QA_REPORT.md`.

Website only. The browser and the future shell both get the fix.

- Objectives: make the existing phone layout safe on gesture navigation and usable with a thumb, without a new visual identity.
- Tasks:
  - `viewport-fit=cover` and `padding-bottom: env(safe-area-inset-bottom)` on the play tab bar and the footer clearance.
  - Primary controls (year buttons, choices, tab bar, account buttons) at least 44px tall on narrow screens.
  - Labels that are `text-[10px]` / `text-[11px]` and are tappable raised to at least 12px.
  - Header wraps or collapses under ~380px so Worlds and Account stay reachable.
  - Confirm the saves `<dialog>` sits above the tab bar and the keyboard.
  - Check a width just under 1024px so the three-column play screen is not a crushed tablet.
- Dependencies: Stage 01. No Capacitor.
- Expected files: `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/components/play/play-screen.tsx`, `apps/web/src/components/site-header.tsx`, `packages/ui/src/button.tsx` only if the shared button size must change, plus a short note in a stage report. Playwright mobile specs if a layout assertion is added.
- Acceptance: Pixel 7 Playwright project still passes. No new game rule. Visual palette unchanged. Desktop layout at `lg` still shows three columns.
- Testing: `pnpm --filter @endemion/web test` and `pnpm --filter @endemion/web test:e2e -- --project=mobile`. Run desktop project too if shared CSS changed.
- Risks: a global button size change can break desktop density. Scope the min-height to a phone media query.

## STAGE 03 — Capacitor integration

**Status: debug shell generated and built** (2026-11-06). Not installed on a device. Not a release build. Not deployed.

- Capacitor `8.6.0`. App id `online.endemion.life` (owner has not confirmed the Play package name).
- `server.url` is `https://life.endemion.online`. `cleartext` is false. `allowNavigation` is only `life.endemion.online` and `auth.endemion.online`.
- Generated `android/` uses `minSdk` 24, `compileSdk` 36, `targetSdk` 36, Java 21, Gradle `8.14.3`.
- JDK used for the build: Temurin `21.0.13+9` at `D:\devtools\jdk-21.0.13+9` (not installed as the system Java; `java` on `PATH` is still 8).
- Android SDK used: `D:\devtools\android-sdk` (`platforms;android-36`, build-tools `35.0.0` pulled by Gradle and `36.0.0` installed). `ANDROID_HOME` is not set for the user.
- `.\gradlew.bat assembleDebug` with those two variables set: **BUILD SUCCESSFUL**. Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`. It was not installed or launched.
- Stage 04 (back button, external-link policy, splash timeout) is not started.

Shell only. Do not bundle Next.js.

- Objectives: install a current Capacitor, generate `android/`, point the WebView at the production origin, and produce a debug build on a machine that has the SDK.
- Tasks:
  - Install JDK 21 and Android SDK (API matching that Capacitor release; Capacitor 7 uses API 35). Put `corepack` / pnpm 12 on `PATH`.
  - Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` at the repo root or a small `apps/android` package. Pin versions in the lockfile.
  - `webDir` may be a stub `index.html` used only when the remote URL fails. `server.url` for the release flavor is `https://life.endemion.online`. No cleartext.
  - `allowNavigation`: `life.endemion.online`, `auth.endemion.online`. Nothing else.
  - App id, for example `online.endemion.life`, only after the owner confirms the Play package name.
  - Debug builds may point at a staging origin. Release builds must not.
- Dependencies: Stage 01. Stage 02 can proceed in parallel but should merge before store screenshots.
- Expected files: `capacitor.config.ts`, `android/` (generated, not hand-faked), package script `cap:sync` / `cap:open`. Document the exact Capacitor, Gradle, JDK, and SDK versions that actually built.
- Acceptance: `./gradlew assembleDebug` succeeds on the dev machine. The debug app shows the live site over HTTPS. No game API change. `pnpm check` still passes if JS config was added.
- Testing: unit tests of the web app if config touches it. Manual: cold open, rotate, kill, reopen. Do not claim an APK was built until Gradle exits 0.
- Risks: Play may reject a thin WebView. If the policy blocks it, stop and switch the shell to a Trusted Web Activity on the same URL. Do not start a rewrite inside this stage.

## STAGE 04 — Android native integration

**Status: implemented and debug-built** (2026-11-06). Not installed or manually tested on a phone/emulator.

- `MainActivity` applies `#060608` to the status and navigation bars, shows a native first-load overlay, and uses WebView history for the Android back action.
- When there is no WebView history, the activity keeps the default Android back behavior. No custom URL client was added, preserving Capacitor's OIDC-safe navigation handling.
- Capacitor's generated `BridgeWebViewClient` opens hosts outside the configured allow-list with an Android `ACTION_VIEW` intent. The existing allow-list remains only `life.endemion.online` and `auth.endemion.online`.
- `server.errorPath` remains `offline.html`; the local page is copied into the APK assets by `cap sync`, while the native first-load overlay provides a visible timeout/error state and retry button.
- `initialViewportFitValueHint: "cover"` was removed so the shell does not impose edge-to-edge behavior before the website's Stage 02 safe-area CSS is deployed.
- `android:usesCleartextTraffic` was not enabled and no certificate bypass or trust-all network config was added.
- `pnpm exec cap sync android`: successful. `android/.\gradlew.bat assembleDebug --no-daemon`: **BUILD SUCCESSFUL**. APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Physical-device smoke acceptance completed on vivo `I2405`, Android 16/API 36: install, launch, production load, airplane-mode native error, retry, and recovery passed. OIDC login, cookie continuity, route back behavior, external-link handling, rotation, and process-death checks remain for Stage 05/06.

- Objectives: back button, splash, status bar, external links, and a native failure page. Still no game logic.
- Tasks:
  - Back: `history.back()` while the WebView can go back; on `/` ask before `moveTaskToBack` / finish.
  - Status bar and navigation bar colors match `#060608`. Layout does not draw under the system bars unless Stage 02 safe-area CSS is already in production.
  - Links whose host is not `life.endemion.online` or `auth.endemion.online` open in the system browser (`mailto:` included).
  - Splash shown until the first real page finishes, with a timeout and a retry button if the host fails.
  - `android:usesCleartextTraffic` stays false. Debuggable WebView only in the debug build type.
- Dependencies: Stage 03 debug build. Stage 02 CSS should be deployed before judging insets, or the shell adds its own inset and the site will double-pad. Prefer the site owning insets.
- Expected files: `android/app/src/main/java/...` activity or a small Capacitor plugin, `AndroidManifest.xml` changes, `network_security_config.xml` only if it **keeps** system CAs (no trust-all).
- Acceptance: back does not kill the activity from `/play`. A link to `endemion.online` leaves the WebView. Airplane mode shows the native error, not a blank WebView. Certificate errors are not ignored.
- Testing: manual on one phone API 34+ and one emulator. No production deploy required for the shell. Site CSS deploy is a normal web release, not an Android release.
- Risks: a custom WebView client that intercepts OIDC and breaks the redirect. Test login in Stage 05 before adding more interceptors.

## STAGE 05 — Authentication and save compatibility

**Android smoke status: OIDC and server-save path passed** (2026-11-06). See `STAGE_05_ANDROID_AUTH_REPORT.md`.

- Device: vivo `I2405`, Android 16/API 36, WebView 158.0.8127.2.
- Endemion ID login stayed inside `MainActivity`; the production app returned authenticated with the account profile and current-device session visible.
- A server life was created through the normal UI, advanced from age 0 to age 1, and was visible after app process death/relaunch with the same name, world, and age.
- The auth page emitted a `triggerEvent` JavaScript console error, but the OIDC redirect and authenticated session completed. Investigate the auth-site error separately; no Android workaround was added.
- A pre-existing desktop life, logout/cookie revocation, and replay of the same action id remain unverified.

- Objectives: prove the phone is the same player as the browser.
- Tasks:
  - Sign in with Endemion ID inside the WebView. Confirm `el_session` is set for `https://life.endemion.online` and `GET /api/auth/me` returns the same `endemionId.sub` as desktop.
  - Open an existing cloud life. Advance one year. Reload on desktop and see the same `version`.
  - Second action with the same `actionId` after a killed request does not double-apply (the site already does this; confirm it in the WebView).
  - Guest session created in the app, then login, follows the existing transfer rules. Do not add a client-side merge.
  - Do not add the app origin to `CORS_ORIGINS`. Do not change `COOKIE_SECURE`. Do not register a new OIDC redirect URI unless the flow is proven broken **and** the owner accepts a production auth change in a separate decision.
  - If `auth.endemion.online` blocks the WebView user agent, stop. Options, in order: TWA (same Chrome jar), or an owner-approved IdP exception. Not a local token copy.
- Dependencies: Stage 04 shell that can navigate. A real Endemion ID test account from the owner. Production or a staging stack that uses the same cookie and OIDC settings.
- Expected files: test notes in the stage report. Production code only if a site bug is found (for example the OIDC return path). No Android-only save table.
- Acceptance: one existing life is readable and writable from the phone and from the browser under one account. Local-only lives are not created when the site loaded. Logout revokes the session (`POST /api/auth/logout`) and the WebView loses the cookie.
- Testing: manual script above. Existing `apps/api/test/endemion-id.e2e-spec.ts` stays the API contract; re-run it only if API code changed. Do not run a load test against production.
- Risks: guest-life transfer can surprise a tester who had a guest life on that WebView. Use a clean WebView profile. Custom Tabs are the wrong fix (see audit S1).

## STAGE 06 — Android testing and QA

**Status: NO-GO / not release-ready; automated QA gate green** (2026-11-06). See `STAGE_06_ANDROID_QA_REPORT.md`, `STAGE_06_ANDROID_BUGS.md`, and `STAGE_06_ANDROID_TEST_MATRIX.md`.

- Completed: physical-device shell smoke, offline/retry recovery, OIDC inside the WebView, server life creation, one year action, process-stop save restoration, production `/play` rendering, all four mobile tab renders, language persistence, Android Back from `/play`, background/foreground, and rotation smoke.
- Android lint, debug/release Gradle builds, rebuilt debug installation, and post-launch crash-log inspection pass. The release output is `app-release-unsigned.apk` and `app-release.aab`; no publishable signed artifact exists.
- Isolated local API/e2e gate now passes: migrations, API e2e 103/103, and Playwright desktop/mobile 54/54. The unrelated existing Postgres volume remains untouched.
- The repeatable QA stack is defined in `infrastructure/docker-compose.qa.yml` and uses separate volumes and ports `15432/16379`; it must not be confused with the existing local `endemion-postgres` container.
- Follow-up regression also passes: package build, typecheck, lint, unit suites, web production build, rebuilt debug installation, root Back, and post-launch logcat smoke.
- `pnpm check` passes end-to-end. The vivo reports split-screen capability, but its OEM shell rejected the programmatic split entry; the Activity was restored to fullscreen without a crash, while the physical split-screen layout assertion remains open.
- Isolated API contracts now explicitly pass: replay/lifecycle suites 14/14 and local OIDC provider suite 11/11. These close server/provider contract coverage, not production WebView or second-device physical coverage.
- Blocked/open: split-screen assertion, full physical-device NPC/market/adventure interactions, destructive lifecycle and succession, controlled browser-created action/version sync, duplicate-action replay, second target, and the source of the `triggerEvent` auth console error. Keyboard IME behavior, same-device Chrome read/render compatibility, external-host and `mailto:` intent handling, and the expected no-App-Link cold-launch behavior passed.
- The device briefly became ADB `offline` and recovered. The automated gate is green, but no release-ready claim is made until signing and remaining physical-device cases close.

- Objectives: a written device pass, not a new feature.
- Tasks:
  - Create, age, choice, people tab, market if the character is old enough, adventure step, death summary, succession if a heir exists, restore snapshot, language switch, account page.
  - Rotation, split-screen if supported, process death, back from each route.
  - Offline: shell error, then recovery without a duplicate year.
  - Update the website while the app is installed and confirm the new UI appears without a store update.
- Dependencies: Stages 02–05. A release or internal-testing build.
- Expected files: QA notes (device, API level, WebView version, account used, pass/fail). No new markdown unless the owner wants a `STAGE_06` report.
- Acceptance: the script has no open HIGH defects. Known web debt from Stage 24 is either still listed or fixed.
- Testing: Playwright mobile on the site plus the manual device script. Playwright does not replace a real WebView.
- Risks: a WebView older than the site's CSS. Record the WebView version. Do not pretend emulator equals a Samsung or Xiaomi build.

## STAGE 07 — Performance optimization

Only if Stage 06 shows a real problem.

- Objectives: measure, then change the smallest thing.
- Tasks: cold-start time to interactive on a mid-range phone, transferred bytes for `/play`, jank while paging history. Prefetch or cache only static `/_next/static` if the shell can do it without caching `/api/*`.
- Dependencies: Stage 06 notes with numbers.
- Expected files: a short report. Code changes only against a measured cost.
- Acceptance: no behavior change to `applyAction`. API responses stay `no-store`.
- Testing: the same play e2e suite. One before/after trace.
- Risks: caching HTML or `/api/auth/me` would show the wrong account. Do not cache those.

## STAGE 08 — Release preparation

- Objectives: an internal Play track, not a public claim of a new game.
- Tasks:
  - Owner: package name, signing key in Play App Signing, listing text, screenshots from Stage 02 UI, privacy policy URL (`https://endemion.online/privacy`).
  - `android/app/build.gradle` accepts `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, and `RELEASE_KEY_PASSWORD` only from external Gradle properties or environment variables; do not place the keystore or passwords in git.
  - Repeatable QA infrastructure is available through `pnpm infra:qa:up` / `pnpm infra:qa:down`; it uses `infrastructure/docker-compose.qa.yml` on ports `15432/16379`.
  - Version code, `targetSdk` required by Play on the submission date, Proguard off unless a plugin needs it (the UI is remote).
  - Remove debug `server.url`, debuggable WebView, and any test account.
  - Data safety form: session cookie, account via Endemion ID, no ads SDK, no extra trackers in the shell. Confirm Sentry is not added to the APK.
  - Rollback: a bad shell is a Play halt; a bad website is the existing `docs/ROLLBACK.md` path. They are independent.
- Dependencies: Stages 05 and 06 green. Owner signing assets.
- Expected files: Play Console listing (outside git), release notes, checksum of the AAB. Secrets stay out of git.
- Acceptance: AAB built from the release variant, installed over an internal track, login and one existing life verified on a physical device. Production Docker stack not rebuilt for the shell.
- Testing: upgrade from the previous internal build keeps the WebView cookie only if the package name and signing key match. Confirm that once.
- Risks: package-name change orphans the cookie jar and looks like a data loss. Freeze the application id before the first internal upload.

## What this roadmap will not do

- Rewrite `packages/game-core` or the NestJS API.
- Add a SQLite save on the device.
- Turn off `COOKIE_SECURE`, CSRF origin checks, or TLS verification.
- Generate a fake `android/` tree in Stage 01.
- Start Stage 02 without an explicit request.
