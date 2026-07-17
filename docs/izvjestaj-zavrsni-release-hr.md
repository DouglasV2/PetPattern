# PetPattern — Završni izvještaj release-polish sprinta

Ovo je izvještaj posljednjeg release-polish sprinta. Obrađene su isključivo konkretne stavke
pronađene neovisnim pregledom finalnog release ZIP-a (10 stavki niže). Nije rađen novi široki audit,
nisu dodavani novi featurei niti mijenjana arhitektura bez potrebe.

## Izvršni verdikt

**READY FOR WEB CLOSED BETA.**

Svi navedeni release blokatori su zatvoreni. Verifikacija koju ovo okruženje podržava je zelena:
frontend unit/integration testovi, Playwright E2E testovi, produkcijski build i dependency audit
prolaze lokalno; backend testovi i migracije potvrđuju se kroz CI (GitHub Actions) na push grane
`release/hardening`. Nativni runtime (stvarni Android/iOS uređaj) ostaje ručni korak jer u okruženju
nema Android SDK-a, Xcodea ni uređaja — to je jasno označeno i **ne** blokira web closed betu.

Bez numeričke ocjene, po eksplicitnom zahtjevu.

## Implementacija po stavkama

### 1. Native reminder lifecycle
- Na pokretanju native aplikacije i na svakom app resume, `ReminderControl` čita stvarni OS
  permission bez prompta (`checkPermissions`) — spremljeni podsjetnik se obnavlja nakon restarta,
  re-anchora se nakon promjene timezonea/DST-a, a povučeni permission izbacuje UI iz "on" stanja.
- Promjena vremena odmah reschedula; današnji check-in otkazuje samo današnju pojavu dok budući
  dnevni reminder ostaje aktivan; per-pet slotovi sprječavaju duplikate; scheduling error se
  prikazuje (nije tiho progutan).
- Notification tekst je neutralan i bez imena ljubimca: **"Would you like to save today's PetPattern
  check-in?"** (hrvatski preveden).
- Test simulira uključivanje → gašenje → ponovno pokretanje (permission i dalje granted) → obnovu
  schedulinga; te da današnji check-in anchora sutra dok dnevni reminder ostaje.

### 2. Secure native session storage
- Native bearer token se više ne sprema u localStorage. `lib/secureSession.js` ga drži u OS secure
  storeu (iOS Keychain / Android Keystore-backed encrypted storage) preko
  `capacitor-secure-storage-plugin`, dohvaćenog kroz runtime `Capacitor.Plugins` (web build i
  lockfile netaknuti).
- In-memory cache hidrira se jednom na startu (`initSecureSession`, prije prvog autentificiranog
  requesta). Postojeći localStorage token migrira se u secure storage jednom pa briše. Login sprema,
  logout / expired session (401) / brisanje računa uklanjaju. Na neuspjeh secure zapisa sesija ostaje
  samo u memoriji — nikad u localStorage i nikad u logovima. Web (HttpOnly cookie) nepromijenjen.
- Android: `android:allowBackup="false"` (+ `fullBackupContent="false"`) da session store nikad ne
  uđe u backup.
- Testovi: spremanje, čitanje/hidracija, migracija, logout, failure fallback.

### 3. Google login na nativeu
- Google gumb je web-redirect flow koji ne može vratiti native session, pa je **skriven na
  Androidu i iOS-u** (`AuthScreen`). Native korisnici zadržavaju email/password + reset lozinke; UI
  ne obećava Google na nativeu. Puni native OAuth je dokumentiran kao post-beta.

### 4. Deep links i mobile origin
- Android: custom scheme `petpattern://` intent filter (radi bez verifikacije domene) + `autoVerify`
  https App Links intent filter za password-reset/vet-share linkove. Dokumentiran `assetlinks.json`.
- iOS: `CFBundleURLTypes` (custom scheme) + `App.entitlements` s Associated Domains za Universal
  Links. Dokumentiran `apple-app-site-association`. Universal Link nije tvrđen kao verificiran bez
  stvarnog uređaja.
- CORS: `capacitor://localhost` i `https://localhost` dodani u dev allow-listu i dokumentirani u
  `.env.example`; eksplicitni origini, bez wildcarda s credentialsima.

### 5. Android notification resource
- Dodan stvarni monochrome `ic_stat_icon` (vector drawable) u `drawable/`; referenciran iz
  `capacitor.config.json` i `nativeNotifications.js` — nema više missing-resource reference.

### 6. Analytics wiring
- `PATTERN_VIEWED` se više ne bilježi na automatski patterns LIST poziv (loadPetData); bilježi se
  samo na eksplicitno otvaranje konkretnog patterna (timeline endpoint). Test dokazuje da list
  endpoint ne bilježi, a timeline endpoint bilježi jednom.
- Dodani stvarni call siteovi za `WEEKLY_OVERVIEW_VIEWED` i `PHOTO_TIMELINE_USED`.
- Platform attribution: server-side eventi više ne hardkodiraju "web". Per-request `ClientContext`
  (iz `X-PetPattern-Platform` / `X-PetPattern-App-Version` headera) nosi stvarnu platformu,
  validiranu allow-listom (web/android/ios). App version validiran na version-shape, fallback
  "unknown" (ne null). Novi mobile korisnik završava u mobile cohorti.
- Reporting: direktno izračunate step konverzije (registration→pet→onboarding→first→third→seventh
  check-in), median/average time-to-first-checkin/weekly-overview/pattern, reminder open rate,
  notification-to-check-in konverzija, platform i date (registracijski dan) cohorti. Čiste,
  unit-testirane metode.

### 7. Immediate vs historical urgent rules
- `StarterRuleEngine.run` (persistirajući povijesni prolaz) sada preskače `Severity.URGENT` pravila.
  Jedan urgent zapis više ne postaje spremljeni recurring pattern samo zato što ljubimac ima 7 starih
  normalnih check-inova. Immediate sloj i dalje reagira odmah; povijesni pattern traži stvarno
  ponavljanje kroz generic REPEATED_OBSERVATION prolaz. Nema duplih poruka, immediate ID-evi stabilni,
  jezik nedijagnostički.
- Test: 7 normalnih + 1 urgent → immediate postoji, persistirani recurring pattern ne postoji.

### 8. Minimalni browser E2E release suite
- Mali, stabilan Playwright suite (`frontend/e2e/`) pokriva: onboarding → pet → prvi check-in;
  "same as usual" i changed-day check-in; otvaranje changes/patterns prikaza; vet-share read-only
  dostupan bez sesije; caregiver/auth granicu (401 bez sesije); potvrdu brisanja računa; lazy-loaded
  navigaciju na mobile viewportu. Ne ovisi o Google OAuthu ni produkcijskim secretima.
- Jedna naredba: `npm run test:e2e` (browser: `npm run test:e2e:install`). Svih 7 flowova prolazi
  lokalno protiv pokrenutog stacka.

### 9. Dokumentacija i finalni snapshot
- README očišćen: uklonjen trailing NUL-byte / duplicirani naslov (re-encode UTF-8) i reference na
  interne tasks.md / memory.md; dodan tests odjeljak. README, RELEASE_NOTES, product.md i
  architecture.md usklađeni sa stvarnom podrškom — 10 vrsta (psi i mačke puni, 8 dodatnih starter),
  ne "samo psi + mačke". Arhivska higijena: stray `*;C` artefakti obrisani i gitignorirani.
- Ovaj izvještaj je uključen u arhivu.

### 10. Završna verifikacija
- Vidi "Izvršene provjere" niže. Novi release ZIP generiran je iz POSLJEDNJEG commitanog HEAD-a
  grane `release/hardening` preko `ops/make-release.sh` (git archive od HEAD-a + secret/hygiene skener).

## Izvršene provjere

| Provjera | Naredba | Rezultat |
|---|---|---|
| Clean install | `cd frontend && npm ci` | lockfile u sinkronizaciji (Playwright dodan kao devDep) |
| Frontend unit/integration | `cd frontend && npx vitest run` | **110 testova, prolaz** (17 datoteka) |
| Playwright E2E | `cd frontend && npm run test:e2e` | **7 flowova, prolaz** (protiv pokrenutog stacka) |
| Frontend build | `cd frontend && npm run build` | **prolaz** (initial index ~187 kB / gzip ~54 kB) |
| Dependency audit (prod) | `npm audit --omit=dev --audit-level=high` | **0 ranjivosti** |
| Backend testovi | `cd backend && ./mvnw --batch-mode clean test` | potvrđuje se kroz CI (vidi niže) |
| Migracije (Flyway V1..V15) | `docker compose up postgres backend` | potvrđuje se kroz CI |
| Mobile build / Capacitor sync | `npm run build:mobile && npx cap sync` | ručni native korak (nema toolchaina ovdje) |
| Archive hygiene | `bash ops/make-release.sh` | secret + prohibited-path skener (fail-closed) |

## CI status

CI (GitHub Actions, `.github/workflows/ci.yml`) je **ZELEN** na finalnom kodu (commit `3f0d382`).
Sva četiri posla su prošla: frontend (testovi/build/audit), backend (Maven wrapper `clean test` —
autoritativna potvrda backend testova koje ovo okruženje ne može pokrenuti zbog zasićenog Docker
daemona), migracije (clean boot Flyway V1..V15), release-hygiene (secret + prohibited-path gate).

Napomena o procesu: prvi CI run je otkrio dvije stvarne greške ovog sprinta — vitest je skupljao
Playwright `e2e` spec, a WP7 promjena je slomila per-species testove koji su hitna pravila provjeravali
kroz `evaluate()`. Oboje je popravljeno (vitest ograničen na `src/`; hitni testovi provjeravaju kroz
`immediateObservations()`) i CI je potom zelen.

## Native verification status

- Backend logika i native kod su implementirani i pregledani; native runtime **nije** pokrenut na
  uređaju/emulatoru jer okruženje nema Android SDK, macOS/Xcode ni uređaj.
- Ručni koraci prije native beta izdanja: `npm i capacitor-secure-storage-plugin
  @capacitor/local-notifications @capacitor/app @capacitor/status-bar`, `npm run cap:sync`, build
  APK/IPA, provjera Keychain/Keystore round-tripa, isporuka podataka notifikacije, App Links /
  Universal Link verifikacija sa stvarnom domenom (`assetlinks.json` / `apple-app-site-association`).

## Post-beta backlog

- Puni native Google OAuth (system-browser/ASWebAuthenticationSession + Custom Tabs handoff).
- Dodatni E2E scenariji i dodatna accessibility automatizacija.
- Daljnja optimizacija bundlea.
- App Store / Play Store polish i on-device native verifikacija.

## Finalni verdikt

**READY FOR WEB CLOSED BETA.** Svi navedeni release blokatori su zatvoreni, lokalna verifikacija
(frontend testovi/E2E/build/audit) je zelena, a CI (uključujući backend testove i migracije) je zelen
na finalnom kodu. Web closed-beta izdanje je spremno; daljnji polishing se zaustavlja.
