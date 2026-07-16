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
| Native local notifications (`src/lib/nativeNotifications.js`) | **generated** |
| Deep links + status bar (`src/lib/mobile.js`) | **generated** |
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
- The notification body is **neutral** — "Time for {name}'s daily check-in." — with **no health
  detail**, so nothing sensitive appears on a lock screen. It never fires when the reminder is
  off, permission is not granted, or the day is already logged.

## Deep links & sign-in

- Password-reset links are hash routes (`#reset=<token>`), and the shared vet view is `#shared=<token>`.
  `src/lib/mobile.js` listens for the Capacitor `App` `appUrlOpen` event and applies the incoming
  URL's hash to the SPA router. To make the reset email open the app, configure Android **App
  Links** / iOS **Universal Links** for your domain (`assetlinks.json` / `apple-app-site-association`).
- **Google sign-in stays a web-redirect flow** (it needs a system browser and an exact redirect
  URI). It is intentionally not handled as a custom deep link. Email/password works natively as-is.

## Safe area & status bar

`src/styles/capacitor.css` pads the sticky top bar, shell, and bottom nav with
`env(safe-area-inset-*)` (0 on the web), and floors tap targets at 40px. `initMobile()`
(called once from `main.jsx`) sets a dark status-bar style for the light background.
