# Android Wrapper Development

## Source of truth

- The PWA source remains at this repository root.
- The Android wrapper source is tracked in `android-app/`.
- `android-app/app/src/main/assets/` is generated from the root frontend files and must not be edited or committed.

## Before an Android build

Run the asset synchronization script after every frontend change:

```powershell
.\tools\sync-android-assets.ps1
```

The script clears only generated Android assets, copies the runtime frontend files, fonts, icons and key visuals, then verifies every copied file with SHA-256.

## Build commands

```powershell
# Standard debug APK
.\tools\build-android.ps1 -Variant debug

# R8 / minified debug APK
.\tools\build-android.ps1 -Variant minifiedDebug -Clean
```

`version.js` is the single version source. `android-app/app/build.gradle.kts` derives `versionName` and `versionCode` from it during the Gradle build.

## Contribution flow

1. Create a focused branch from `main`.
2. Change frontend files at the repository root and/or Kotlin, manifest, Gradle or resources in `android-app/`.
3. Increment `sw.js` cache only when frontend runtime assets change; update `CHANGELOG.md` for every project change.
4. Run the relevant Node syntax checks, `git diff --check`, asset synchronization, and an Android build appropriate to the change.
5. Keep generated assets, APK/AAB files, Gradle caches, `local.properties`, keystores and signing secrets out of Git.

## Release signing

Release signing remains local. Do not commit a keystore, passwords, `local.properties`, APKs or AABs. A signed release artifact must be produced with a maintainer-controlled keystore outside the repository.
