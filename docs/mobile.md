# Mobile (Capacitor) — Android & iOS

PetPattern is a web app that can be wrapped as a native Android/iOS app with
[Capacitor](https://capacitorjs.com/). This document covers what is in the repo, how to
produce a native build, and — honestly — what has and has **not** been verified here.

## Verifiability

There is **no Android Studio, Xcode, device, or emulator** in the development environment, so
the native builds themselves cannot be produced or run here. Each item below is marked:

- **verified** — exercised and confirmed (web build / unit tests).
- **generated** — implemented and code-reviewed, but not run on a device.

| Piece | Status |
|---|---|
| Reminder scheduling *logic* (`src/lib/reminderSchedule.js`) | **verified** — unit-tested (`reminderSchedule.test.js`) |
| Web foreground reminder (`src/lib/reminders.js`) | **verified** — web build + runtime |
| Safe-area / notch / tap-target CSS (`src/styles/capacitor.css`) | **verified** — `env()` resolves to 0 on the web, so it is safe there |
| API base + mobile session token (`src/api.js`) | **verified** — `VITE_API_BASE` + `X-Session-Token` path exists |
| `capacitor.config.json` | **generated** |
| Native local notifications + reminder lifecycle (`src/lib/nativeNotifications.js`, `ReminderControl`) | **verified** *(logic unit-tested; on-device delivery/DST **generated**)* |
| Secure session storage (`src/lib/secureSession.js`) | **verified** *(cache/migration unit-tested; Keychain/Keystore round-trip **generated**)* |
| Deep links + status bar (`src/lib/mobile.js`) | **generated** |
| `ic_stat_icon` notification icon (vector drawable) | **generated** — resource present, referenced by `capacitor.config.json` |
| Deep-link OS config (Android intent filters, iOS URL types + Associated Domains) | **generated** — present; App Links / Universal Links need a real domain + device |
| Google sign-in hidden on native (`AuthScreen`) | **verified** — unit-tested |
| Android/iOS project + store build | **not done** — needs the native toolchains |

## Prerequisites (native builds)

- Android: Android Studio + JDK 17.
- iOS: Xcode (macOS only).
- Capacitor CLI is already a dev dependency (`@capacitor/cli`).

## One-time setup

The web build outputs to `frontend/dist`, which `capacitor.config.json` uses as `webDir`.

```bash
cd frontend

# Native plugins used by the app. They are intentionally NOT in package.json so the WEB build
# and its lockfile stay untouched (the app reaches them through the runtime `Capacitor.Plugins`
# global, the same way src/api.js already uses Capacitor). Install them for native builds:
npm i @capacitor/local-notifications @capacitor/app @capacitor/status-bar

# Secure session storage (iOS Keychain / Android Keystore-backed encrypted storage). The bearer
# session token is stored here on native — never in localStorage — via lib/secureSession.js, which
# reaches the plugin through `Capacitor.Plugins.SecureStoragePlugin`. Required for native builds:
npm i capacitor-secure-storage-plugin

# Point the app at the API. A native app has no same-origin nginx proxy, so it cannot use the
# default relative '/api'. Set the full https origin at build time:
VITE_API_BASE=https://YOUR_PUBLIC_ORIGIN/api npm run build

npx cap add android      # and/or: npx cap add ios
npx cap sync
```

## Iterating

```bash
VITE_API_BASE=https://YOUR_PUBLIC_ORIGIN/api npm run build
npx cap sync
npx cap open android     # or: npx cap open ios  — build/run from the IDE
```

## Notifications

- Opt-in daily reminder at a time the owner picks (`ReminderControl`). On native it schedules a
  **repeating local notification** via `@capacitor/local-notifications`; on the web it falls back
  to a foreground `Notification` while the app is open.
- The decision logic (when to fire, once per local day, timezone-safe) lives in
  `reminderSchedule.js` and is unit-tested.
- **Lifecycle** (`ReminderControl`, unit-tested in `ReminderControl.test.jsx`): on app start and on
  every app resume the control calls `checkPermissions()` **without prompting**, so a saved reminder
  re-schedules after a cold restart, re-anchors after a timezone/DST change, and a since-revoked
  permission drops the UI out of its "on" state. Changing the time reschedules immediately; today's
  check-in cancels only today's occurrence while the recurring daily reminder stays active.
- The notification body is **neutral and carries no pet name** — "Would you like to save today's
  PetPattern check-in?" — with **no health detail**, so nothing identifiable or sensitive appears on
  a lock screen. It never fires when the reminder is off, permission is not granted, or the day is
  already logged.
- The Android status-bar small icon is `ic_stat_icon` (a monochrome vector drawable at
  `frontend/android/app/src/main/res/drawable/ic_stat_icon.xml`), referenced by `capacitor.config.json`.

## Deep links & sign-in

Password-reset links are hash routes (`#reset=<token>`), and the shared vet view is `#shared=<token>`.
`src/lib/mobile.js` listens for the Capacitor `App` `appUrlOpen` event and applies the incoming URL's
hash to the SPA router. Two OS-level entry points are configured:

- **Custom scheme (`petpattern://`)** — always works with no domain verification, so it is the
  reliable path during the beta (e.g. `petpattern://reset#reset=<token>`). Configured in
  `AndroidManifest.xml` (a `VIEW`/`BROWSABLE` intent filter) and `Info.plist` (`CFBundleURLTypes`).
- **App Links / Universal Links (`https://<domain>`)** — so a password-reset email opens the app
  directly. Requires:
  - **Android**: the `autoVerify` intent filter in `AndroidManifest.xml` (host `app.example.com` —
    replace with the real domain) + serve `/.well-known/assetlinks.json` at that domain with the
    app's `app.petpattern.mobile` package name and signing-cert SHA-256 fingerprint.
  - **iOS**: the `com.apple.developer.associated-domains` entitlement in `App.entitlements`
    (`applinks:app.example.com` — replace) wired into the Xcode target + serve
    `/.well-known/apple-app-site-association` at that domain with the app's Team+bundle id.
  - **Not verified here** — App Links / Universal Link verification needs the real domain and a
    physical device; do not claim it is verified until then.

**CORS / mobile origin**: a native WebView calls the API from `capacitor://localhost` (iOS) or
`https://localhost` (Android `androidScheme=https`). Both are in the dev CORS allow-list
(`application.yml`, `docker-compose.yml`) and must be added to `PETPATTERN_CORS_ALLOWED_ORIGINS` in
production (see `.env.example`). Use explicit origins only — never `*` — because CORS runs with
credentials.

**Google sign-in** is a web-redirect flow that cannot return a session into a native WebView, so the
button is **hidden on Android/iOS** (`AuthScreen`). Native users keep email/password + password
reset. Full native Google OAuth is a **post-beta** enhancement — see `docs/google-login.md`.

## Safe area & status bar

`src/styles/capacitor.css` pads the sticky top bar, shell, and bottom nav with
`env(safe-area-inset-*)` (0 on the web), and floors tap targets at 40px. `initMobile()`
(called once from `main.jsx`) sets a dark status-bar style for the light background.
