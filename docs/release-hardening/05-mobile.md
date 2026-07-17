# WP4 — Capacitor mobile readiness

Took the mobile foundation from "config + glue only" to real, committed native projects, plus the
device-independent code gaps. Actual native BUILDS are blocked by this environment (no Android SDK,
win32 host with no Xcode/macOS) — those steps are given for Bruno to run.

## Generated & committed this sprint
- **`frontend/android/`** — real Gradle project. `applicationId app.petpattern.mobile`, versionCode 1,
  versionName 1.0. `npx cap add android` + sync succeeded; the 4 plugins are detected
  (`@capacitor/app 8.1.1`, `local-notifications 8.2.1`, `splash-screen 8.0.2`, `status-bar 8.0.3`).
- **`frontend/ios/`** — real Xcode project (SPM/Package.swift integration, so no CocoaPods needed).
  Same 4 plugins. `npx cap add ios` succeeded even on Windows (it scaffolds; it does not build).
- **Plugin packages pinned** in `frontend/package.json` (were reached only via the runtime global
  before, so versions were unpinned) — native builds are now reproducible.
- **Permission descriptions:** iOS `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` /
  `NSPhotoLibraryAddUsageDescription` (the photo picker used by `<input type=file>` needs these or
  iOS crashes on camera access); Android `POST_NOTIFICATIONS` (Android 13+ reminder).
- **Signing material excluded:** no keystore / provisioning profile / `google-services.json` /
  `GoogleService-Info.plist` in either project; `.gitignore` covers them globally and the native
  build outputs (`build/`, `.gradle/`, `local.properties`, `Pods/`, `xcuserdata/`, copied web
  assets) under `frontend/android` and `frontend/ios`.

## Device-independent code gaps closed
- **Android hardware back button** (`initBackButton`) — navigates the SPA / webview history and only
  exits at the root (Today), instead of the OS backgrounding the app on every press. Unit-tested.
- **Offline / network-error handling** — `api.js` wraps `fetch` and throws a typed `NetworkError`
  ("You appear to be offline…") instead of a raw `TypeError: Failed to fetch`, on both JSON requests
  and photo upload.
- **Dev/prod API config** — `frontend/.env.mobile` (loaded by `build:mobile`) sets a PUBLIC
  `VITE_API_BASE` placeholder for the deployed API origin (mobile can't use relative `/api`).
- Status bar, splash screen, deep links (password-reset / shared-vet hash links) and the reminder
  tap deep-link were already present / added in WP3.

## Reproducible native steps (run where a toolchain exists)
```bash
cd frontend
# edit .env.mobile -> real production VITE_API_BASE
npm ci
npm run build:mobile        # vite build --mode mobile
npx cap sync                # copy web + plugins into android/ and ios/
# Android (needs Android Studio + SDK, ANDROID_HOME set):
npx cap open android        # then Build > Build APK, or:
cd android && ./gradlew assembleDebug   # -> app/build/outputs/apk/debug/app-debug.apk
# iOS (needs macOS + Xcode):
npx cap open ios            # set a signing team, then Product > Archive
```

### App icons & splash (run once)
```bash
cd frontend
npm i -D @capacitor/assets
# place a 1024x1024 icon at resources/icon.png and a 2732x2732 splash at resources/splash.png
npx @capacitor/assets generate --android --ios
# also produce the notification small icon `ic_stat_icon` (monochrome) referenced by capacitor.config.json
```

## Verification status (honest)
| Item | Status |
|---|---|
| `npx cap add android` / `add ios` | ✅ DONE (projects generated + committed) |
| Capacitor plugin detection / sync (copy) | ✅ DONE |
| App ID / version / manifest permissions | ✅ verified statically |
| No signing material committed | ✅ verified |
| Android Gradle build / debug APK | ⛔ BLOCKED — no Android SDK / gradle on this host. Run `./gradlew assembleDebug`. |
| iOS Xcode build / archive | ⛔ BLOCKED — win32 host, no macOS/Xcode. Run on a Mac. |
| On-device notification delivery, permission prompt, back-button, deep-link, DST | ⛔ NOT device-verified — logic unit-tested against mocked plugins only. |
| App Links / Universal Links (`assetlinks.json` / `apple-app-site-association`) | TODO — host these + register once a domain is set (see notes in this file). |
| Keyboard / Browser / Camera plugins | Not installed — photos use `<input type=file>` (webview picker) by design; add `@capacitor/{keyboard,browser,camera}` only if native integration is wanted. |
