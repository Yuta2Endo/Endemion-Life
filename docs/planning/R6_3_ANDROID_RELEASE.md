# R6.3 — Android release artifact gate

**Status:** implemented and verified locally; CI artifact pending  
**Save schema:** 14 (unchanged)  
**DB migration:** none  
**Scope:** Android build tooling, CI artifact, release checklist

## 1. Goal

Make the Android release path repeatable before touching Play Console:

- build an installable debug APK and a release AAB from a clean checkout;
- produce a signed release APK/AAB with the owner's upload key;
- verify package identity and signatures;
- keep signing material outside the repository;
- have a written checklist for device smoke, store metadata and rollout.

Push/deep links, Play Console automation, data-safety forms, staging/canary and store artwork are not part of this slice.

## 2. What was added

- Root scripts:
  - `pnpm android:build:bundle` — sync web assets and build `bundleRelease`;
  - `pnpm android:build:release` — build signed release APK and AAB when signing env is configured.
- CI Android job now builds both:
  - debug APK for device smoke;
  - unsigned release AAB as a packaging/compile gate.
- CI uploads `endemion-debug-apk` and `endemion-unsigned-release-aab` artifacts.
- `docs/RELEASE_CHECKLIST.md` — reusable pre-release, device, store and post-release checklist.

## 3. Signing

The committed `android/app/build.gradle` already supports four optional values:

```text
RELEASE_STORE_FILE
RELEASE_STORE_PASSWORD
RELEASE_KEY_ALIAS
RELEASE_KEY_PASSWORD
```

If they are absent, Gradle produces an unsigned release artifact and CI still verifies the bundling step. If they are present, the release APK/AAB is signed with the upload key.

The owner's keystore and password file stay outside the repository. They must never be committed, pasted into docs, or added to CI logs.

## 4. Local signed build

A local build with the owner's upload key succeeded:

| Artifact | Size | Verification |
|---|---:|---|
| `app-release.aab` | 2 890 621 bytes | `jarsigner -verify` — signed |
| `app-release.apk` | 3 008 636 bytes | `apksigner verify` — v2 signature valid |
| Package | `online.endemion.life` | `aapt dump badging` |
| minSdk / targetSdk | 24 / 36 | `aapt dump badging` |
| versionCode / versionName | 2 / 1.1.0 (local Android worktree) | `aapt dump badging` |

The AAB and APK were built from the current local Android worktree, which contains uncommitted owner changes. Those changes are intentionally not committed here.

## 5. Device smoke

A debug build was installed and cold-started on a connected Android device:

- `adb install -r` — success;
- cold start — 531 ms;
- foreground activity — `online.endemion.life/.MainActivity`;
- production home page rendered with the RU interface and the “Родиться” action.

A release APK install was not completed because the device disconnected after the build. The release artifact itself was signature-verified. Re-run device smoke from `docs/RELEASE_CHECKLIST.md` before store upload.

## 6. CI behavior

The Android CI job runs on a clean checkout:

```bash
pnpm android:sync
cd android
./gradlew assembleDebug bundleRelease --no-daemon
```

Without signing secrets the AAB is unsigned but must still be produced. The job fails if `app-release.aab` is missing or empty.

## 7. Limitations

- CI does not sign AABs: no signing secrets are configured.
- Play Console upload, data safety, content rating and store listing are manual.
- No staging/canary rollout or staged-rollout automation.
- No push notifications, deep links, AAB→universal APK bundletool step, or release-device automation.
- The local release build used uncommitted Android resources/version changes; the clean-checkout version must be chosen and committed before upload.

## 8. Rollback

No migration and no server runtime change. Revert the build scripts/CI/doc commit if needed.
