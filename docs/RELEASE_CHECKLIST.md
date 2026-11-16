# Android release checklist

Reusable checklist for an Endemion Life Android release. It does not replace `docs/planning/R6_3_ANDROID_RELEASE.md`; it is the operator sequence.

## 1. Before the build

- [ ] `main` is clean, CI and Security are green.
- [ ] `PROJECT_STATUS.md` describes the release and rollback target.
- [ ] `versionCode` is greater than the last uploaded build.
- [ ] `versionName` matches the release notes.
- [ ] `applicationId` is still `online.endemion.life`.
- [ ] Production `/api/health`, `/api/ready` and the launch gate are green.
- [ ] A fresh restore drill passed (`sh infrastructure/scripts/backup-drill.sh`).
- [ ] Signing keystore and credentials are outside the repository.
- [ ] No secret, keystore, password or account data is present in `git status`.

## 2. Build the artifacts

```bash
pnpm install --frozen-lockfile
pnpm android:sync
```

Signed release APK + AAB (env values are never printed or committed):

```bash
cd android
./gradlew assembleRelease bundleRelease --no-daemon
```

CI also builds an installable debug APK and an unsigned AAB on every clean checkout.

## 3. Verify the artifacts

```bash
# AAB signature
jarsigner -verify android/app/build/outputs/bundle/release/app-release.aab

# APK signature and certificate
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk

# Package identity and versions
aapt dump badging android/app/build/outputs/apk/release/app-release.apk
```

- [ ] Package is `online.endemion.life`.
- [ ] `versionCode` is the intended value.
- [ ] `versionName` is the intended value.
- [ ] `minSdk` is 24 and `targetSdk` is 36.
- [ ] AAB and APK are signed with the upload key.
- [ ] Artifact sizes are sane (non-empty; roughly 2–4 MB for the current shell).

## 4. Device smoke

Use a test device, not a personal daily phone when possible.

- [ ] Uninstall the previous debug/release build if the signing key changed.
- [ ] `adb install -r <signed-release.apk>`.
- [ ] Cold start under 3 seconds on the test device.
- [ ] App opens to production `https://life.endemion.online`.
- [ ] RU and EN interfaces render.
- [ ] Create a life, make one event choice, advance a year.
- [ ] Close and reopen: life and save are still present.
- [ ] Open Dossier, World, Atlas, Road.
- [ ] Play world sound, toggle it off and on.
- [ ] Export/save a character file through the native share/save flow.
- [ ] Back button does not leave a broken WebView or blank screen.
- [ ] Offline/airplane mode shows the offline shell and retry works.
- [ ] No unexpected `chromium`/`Capacitor`/`AndroidRuntime` errors in `adb logcat`.

## 5. Play Console

- [ ] Upload the signed AAB to the internal/closed testing track first.
- [ ] Confirm Play App Signing is configured and the upload certificate is the expected one.
- [ ] Fill/refresh Data safety (account, saves, diagnostics, purchases if any).
- [ ] Privacy Policy URL is live and matches the build.
- [ ] Content rating and target audience are current.
- [ ] Store listing, screenshots, feature graphic and short/full description are current.
- [ ] Testers install from the testing track, not from a side-loaded APK.
- [ ] Review pre-launch report; fix crashes, ANRs, accessibility blockers.
- [ ] Roll out to a small staged percentage before 100%.

## 6. After release

- [ ] Production `/api/health` and `/api/ready` are green.
- [ ] `BASE_URL=https://life.endemion.online pnpm launch:check` passes.
- [ ] Backup drill passes after the release window.
- [ ] Crash-free and ANR metrics are checked after the first hour/day.
- [ ] Rollback/halt path is known and tested.
- [ ] Release result is recorded in `PROJECT_STATUS.md`.

## 7. Stop conditions

Do not upload or continue rollout if any of these is true:

- AAB/APK signature is invalid or signed with an unexpected key.
- Package name or versionCode is wrong.
- App does not open on a real device.
- Login, life creation, save/reload or event choice is broken.
- Health/readiness or launch gate is red.
- The latest backup or restore drill failed.
- Data safety/privacy text does not match what the app actually collects.
