# Release-Hardening Sprint — Clean Baseline

Recorded at sprint start, on branch `release/hardening` (cut from `main` @ `4ae33bb`
after fast-forwarding `main` to `feature/beta-hardening` and pushing to `origin/main`).

## Repository / branch
- Working branch: `release/hardening`
- `main` == `origin/main` == `4ae33bb` (pushed this sprint; was `f3fcac4`)
- Remote: `github.com/DouglasV2/PetPattern.git` (push succeeded)

## Tooling available in this environment
| Tool | Version | Notes |
|------|---------|-------|
| node | v24.13.0 | frontend fully workable |
| npm | 11.7.0 | |
| docker | 29.4.3 | backend build/test path |
| java (local) | ABSENT | backend only via Docker |
| mvn (local) | ABSENT | backend only via Docker |
| gradle (local) | ABSENT | Android build blocked |
| Android SDK / ANDROID_HOME | UNSET | APK build blocked by environment |
| Platform | win32 | iOS/Xcode build blocked by environment |

## Frontend baseline
- `npx vitest run`: **65 tests, 10 files, all pass**.
- `npx vite build` (vite 5.4.21): **1 JS chunk `index-*.js` = 752.84 kB (gzip 201.95 kB)**,
  CSS `index-*.css` = 57.66 kB (gzip 11.53 kB), index.html 0.74 kB. Built in ~4.09s.
  - No code splitting → single monolithic chunk (WP7 target).
- `npm audit`: **2 vulnerabilities — 1 moderate + 1 high**, both the esbuild `<=0.24.2`
  dev-server advisory (GHSA-67mh-4wv8-2f99) via `vite <=6.4.2`. **Dev-only** (dev server),
  not a production-runtime vulnerability. Fix path = Vite major bump (WP7).

## Backend baseline
- Docker: `maven:3.9.9-eclipse-temurin-21 mvn clean test`.
- **Results: Tests run: 147, Failures: 0, Errors: 0, Skipped: 0. BUILD SUCCESS (37.2s).**
- Discovered `@Test` methods in source: **147** across **27** test files → discovered == executed.
  The prior report's "147" is accurate.
- Flyway migrations present: **V1–V14** (incl. V11 multi-species, V12 photo areas,
  V13 activity_log, V14 analytics_events). No Testcontainers/H2 → suite is pure unit tests
  (no live DB needed to run them; no integration/migration test coverage yet — WP6 gap).

## Mobile baseline
- `frontend/capacitor.config.json` present (appId `app.petpattern.mobile`, webDir `dist`,
  LocalNotifications + SplashScreen plugin config).
- Capacitor deps in package.json: `@capacitor/{core,cli,android,ios}` ^8.4.1.
- **No `frontend/android/` or `frontend/ios/` project directories.** → mobile is config-only (WP4 gap).
- Frontend already has `lib/nativeNotifications.js`, `lib/reminderSchedule.js`, `lib/reminders.js`,
  `lib/mobile.js`, `features/notifications/ReminderControl.jsx` (WP3 foundation exists).

## Backend build reproducibility baseline
- **No Maven wrapper** (`backend/mvnw`, `backend/mvnw.cmd`, `backend/.mvn/` all ABSENT). → WP6 gap.

## Repository / archive hygiene baseline (local working tree)
Untracked local cruft that must never ship in a release archive:
- `backend;C/` (empty, malformed accidental dir from a shell redirect)
- `frontend/package.json;C`, `frontend/package-lock.json;C` (malformed accidental files)
- `backups/` (gitignored)
- `.env` (untracked, gitignored) — contains **live Google OAuth client id/secret/redirect**.
- `.claude/` local assistant settings.
- `git status` on tracked files: **clean**.
- `.gitignore` already covers: `.env`, `*.env` (keep `.env.example`), `backups/`, `node_modules`,
  `target/`, `dist/`, `*.zip`, `*.jks/*.keystore/*.p12/*.pem/*.key`, `key.properties`,
  `google-services.json`, `GoogleService-Info.plist`, android/ios build outputs.

## Credentials flagged for manual rotation (Bruno)
- **Google OAuth client secret** (Google Cloud console) — present in local `.env`. Rotate if the
  `.env` was ever shared/committed/zipped. History audit pending (WP5). Never printed here.
