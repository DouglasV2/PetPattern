# PetPattern — Završni izvještaj sprinta učvršćivanja za izdanje

**Grana:** `release/hardening` (odvojena od `main` @ `4ae33bb`, gurnuta na `origin`).
**Zadnji commit:** `bd18ca0`. **Datum:** 2026-07-17.

---

## 1. Izvršni verdikt

Sprint je isporučio svih 10 radnih paketa. Sve što se **može** verificirati u ovom okruženju je
verificirano i zeleno: backend 179 testova (0 padova), frontend 97 testova (0 padova), čista
produkcijska izgradnja, **0 ranjivosti** (`npm audit`), inicijalni JS smanjen **752,84 KB → 328,9 KB
(−56 %)**, čist i pregledan release ZIP bez tajni, te reproducibilan backend build bez globalnog
Mavena.

**Iskren verdikt: aplikacija NIJE "10/10 dokazano od kraja do kraja".** Razlog nisu propusti u kodu
nego granice okruženja: nativni Android/iOS **buildovi** i ponašanje **na stvarnom uređaju** ne mogu
se izvršiti ovdje (nema Android SDK-a, host je win32 bez macOS/Xcode), CI još nije izvršen u GitHub
Actions (pokreće se na sljedećem PR-u), a puni preglednički E2E je svjesno odgođen. **Release-blokeri**
(medicinska sigurnost WP1, sigurno pakiranje, reproducibilan backend, sigurnost ovisnosti, privatnost
analitike) su **DOVRŠENI i verificirani**.

**Preporuka:** zatvorena beta na **webu** je spremna; nativna mobilna beta čeka pravi build na
uređaju (naredbe su priložene); Google OAuth client secret treba ručno rotirati.

## 2. Polazno stanje (prije sprinta)

| Mjera | Vrijednost |
|---|---|
| Backend testovi | 147 (0 padova) |
| Frontend testovi | 65 (0 padova) |
| Inicijalni JS | 752,84 KB (jedan chunk), gzip 201,95 KB |
| `npm audit` | 2 (1 moderate, 1 high) — esbuild dev-server, samo razvojno |
| Migracije | V1–V14 |
| Maven wrapper | NEMA |
| Android/iOS projekt | NEMA (samo `capacitor.config.json`) |
| Higijena | untracked smeće: `backend;C`, `frontend/*.json;C`, `.env` (lokalno), `backups/` |

Detalji: `docs/release-hardening/00-baseline.md`.

## 3. Implementacija po radnim paketima (sažetak)

- **WP1** `5f9a69c`,`7e01c9c` — sloj hitnih opažanja odvojen od povijesnog sloja.
- **WP2** `575ffbb` — potpuni model od 23 događaja, idempotentne prekretnice, privatnost po događaju, atribucija platforme.
- **WP3** `92b0700` — ispravno ponašanje nativnih podsjetnika.
- **WP4** `c3d51ab` — generirani Android + iOS projekti, back-button, offline.
- **WP5** `332b671` — deterministički release + skeniranje tajni.
- **WP6** `795f40c` — Maven wrapper, 179 testova bez globalnog Mavena.
- **WP7** `334a666`,`0b7831a` — code-splitting + izbacivanje 14 lokala, Vite 5→7, audit 2→0.
- **WP8** `3c46c0b` — flow testovi + matrica pokrivenosti.
- **WP9** `c30a004` — focus trap, pristupačna imena, live regije, skip link.
- **WP10** `bd18ca0` — CI quality gate.

Svaki WP ima detaljan dokument u `docs/release-hardening/`.

## 4. Arhitektura hitnih opažanja (WP1)

Potvrđeno je da je premisa točna: `PatternEngine.analyze()` je vraćao praznu listu za `checkIns.size()
< 7`, čime je **potiskivao i HITNE znakove** do 7. prijave.

Rješenje razdvaja dva sloja:
- **Sloj A — neposredna sigurnost** (`ImmediateObservationService`, `ImmediateObservations`): evaluira
  **najnoviji relevantan unos BEZ vrata od 7 prijava**; pokreće samo pravila `Severity.URGENT`;
  rezultat je **efemeran** (izračunava se pri svakom čitanju, nikad se ne sprema u
  `pattern_observations`). Stabilni id `now:<petId>:<ruleId>`; sam se **razrješava/istječe** (prozor
  `within(7)` od danas + blizina zadnjeg unosa). Nedijagnostički tekst (`UrgentCopy.boundary()` +
  predaja veterinaru). Prikazan na "Danas" kao koraljna kartica u `role="status"` živoj regiji.
- **Sloj B — povijesno pamćenje** (`PatternEngine`): zadržava vrata `< 7` za ponavljanje, odstupanje
  od baze i moguće okidače; samo se ovo sprema.

Blago/dvosmisleno pojedinačno bilježenje nikad ne stvara hitnost (samo `URGENT` pravila hrane sloj A).
Bez unakrsnog curenja između ljubimaca (servis čita samo predane prijave; API sloj koristi
`requireOwnedPet`).

## 5. Pregled dosljednosti pravila po vrstama (WP1)

Dodana su hitna pravila za **psa** (`DOG_ACUTE_DISTRESS` — ≥3 ozbiljna znaka istog dana) i **mačku**
(`CAT_URINARY_OBSTRUCTION_RISK` — napinjanje uz malo/nimalo mokraće; prava mačja hitnost).
Zec/ptica/hrčak/zamorac koriste postojeća `URGENT` pravila. **Gmaz i akvarij namjerno nemaju hitni
sloj** (post/brumacija i kvaliteta vode su normalni pokretači) — medicinski oprezno, pokriveno
testovima "nema lažne hitnosti". Svi hitni tekstovi završavaju istom nedijagnostičkom granicom;
interna imena stanja žive samo u `ruleId`. Puni pregled: `docs/release-hardening/02-species-rule-consistency.md`.

## 6. Inventar analitičkih događaja (WP2)

Model sada ima svih **23 tražena događaja** (+ 2 zadržana legacy). Wire-imena zamrznuta radi DB
kompatibilnosti (npr. `ACCOUNT_REGISTERED` → `registered`). Puna tablica + gdje se okidaju:
`docs/release-hardening/03-analytics.md`. Ključno:
- Prekretnice (registracija, onboarding, 1./3./7. korisna prijava, prvi tjedni pregled, prvi uzorak,
  brisanje) su **once-per-ref** i dodatno zaštićene parcijalnim `UNIQUE(ref,type)` indeksom (**V15**).
- **Allow-lista metapodataka je PO DOGAĐAJU** (species/mode samo gdje ima smisla; podsjetnici bez
  ikakvog meta). PII i slobodan tekst se uvijek odbacuju.
- **Atribucija platforme** u izvještaju: aktivnost po platformi + D1/D7/D30 po platformi.
- Klijentski poznati događaji idu kroz `POST /api/analytics/events` koji odbija milestone/nepoznate tipove.

## 7. Definicije funnela i retencije (WP2)

- **Aktivan dan** = ref ima ≥1 događaj tog UTC dana.
- **Korisna prijava** = zaseban spremljen dan prijave (uređivanje istog dana ne broji ponovno).
- **D1/D7/D30** = kohortni dan je najraniji aktivni UTC dan; "zadržan" ako ima događaj točno N dana
  kasnije; broje se samo kohorte kojima je dan N u potpunosti protekao (in-progress kohorta ne obara
  stopu). Vremenske zone: server je `TZ=UTC`, izvještaj koristi `LocalDate.now(UTC)`.
- **Sprječavanje duplikata**: `exists(ref,type)` + atomski parcijalni UNIQUE indeks (V15).

Retencijska matematika (ukupna i po platformi) determinirano je testirana. Primjer izvještaja
(sintetički): `docs/release-hardening/03-analytics.md`.

## 8. Ponašanje podsjetnika (WP3)

Web put je bio ispravan; popravljeni su nativni nedostaci:
- **Ne okida se nakon prijave**: `firstReminderAt(time, now, loggedToday)` preskače današnji termin;
  efekt se re-sinkronizira na promjenu `loggedToday`.
- **Po ljubimcu** (`reminderNotificationId`) umjesto jednog globalnog id-a → nema sudara više ljubimaca.
- Uključuje se **samo ako je dopuštenje odobreno** (odbijeno = ostaje isključeno + jasna poruka).
- `syncNativeReminder` vraća status i **logira grešku** (nema tihog gutanja); gašenje otkazuje slot.
- Re-sinkronizacija na `resume` (vremenska zona/DST/restart); tap dubinski vodi na "Danas"; privatni
  analitički događaji podsjetnika + konverzija obavijest→prijava.
- **Iskreno:** nativno ponašanje je testirano samo JS jedinicama uz **lažni** plugin; isporuka na
  uređaju, dopuštenje, tap i DST **nisu verificirani na uređaju**. Detalji: `docs/release-hardening/04-reminders.md`.

## 9. Android verifikacija (WP4)

- `frontend/android/` je **generiran i commitan** (`npx cap add android` uspješan). `applicationId
  app.petpattern.mobile`, versionCode 1, versionName 1.0; 4 plugina detektirana; `POST_NOTIFICATIONS`
  u manifestu. Bez potpisnog materijala.
- **Gradle build / debug APK: BLOKIRANO OKRUŽENJEM** — nema Android SDK-a ni gradle-a. Naredbe za
  Bruna: `cd frontend/android && ./gradlew assembleDebug` → `app/build/outputs/apk/debug/app-debug.apk`.

## 10. iOS verifikacija (WP4)

- `frontend/ios/` je **generiran i commitan** (`npx cap add ios` uspješan, SPM/Package.swift — bez
  CocoaPods). `NSCamera/NSPhotoLibrary(+Add)UsageDescription` u `Info.plist`. Bez potpisnog materijala.
- **Xcode build/archive: BLOKIRANO OKRUŽENJEM** — host je win32, nema macOS/Xcode. Naredbe: `npx cap
  open ios` na Macu → postaviti tim za potpisivanje → Product > Archive.

## 11. Pakiranje i higijena tajni (WP5)

- `ops/make-release.sh` gradi iz **praćenog izvora** (`git archive HEAD`) → nemoguće je uključiti
  necommitane datoteke. **Fail-closed**: prekida na praćenoj tajni, na uzorku tajne u sadržaju arhive
  i na zabranjenoj putanji. Ispisuje **samo putanje, nikad vrijednosti**.
- `.gitattributes export-ignore` izbacuje dev datoteke (`.claude/`, `tasks.md`, `memory.md`, …).
- **Povijest git-a je čista** od tajni (nijedna tajna nikad nije commitana pa uklonjena) → prepisivanje
  povijesti NIJE potrebno. Runbook za rotaciju OAuth-a: `docs/release-hardening/06-release-packaging.md`.

## 12. Reproducibilnost backenda (WP6)

Dodan Maven wrapper (`mvnw`, `mvnw.cmd`, `.mvn/wrapper/…`, `only-script`, pinira Maven 3.9.9).
**Verificirano u JDK-only kontejneru bez Mavena**: `NO global mvn (good)` → wrapper podigne Maven →
`Tests run: 179, Failures: 0, Errors: 0, Skipped: 0, BUILD SUCCESS`. Usklađivanje: **179 `@Test`
metoda = 179 otkriveno = 179 izvršeno, 0 preskočeno**. Napomena: suite je trenutno samo jedinični (bez
`@SpringBootTest`/Testcontainers); validacija migracija ide kroz čisti boot (CI + `docker compose`).

## 13. Frontend sigurnost i performanse (WP7)

- **`npm audit`: 2 → 0.** Nadogradnja `vite ^5.4.21 → ^7.3.6` + `@vitejs/plugin-react ^4.3.4 → ^5.2.0`
  (esbuild 0.25+); build + svih 97 testova prolaze na Vite 7.
- **Inicijalni JS 752,84 KB → 328,9 KB (−56 %)**, gzip ~202 → ~100 KB; 1 → 17 chunkova. `React.lazy`
  za 12 sekundarnih pogleda (+ fallback + ErrorBoundary za zastarjeli chunk), Sentry lijeno/tree-shaken,
  te izbačenih **~440 KB** 14 nedostupnih lokala (samo `en`+`hr` su javni). Proračun performansi
  dokumentiran. Detalji: `docs/release-hardening/08-frontend-perf.md`.

## 14. Testna pokrivenost (WP8)

Backend **179** testova (30 datoteka), frontend **97** (15 datoteka). Dodani flow testovi
(prijava/registracija, "isto kao inače"/"nešto se promijenilo", zaključavanje "logirano danas").
Matrica 20 tokova → pokrivenost: `docs/release-hardening/09-test-coverage.md`. **E2E (Playwright)
svjesno odgođen** (tokovi pokriveni backend jedinicama + frontend integracijom); naredbe priložene.

## 15. Rezultati pristupačnosti (WP9)

Popravljeno: **focus trap** lightboxa (jedini modal) + vraćanje fokusa, pristupačna imena (prijava,
poziv skrbnika), hitni banneri `role="note"` → `role="status"`, **skip-to-content** link, najavljivanje
uspjeha (račun). Follow-up (iskreno): automatski axe, strojna provjera kontrasta, veličine dodirnih
meta. Detalji: `docs/release-hardening/10-accessibility.md`.

## 16. CI status (WP10)

`.github/workflows/ci.yml` (4 posla: frontend, backend-wrapper, migracije preko `docker compose` +
health, release-higijena). Pada na: pad testa/builda, slomljenu migraciju, high/critical prod
ranjivost, commitane tajne/zabranjene putanje. YAML **validiran**; sve naredbe verificirane lokalno,
ali **još nije izvršen u GitHub Actions** (pokreće se na sljedećem PR-u/pushu).

## 17. Točne test naredbe i izlazi

```
# Backend (bez globalnog Mavena):
cd backend && ./mvnw --batch-mode clean test
  → Tests run: 179, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS
# ili kontejnerski:
docker run --rm -v "$PWD/backend":/app -v petpattern_m2:/root/.m2 -w /app maven:3.9.9-eclipse-temurin-21 mvn clean test

# Frontend:
cd frontend && npm ci && npx vitest run
  → Test Files 15 passed (15) | Tests 97 passed (97)
```

## 18. Točne build naredbe i izlazi

```
cd frontend && npm run build
  → ✓ built in ~4.1s  (index 180,9 KB + react-vendor 138,5 KB + icons 9,5 KB + lazy chunkovi)
cd frontend && npm audit --omit=dev
  → found 0 vulnerabilities
ops/make-release.sh
  → release/petpattern-bd18ca0.zip (1,39 MB, 514 datoteka) — sve provjere PASS
```

## 19. Usporedba veličine bundlea

| | Prije | Poslije |
|---|---|---|
| Inicijalni JS | 752,84 KB | **328,9 KB** (−56 %) |
| Inicijalni JS (gzip) | ~201,95 KB | **~100 KB** |
| Najveći app chunk | 752,84 KB | 180,9 KB (+ react-vendor 138,5 KB) |
| Broj JS chunkova | 1 | 17 |
| Ukupni JS | 752,84 KB | ~383 KB |

## 20. Usporedba dependency audita

| | Prije | Poslije |
|---|---|---|
| `npm audit` | 2 (1 moderate, 1 high) — esbuild dev-server (samo razvojno) | **0** |
| `npm audit --omit=dev` | (isti izvor) | **0** |

## 21. Putanja release arhive i verifikacija

- **`release/petpattern-bd18ca0.zip`** — 1,39 MB (1.460.769 bajtova), **514 datoteka**.
- Skript: tracked-secret PASS, secret-pattern PASS, prohibited-path PASS.
- **Neovisna inspekcija ZIP-a**: zabranjene putanje (`.env`, node_modules, target, dist, backups,
  `.git`, `*;C`, `.claude`, keystore, `build/`, `Pods/`, `tasks.md`, `memory.md`) — **nema ih**; nativni
  projekti (`frontend/android/app/build.gradle`, `frontend/ios/App/App/Info.plist`) prisutni.

## 22. Preostale ručne radnje za Bruna

1. **Rotirati Google OAuth client secret** (Google Cloud Console) — bio je u lokalnom `.env`; runbook
   u `docs/release-hardening/06-release-packaging.md`. Rotirati i sve što je ikad dijeljeno:
   `POSTGRES_PASSWORD`, `SMTP_PASSWORD`, `PETPATTERN_ANALYTICS_ADMIN_TOKEN`, `SENTRY_DSN` po potrebi.
2. **Android build**: na stroju s Android SDK → `cd frontend/android && ./gradlew assembleDebug`.
3. **iOS build**: na Macu s Xcode → `npx cap open ios` → potpisni tim → Archive.
4. Postaviti pravi `VITE_API_BASE` u `frontend/.env.mobile` prije store builda.
5. Otvoriti PR `release/hardening` → `main` da CI stvarno odradi u Actions.
6. Za trgovine: generirati ikone/splash (`@capacitor/assets`, upute u `docs/release-hardening/05-mobile.md`),
   te hostati `assetlinks.json` / `apple-app-site-association` kad domena bude poznata.

## 23. Preostali rizici

- **Nativni buildovi i ponašanje na uređaju nisu verificirani** ovdje (okruženje). Kod i konfiguracija
  su spremni i jedinično testirani, ali isporuku obavijesti, dopuštenja, tap i DST treba potvrditi na uređaju.
- **CI nije izvršen u Actions** (validiran lokalno/YAML).
- **Puni preglednički E2E odgođen** — tokovi su pokriveni jedinicama/integracijom, ne pravim preglednikom.
- Backend suite je **samo jedinični**; DB-integracijski/migracijski test kao follow-up (CI ipak validira migracije boot-om).
- A11y: automatski axe i strojni kontrast nisu odrađeni (ručno provjereno).

## 24. Konačna preporuka za izdanje

**Web zatvorena beta: SPREMNO** uz rotaciju OAuth tajne. Svi release-blokeri i sve što je provjerljivo
u ovom okruženju su zeleni i dokazani stvarnim naredbama/artefaktima. **Nativna mobilna beta: uvjetno**
— tek nakon stvarnog Android/iOS builda (naredbe priložene) i kratke provjere na uređaju (podsjetnici,
kamera, back-button, deep-link). Nije "10/10 dokazano od kraja do kraja" isključivo zbog granica
okruženja i svjesno odgođenog E2E-a — a ne zbog nedovršenog koda.

---

## Status tablica

| WP | Status | Napomena |
|---|---|---|
| WP1 Hitna opažanja | **COMPLETE** | Implementirano + 15 testova, regresija zelena |
| WP2 Analitika/retencija | **COMPLETE** | 23 događaja, idempotentne prekretnice, po-događaju privatnost, platforma, authz; +17 testova |
| WP3 Podsjetnici | **PARTIALLY COMPLETE** | Kod + 16 JS testova gotovo; **na uređaju BLOKIRANO okruženjem** |
| WP4 Mobilno | **PARTIALLY COMPLETE / BLOCKED** | Projekti generirani+commitani, kod-rupe zatvorene; **buildovi BLOKIRANI okruženjem** |
| WP5 Pakiranje | **COMPLETE** | Deterministički ZIP, skeniranje tajni, higijenska vrata, verificirano |
| WP6 Maven wrapper | **COMPLETE** | 179 testova bez globalnog Mavena, verificirano |
| WP7 Deps/performanse | **COMPLETE** | audit 2→0, inicijalni JS −56 % |
| WP8 Testovi tokova | **PARTIALLY COMPLETE** | Komponentni/integracijski flow testovi; **puni E2E odgođen** |
| WP9 Pristupačnost | **COMPLETE** | Označeni nedostaci popravljeni; axe/kontrast follow-up |
| WP10 CI | **COMPLETE** | Workflow napisan+validiran; **još nije izvršen u Actions** |

### Objašnjenja za PARTIAL/BLOCKED
- **WP3 (na uređaju)**: nedostaje verifikacija na stvarnom uređaju/emulatoru — okruženje nema uređaj.
  Kod je gotov i jedinično testiran. Sljedeći korak: build (WP4 naredbe) + kratka provjera podsjetnika. Izvršitelj: Bruno.
- **WP4 (buildovi)**: nedostaje izvršeni Android/iOS build — nema Android SDK / macOS-Xcode. Ograničenje
  okruženja, ne koda. Sljedeći korak: `./gradlew assembleDebug` / Xcode Archive. Izvršitelj: Bruno.
- **WP8 (E2E)**: nedostaje preglednički E2E (Playwright) — svjesna odluka o opsegu (održivost). Sljedeći
  korak: dodati Playwright uz seedani stack (naredbe u `09-test-coverage.md`). Izvršitelj: Bruno/tim.
- **WP10 (izvršenje)**: nedostaje pokretanje u Actions — pokreće se na sljedećem PR-u. Kôd/YAML validirani.

## Ključni podaci

- **Grana:** `release/hardening` (na `origin`).
- **Commiti (13):** `d826ce6, 5f9a69c, 7e01c9c, 575ffbb, 92b0700, c3d51ab, 332b671, 795f40c, 334a666,
  0b7831a, 3c46c0b, c30a004, bd18ca0`.
- **Migracije (nove):** `V15__analytics_milestone_unique.sql` (ukupno V1–V15).
- **Backend testovi:** 179 otkriveno / 179 izvršeno / 0 preskočeno (30 datoteka).
- **Frontend testovi:** 97 (15 datoteka). **E2E:** 0 (odgođeno).
- **`npm audit`:** 0 ranjivosti (prod i sve).
- **Bundle:** inicijalno 328,9 KB (ukupno ~383 KB / 17 chunkova); baseline 752,84 KB.
- **Android artefakt:** nije izgrađen (BLOKIRANO); ciljna putanja `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
- **Release ZIP:** `release/petpattern-bd18ca0.zip` (1,39 MB, 514 datoteka).
- **Kredencijali za rotaciju:** Google OAuth **client secret** (Google Cloud). Po potrebi: Postgres
  lozinka, SMTP lozinka, analytics admin token, Sentry DSN.
- **Nikad ne commitati:** `.env` (bilo koji pravi), `*.jks/*.keystore/*.p12/*.pem/*.key`,
  `key.properties`, `google-services.json`, `GoogleService-Info.plist`, iOS provisioning, `node_modules/`,
  `backend/target/`, `frontend/dist/`, `backups/`, lokalne baze/logove, `.idea/`/`.vscode/`,
  `.claude/settings.local.json`, `*;C` smeće.
