# Android Build Report — STAGE 01

**Status:** build reproducibility **FIXED**; release signing **FIXED**; Play Store release **COMPLETED WITH BLOCKERS**<br>
**Date:** 2026-11-13 (signed artifacts added 2026-11-14)

## 1. Original problem

The audit found a Capacitor Android project that could not be rebuilt from a clean checkout:

- No `@capacitor/*` dependency existed in any `package.json` or in `pnpm-lock.yaml`.
- `android/capacitor.settings.gradle` hardcoded a local pnpm path for Capacitor 8.6.0.
- `capacitor.config.ts` referenced a non-existent `@capacitor/system-bars` plugin.
- There was no `apps/android/package.json` and no documented sync/build command.
- CI had no Android job.
- `allowBackup="true"` allowed WebView/cookie data extraction via Android backup.
- The web client fell back to the local prototype store when the API was unreachable, so the Android shell could create an unsynchronized local life.
- No safe-area handling and several touch targets below 44px.

## 2. Implemented changes

| File | Change |
|---|---|
| root `package.json` | Added `@capacitor/cli`, `@capacitor/core`, `@capacitor/android` 8.6.2 devDependencies; scripts `android:sync`, `android:build:debug` |
| `pnpm-lock.yaml`, `pnpm-workspace.yaml` | Locked/approved Capacitor 8.6.2 (necessity: Android project imports Capacitor) |
| `capacitor.config.ts` | Removed non-existent `SystemBars` configuration; retained remote server URL, HTTPS scheme, allowNavigation |
| `android/app/src/main/AndroidManifest.xml` | `android:allowBackup="false"` |
| `android/.../MainActivity.java` | Appends `EndemionLifeAndroid/1.0` to the WebView user agent |
| `apps/web/src/lib/store/index.ts` | `isAndroidShell()`; `storeForNewLife()` refuses local-store creation in Android shell while preserving reads of existing local lives |
| `.github/workflows/ci.yml` | Android debug job: Node 24, Java 21, Android SDK platform/build-tools 36, `pnpm android:sync`, Gradle `assembleDebug`, APK upload |
| header/layout/CSS | safe-area insets, 44px minimum header/CTA targets, `viewportFit: "cover"` |

`pnpm exec cap sync android` succeeds and generates/updates the native Capacitor config and plugin registration.

## 3. Local build evidence

Android SDK: `E:\ASGG` (platform 36, build-tools 36.0.0, platform-tools).  
**JDK 21 is required.** `E:\ASG\jbr` is Java 25 and fails with `Unsupported class file major version 69`. The successful JDK is `C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot`.

Commands and results:

```text
$env:ANDROID_HOME='E:\ASGG'
$env:ANDROID_SDK_ROOT='E:\ASGG'
$env:JAVA_HOME='C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot'
pnpm android:sync
cd android
.\gradlew.bat assembleDebug --no-daemon
```

- `cap sync android`: **PASS**
- `assembleDebug`: **BUILD SUCCESSFUL in 34s**
- Artifact: `android/app/build/outputs/apk/debug/app-debug.apk` — **5,800,876 bytes**
- `bundleRelease`: **BUILD SUCCESSFUL in 55s**
- Artifact: `android/app/build/outputs/bundle/release/app-release.aab` — **4,342,869 bytes**
- Release warning: `Release signing is not configured; producing an unsigned release artifact.`

`aapt2 dump badging` on the debug APK:

```text
package: online.endemion.life
versionCode: 1
versionName: 1.0
compileSdk: 36
minSdk: 24
targetSdk: 36
application-label: Endemion Life
uses-permission: android.permission.INTERNET
uses-permission: online.endemion.life.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION
```

No camera, location, storage, contacts, or notification permissions are requested.

## 4. Network-offline behavior

The Android shell still loads `https://life.endemion.online` remotely. If the API/health check fails:

- Cloud save listing and existing cloud lives require connectivity.
- A new life cannot be created from the local prototype store in the Android shell; the user receives a clear network error and retry path.
- Existing local lives (if any) remain readable but are not silently created.
- The native startup overlay has a 15-second timeout and retry button.

This satisfies the requirement not to create an unsynchronized authoritative life, but it is **not an offline game**. Offline play is explicitly out of STAGE 01 scope.

## 5. Remaining blockers / not verified

1. **Release signing:** signing key material is available **outside the repository** at `G:\II\EndemionLife_keys`; signed AAB/APK were produced locally (see §7). Play Console upload and CI secret provisioning are still outstanding.
2. **Play Console submission:** no listing, screenshots, privacy policy URL, data-safety form, content rating, or account-deletion URL/flow evidence.
3. **Device/emulator test:** APK was built and inspected, not installed on a physical device or emulator in this stage.
4. **Deep links / OIDC callback:** no App Link intent filter; OIDC uses browser redirects. This works as a remote shell but is not a native OAuth app.
5. **Push notifications:** not implemented.
6. **Offline cache:** not implemented; remote URL shell requires network.
7. **Signing key custody and Play App Signing** require owner decisions.

## 7. Signed release artifacts (2026-11-14)

Signing material is stored outside the repository at `G:\II\EndemionLife_keys`. No
keystore, password, or credential file was copied into the repository or printed in
build output.

Build environment:

- JDK 21: `C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot`
- Android SDK: `E:\ASGG` (platform 36, build-tools 36.0.0)
- Release signing supplied through `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`,
  `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD` environment variables only.

Artifacts:

| Artifact | Path | Size | SHA-256 |
|---|---|---|---|
| Signed AAB | `android/app/build/outputs/bundle/release/app-release.aab` | 4,370,349 B | `07DD0B6A1C9E33B44DEA5C739CA49D8E9472175FF0DC6F3E96CEC2DD110174F4` |
| Signed APK | `android/app/build/outputs/apk/release/app-release.apk` | 4,517,430 B | `DC405C5F92DA162D5E31A6BD1EEE8C760108A1B37AFDF8DF3F5A6373253F3CBA` |

Verification:

- `jarsigner -verify app-release.aab` → exit code 0.
- `apksigner verify --verbose --print-certs app-release.apk` → verifies using APK
  Signature Scheme v2; certificate DN `CN=Endemion Life, OU=Mobile, O=Endemion,
  L=Unknown, ST=Unknown, C=US`.
- Certificate SHA-256:
  `FD:83:7D:9B:70:50:5E:9E:DB:8D:ED:09:57:C9:BD:71:96:BD:04:79:C4:9D:10:28:F2:D9:CF:9B:18:01:DB:A5`
- Key: 2048-bit RSA, SHA384withRSA, valid until 2054-03-24.
- `versionCode 1`, `versionName 1.0`, `minSdk 24`, `targetSdk 36`.

This proves a signed, verifiable Android artifact can be built. It does **not** prove a
Play Console upload, Play App Signing enrollment, device installation, or store review.

## 8. Verdict update

Release signing is no longer the blocker. Remaining Android blockers are Play Console
listing/compliance, data-safety and account-deletion declarations, CI signing-secret
provisioning, and a physical-device or emulator smoke test. The signed artifacts must
not be described as an approved store release until those are complete.
