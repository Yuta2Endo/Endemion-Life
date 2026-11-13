# Android Readiness Assessment — Endemion Life

**Audit date:** 2026-11-13  
**Question:** Can the existing web game be delivered on Android, and what is required?  
**Method:** static inspection of `capacitor.config.ts`, `apps/android/`, `android/`, web mobile CSS, Playwright mobile config, Android port docs. No Gradle build, emulator, device test, or Play upload was performed.

---

## 1. Verdict

**Android is technically plausible but not release-ready.** The existing Capacitor project is a **remote-URL WebView shell** that loads `https://life.endemion.online`; it is not a bundled offline app. This is a reasonable low-risk v1 approach because it preserves the existing first-party cookie, Endemion ID OIDC, and server save data. However:

- The Android build is **not reproducible from a clean checkout**: no `@capacitor/*` dependencies exist in any `package.json` or `pnpm-lock.yaml`; `android/capacitor.settings.gradle` points at an orphan path under a locally installed `node_modules`.
- No signed AAB, keystore, Play listing, privacy policy, data-safety form, or account-deletion path exists.
- Safe-area/edge-to-edge handling and minimum touch targets are missing on the play screen.
- The web client falls back to a client-computed **local prototype** if `/api/health` fails, which is unacceptable for recordable Android play.
- A thin WebView wrapper carries Play Store review risk.

**Recommendation:** keep Capacitor as the v1 container, but treat it as a **release-engineering project**, not a wrapper afterthought. Fix reproducibility and compliance first; if Play rejects the thin wrapper, use a Trusted Web Activity (TWA) as the fallback, not a native rewrite.

---

## 2. Current implementation

| Item | Evidence | Status |
|---|---|---|
| App ID / name | `online.endemion.life`, Endemion Life (`capacitor.config.ts:3-5`) | COMPLETE |
| Container | Capacitor 8.6.0 remote URL `https://life.endemion.online` (`capacitor.config.ts:11-17`) | PARTIAL |
| Scheme | `androidScheme: "https"`, `cleartext: false`, `allowMixedContent: false` | COMPLETE |
| Navigation allow-list | `life.endemion.online`, `auth.endemion.online` | COMPLETE |
| Offline page | `errorPath` + `apps/android/www/offline.html` + native retry overlay | PARTIAL (no cached game) |
| Native project | Gradle wrapper 8.14.3, AGP 8.13.0, Java 21, `android/` 55 tracked files | PRESENT, build not verified |
| SDK levels | minSdk 24, compile/target 36 (`android/variables.gradle:2-4`) | CURRENT target |
| Permissions | only `INTERNET` (`AndroidManifest.xml`) | MINIMAL / appropriate |
| Deep links | none; no App Links / `assetlinks.json` | MISSING |
| Push | none; no Firebase/`POST_NOTIFICATIONS` | MISSING |
| Auth | WebView stays on real HTTPS origin, so `el_session` is first-party and OIDC works through the allow-list | DESIGN OK, NOT VERIFIED |
| Signing | reads `RELEASE_STORE_FILE`/password/alias from env; unsigned if absent (`android/app/build.gradle:8-17,35-54`) | NOT READY |
| Versioning | `versionCode 1`, `versionName "1.0"` | PLACEHOLDER |
| Backup | `android:allowBackup="true"`, no exclusion rules | RISK |
| Web assets | `apps/android/www/` only has two hand-written stubs, no Next export/service worker | BY DESIGN for remote shell |
| Build deps | no `@capacitor/*` in package.json/lockfile; no `@capacitor/cli`; SystemBars plugin not installed | **BLOCKED** |

### 2.1 Why the remote shell is the right v1 choice

A bundled Capacitor app would run on `https://localhost` or `capacitor://localhost`, creating a **different origin** from the production web app. That would:

- break the first-party `el_session` cookie and CSRF origin checks;
- require new CORS/cookie/OIDC redirect rules;
- create a second client/save path;
- diverge from the web release.

The current design avoids all of that. The trade-off is dependence on network and a thin-wrapper risk. For a persistent-world game that is server-authoritative, a remote shell is defensible for v1.

---

## 3. Readiness by dimension

| Dimension | Status | Evidence / gap |
|---|---|---|
| Frontend compatibility | PARTIAL | Next.js app renders in Chrome WebView; mobile Chrome audit found homepage 58px horizontal overflow at 390px, fixed header, 38px CTAs |
| Responsive layout | PARTIAL | `/worlds` and `/create` fit; play screen uses 3-column grid only at `lg`; tablets at 1024px are cramped; duplicate Dossier bug on desktop does not affect phone tab but signals layout fragility |
| Touch interactions | PARTIAL | bottom tabs 48px; many links/buttons 20–38px; labels 10–11px; below 44px guidance |
| Safe areas | MISSING | no `viewportFit: "cover"`; no `env(safe-area-inset-*)`; bottom nav/dialog can sit under gesture/navigation bars on Android 15+ |
| Navigation | PARTIAL | back button maps to WebView history then exits; no confirm-on-exit; header can crowd below 380px |
| Authentication | DESIGN OK | first-party cookie + OIDC in same WebView; not tested on device; no deep-link callback needed |
| Session persistence | LIKELY OK | 365-day HttpOnly cookie; WebView data persists; `allowBackup=true` is a privacy risk |
| Offline/network failure | PARTIAL | native startup overlay + retry; no cached game, no queued turns, no offline save |
| API failure behavior | **P1 RISK** | if `/api/health` fails, `store/index.ts` selects local mode and new lives can be created client-side; this is not server-authoritative and can be lost |
| Capacitor compatibility | PRESENT but unreproducible | no lockfile deps; gradle path hardcoded to local node_modules |
| Native Android requirements | PARTIAL | targetSdk 36 good; minSdk 24; Java 21; no signing/Play assets |
| Play compliance | BLOCKED | thin wrapper, no account deletion, no privacy policy/data safety, no signed AAB, no review access |
| Performance | RISK | 471KB compressed JS/CSS, full game-core + 58.8KB messages dictionary in client; 15s startup timeout; low-end Android may struggle |
| Push/notifications | MISSING | not required for v1, but needed for social/live-world retention |
| Deep links | MISSING | sharing a life/profile opens browser, not app; not required for v1 |

---

## 4. Build reproducibility blocker (P1 / F-02)

A clean checkout cannot build the Android app:

- `rg '@capacitor' package.json pnpm-lock.yaml` returns no dependency entries.
- `android/capacitor.settings.gradle` includes `../node_modules/.pnpm/@capacitor+android@8.6.0_@capacitor+core@8.6.0/...`.
- The Capacitor Android package currently exists only because it was installed manually/left in local `node_modules`.
- `@capacitor/cli` is absent, so `cap sync` cannot run from a documented script.
- `@capacitor/system-bars` is referenced in config but not installed.

**Impact:** the APK/AAB cannot be rebuilt on CI or another machine; the checked-in native project is not tied to a declared dependency graph.

**Fix:** add an `apps/android` package (or root devDependencies) with pinned `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`, `@capacitor/system-bars`, `cap:sync`/`cap:open`/`cap:build` scripts, regenerate `android/`, commit the lockfile, and add a CI job that runs `cap sync` + `gradle assembleDebug` (and a signed release job behind secrets).

---

## 5. Release blockers

| ID | Blocker | Impact | Required action |
|---|---|---|---|
| F-02 | Non-reproducible build | Cannot ship or patch | Declare Capacitor deps, regenerate, CI build |
| F-03 | No safe-area handling / small targets | Unusable controls under system bars; mis-taps | `viewportFit:"cover"`, inset padding, 44px minimum, API 36 device test |
| F-04 | Local prototype fallback | Client-authoritative lives on Android | Disable local mode in native shell; show blocking retry |
| F-05 | Thin wrapper + no account deletion | Play rejection / policy violation | Add deletion flow or compliant URL; prepare Play declarations; TWA fallback |
| S-12/L-1 | Live claim duplication | Economy exploit in shared features | Fix before enabling live windows on Android |
| F-12 | `allowBackup=true` | Cookie/local data backup exposure | Disable backup or add extraction rules |
| — | No signing/AAB/listing | Cannot publish | Keystore + Play App Signing, versionCode, listing, privacy policy |
| — | No offline strategy | Poor UX on mobile networks | Graceful read-only cache/retry; do not queue authoritative turns |
| — | No device/emulator evidence | Readiness unproven | Test matrix: API 24/30/35/36, small/large screen, slow network, rotation, background/foreground |

---

## 6. Recommended approach

### Option A — Capacitor remote shell (recommended for v1)

**Pros:** preserves cookies/OIDC/save contract; one codebase; fastest to market; native shell can add back handling, splash, status bar, retry, later push.

**Cons:** network-dependent; thin-wrapper review risk; WebView performance; no offline play.

**Conditions:** fix build reproducibility, safe areas, local-mode fallback, account deletion, signing, and device QA. Add a small amount of native value (push notifications, share/deep links, biometric unlock later) to reduce thin-wrapper risk.

### Option B — TWA / Bubblewrap (fallback)

**Pros:** Chrome rendering, Play-distributable, less WebView code, Digital Asset Links.

**Cons:** cookie jar is Chrome's, not the app's; OIDC and session behavior differ; less control over back/offline.

Use only if Play rejects the Capacitor shell or if Chrome-first behavior is acceptable.

### Option C — Bundled Capacitor app

**Pros:** offline-capable, app-store-native.

**Cons:** new origin, cookie/CORS/OIDC rework, duplicate save path, larger release scope.

**Not recommended for v1.** Revisit only when offline play is a product requirement and the server has an offline-sync protocol.

### Option D — Native rewrite

**Not justified.** It duplicates `game-core` and the UI, creates a second save path, and violates the “preserve existing implementation” constraint.

---

## 7. Android acceptance criteria (release gate)

- Clean clone + frozen install + `cap sync` + Gradle debug build succeeds in CI.
- Signed AAB produced from protected secrets; versionCode/versionName managed.
- App launches to production over HTTPS; no cleartext; no mixed content.
- Login/logout/session persistence work on API 24, 30, 35, 36.
- Safe areas respected on gesture and 3-button navigation; all primary controls ≥44px.
- API-down state blocks new-life creation and offers retry; no client-authoritative life is created in the shell.
- Back navigation is predictable; exit confirmation on root.
- Account deletion is available in-app or via a compliant web flow.
- Privacy policy, data-safety form, content rating, and reviewer test account prepared.
- Crash/ANR monitoring and a rollback plan exist.
- Core journey (create → advance → event → save/restore → succession) passes on a physical low-end device and a tablet.

Until these pass, Android status is **BLOCKED**, not “ready”.
