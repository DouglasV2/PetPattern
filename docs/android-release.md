# Android / Google Play release runbook

How to build, sign and ship the PetPattern Android app, and — just as important — what has and has
**not** actually been verified.

The app is a Capacitor 8 wrapper around the React web app. There is no separate mobile codebase:
`npm run build:mobile` produces `frontend/dist`, and `npx cap sync android` copies it into
`frontend/android/app/src/main/assets/public`.

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | 20+ | 24 used here |
| JDK | **21** | `capacitor.build.gradle` sets source/target 21 |
| Android SDK | platform **36**, build-tools **36.0.0** | `compileSdk`/`targetSdk` are 36 |
| Gradle | 8.14.3 | via the committed wrapper — do not install globally |
| Android Gradle Plugin | 8.13.0 | `android/build.gradle` |

Android Studio is not required to *build* (the wrapper + SDK command-line tools are enough), but it
is required to comfortably **run on a device/emulator**, which is the part that still needs a human.

---

## 2. Build

```bash
cd frontend
npm ci

# Web bundle for native. VITE_API_BASE MUST be your real, public, https API origin.
# A preflight (scripts/check-mobile-env.mjs) fails the build on a missing/placeholder/http value,
# and on anything secret-shaped — every VITE_* value is inlined and public.
VITE_API_BASE=https://api.yourdomain.com/api npm run build:mobile

npx cap sync android
```

### Debug APK

```bash
cd frontend/android
./gradlew :app:assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk
```

### Release AAB (what you upload)

```bash
cd frontend/android
./gradlew :app:bundleRelease \
  -PappVersionCode=1 -PappVersionName=1.0.0 \
  -PappLinksHost=app.yourdomain.com
# -> app/build/outputs/bundle/release/app-release.aab
```

`appVersionCode` / `appVersionName` are the only two release identity values and live in
`android/variables.gradle`. **`versionCode` must strictly increase on every upload** or Play rejects
the AAB. Pass them on the command line (above) or edit `variables.gradle`.

---

## 3. Signing

Nothing secret is committed: `*.jks`, `*.keystore`, `*.p12`, `key.properties` and `google-services.json`
are all gitignored, and `ops/make-release.sh` fails closed if any of them is ever tracked.

**Create the upload keystore once** (keep it and its passwords safe — losing it means you can no
longer update the app unless you are enrolled in Play App Signing with a reset option):

```bash
keytool -genkeypair -v \
  -keystore petpattern-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias petpattern-upload
```

**Point the build at it** — create `frontend/android/key.properties` (untracked):

```properties
storeFile=/absolute/path/to/petpattern-upload.jks
storePassword=…
keyAlias=petpattern-upload
keyPassword=…
```

`app/build.gradle` picks this up automatically. If the file is **absent**, the release build still
succeeds but is **unsigned** — deliberate, so CI and fresh clones work; Play will reject an unsigned
AAB, which is the loud failure you want rather than a silently debug-signed upload.

**Use Play App Signing** (recommended): Play holds the app signing key; your `.jks` is only the
*upload* key, so a lost upload key can be reset by Google.

Verify what you built:

```bash
# signature present?
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab | head
# or, with bundletool:
bundletool validate --bundle=app-release.aab
```

---

## 4. App Links (`https://` deep links)

Password-reset and vet-share links are hash routes (`#reset=<token>`, `#shared=<token>`).

Two entry points exist:

- **`petpattern://` custom scheme** — always works, no domain verification. This is the beta path.
- **`https://<your-domain>` App Links** — opens the app directly from an email link. **Off by
  default**: the manifest host is a build placeholder that defaults to the reserved `.invalid` TLD
  with `autoVerify="false"`, so a default build never claims a domain it does not own.

To enable, build with `-PappLinksHost=app.yourdomain.com` **and** serve this at
`https://app.yourdomain.com/.well-known/assetlinks.json` (content-type `application/json`, no
redirect):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.petpattern.mobile",
    "sha256_cert_fingerprints": ["<SHA-256 of the signing cert>"]
  }
}]
```

Use the **Play App Signing** certificate fingerprint (Play Console → Setup → App signing), not your
upload key, or verification fails for installs from Play. Get a local fingerprint with:

```bash
keytool -list -v -keystore petpattern-upload.jks -alias petpattern-upload | grep SHA256
```

Verification can only be confirmed on a device:
`adb shell pm get-app-links app.petpattern.mobile` → should report `verified`.

---

## 5. Production backend configuration

Two settings break the app silently if wrong:

**API base** — the native app has no same-origin proxy. `VITE_API_BASE` must be the public https API
origin (enforced by the build preflight).

**CORS** — the Android WebView origin is `https://localhost` (because
`capacitor.config.json` sets `androidScheme: "https"`); iOS is `capacitor://localhost`. Both must be
in `PETPATTERN_CORS_ALLOWED_ORIGINS` or the backend answers every request with **403** while the web
app keeps working:

```
PETPATTERN_CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://localhost,capacitor://localhost
```

Explicit origins only — CORS runs with credentials, so `*` is not honoured. No browser can claim
`https://localhost`, so including it costs nothing.

---

## 6. Google Play Data safety — answers grounded in the code

| Question | Answer | Evidence |
|---|---|---|
| Does the app collect or share user data? | **Collects, does not share** | No third-party SDK receives user data |
| Account info: **email address** | Collected, required, for account management | `AuthController`, sign-up |
| Personal info: **name** | Collected, **optional** | Optional display name at sign-up |
| Health/fitness: **pet health notes, photos, check-ins** | Collected, required for the core feature | This is the product; owner-entered, about the pet |
| App activity / analytics | Collected, **pseudonymous** | `AnalyticsService` stores a one-way hashed `ref`, an allow-listed event type and at most a species/mode category. No name, email, notes, or health content |
| Crash logs | Collected **only if** `VITE_SENTRY_DSN` is configured | `main.jsx` initialises Sentry lazily; `sendDefaultPii: false`, and `beforeSend` strips request data, cookies, headers, and user email/username/IP |
| Advertising / marketing | **None** | No ad SDK, no tracking SDK, no advertising ID |
| Data encrypted in transit | **Yes** | https-only; the session cookie is `Secure` in prod |
| Can users request deletion? | **Yes** | In-app (Account → Delete my account) **and** the public page below |
| Data deletion URL | `https://<your-domain>/account-deletion.html` | `frontend/public/account-deletion.html` |

Declared permissions are minimal and each is justified:

| Permission | Why |
|---|---|
| `INTERNET` | The whole app is a WebView against the API |
| `POST_NOTIFICATIONS` | The opt-in daily check-in reminder (runtime-requested on Android 13+) |
| `RECEIVE_BOOT_COMPLETED` *(merged from the notifications plugin)* | Re-registers the daily reminder after a reboot |
| `WAKE_LOCK` *(merged)* | Plugin-internal, to complete notification delivery |

No camera, storage, media, location, contacts, or `QUERY_ALL_PACKAGES`. Photo attachment uses the
WebView file chooser, which needs no permission.

**Exact alarms:** `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` are deliberately **not** declared. A
daily habit reminder is not an alarm-clock/calendar app, so that permission would not be
policy-compliant. The reminder is scheduled as a cron-style daily trigger and the plugin falls back
to an inexact alarm when exact alarms are not permitted — so **delivery time is approximate**, and
the UI says "around your chosen time" rather than promising a minute.

---

## 7. Play Console release checklist

- [ ] **App bundle**: signed AAB from `bundleRelease`, `versionCode` increased.
- [ ] **Play App Signing**: enrolled; note the app-signing SHA-256 for `assetlinks.json`.
- [ ] **Package name**: `app.petpattern.mobile` — **final and permanent** once uploaded. Confirm
      before the first upload; it can never be changed for this listing.
- [ ] **Privacy policy URL**: public and reachable (the in-app policy is also at `/#privacy`).
- [ ] **Data deletion URL**: `https://<domain>/account-deletion.html`.
- [ ] **Data safety form**: fill in from §6.
- [ ] **Content rating** questionnaire: no violence/sexual/gambling content; a health-adjacent
      utility. Expect Everyone / PEGI 3.
- [ ] **Ads declaration**: **contains no ads**.
- [ ] **Target audience**: adults (pet owners); not directed at children.
- [ ] **Store listing**: icon 512×512, feature graphic 1024×500, ≥2 phone screenshots (plus 7"/10"
      tablet if you list tablets), short + full description. Keep the cautious wording — describe it
      as a record/notebook that helps you notice changes, **never** as diagnosing.
- [ ] **Reviewer access**: PetPattern requires an account, so provide test credentials in
      *App access* — either a demo account, or note that "Try dog demo" on the sign-in screen opens
      a fully seeded account with no sign-up (only if `PETPATTERN_DEMO_ENABLED=true` in the reviewed
      environment; it is **off** by default in `docker-compose.prod.yml`).
- [ ] **Internal testing** track first; then **closed testing** before production.
- [ ] **Crash-free launch check** on a real device: cold start, sign in, log a check-in.
- [ ] **Update test**: install the previous build, then upgrade over it — confirm the session
      survives and no data is lost.

---

## 8. What still needs a device / Play Console

None of the following can be verified from source or from a CI build, and must not be claimed until
someone runs them on real hardware:

1. **Session survives a cold restart** — Keychain/Keystore round-trip via
   `capacitor-secure-storage-plugin`. Check `secureSessionStatus()` reports `secure`, kill the app
   from recents, reopen, and confirm you are still signed in.
2. **Daily reminder actually fires**, once per day, at approximately the chosen time — including
   after a reboot, and after a timezone/DST change.
3. **Notification permission denied / later revoked** in system settings leaves the toggle off.
4. **Deep links** when the app is closed and when already running (`petpattern://`, and App Links if
   a real domain is configured).
5. **Android back button** through the whole navigation stack, and exiting from the root.
6. **Keyboard** does not cover the check-in inputs on a short screen.
7. **Photo picker** (WebView file chooser) opens and uploads.
8. **Share / copy** the vet summary, and **export** account data.
9. **Offline and lost-connection** states show the graceful message, not a raw stack.
10. **Light and dark system themes**: icon, adaptive icon, notification icon, splash, status bar.
11. **16 KB page size** compatibility on a 16 KB device/emulator image (Android 15+ requirement for
    apps with native code — see the AAB inspection notes in the release report).
