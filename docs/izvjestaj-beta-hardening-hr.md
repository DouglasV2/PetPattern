# PetPattern — izvještaj o pripremi za beta (beta hardening)

**Grana:** `feature/beta-hardening` (odvojena od `main@f3fcac4`) · **nije spojena, nije pushana, `main` je netaknut**
**Redoslijed faza (traženo):** 5 → 3 → 2 → 1 → 6 → 4 → finalni izvještaj
**Datum:** 16. srpnja 2026.

> Napomena o iskrenosti: ništa u tablici statusa nije označeno kao ZAVRŠENO ako nije i **implementirano i testirano**. Ono što se u ovom okruženju ne može provjeriti (nativni mobilni buildovi) izričito je označeno kao DJELOMIČNO.

---

## 1. Sažetak

Ovo je nastavak šestofaznog "senior-engineer beta + mobile hardening" zadatka. U ranijim chatovima završene su faze 5 (razdvajanje frontend monolita), 3 (pojednostavljenje ekrana "Danas") i 2 (isplativost prvog tjedna), plus audit i sigurnosni preflight. U ovoj sjednici implementirane su i verificirane **Faza 1** (pravila po vrstama + hitni sloj), **Faza 6** (privatna analitika + retencija) i **Faza 4** (mobilni temelj + obavijesti).

Rezultat: backend testni paket **147 testova zeleno**, frontend **65 testova zeleno**, sve tri nove faze verificirane uživo od kraja do kraja. Grana je stabilna i spremna za preuzimanje/deploy uz ručne korake iz odjeljka 14.

## 2. Grana i commitovi (ova sjednica)

| Commit | Faza | Opis |
|---|---|---|
| `b5bce63` | Faza 1 | Pravila po vrstama preko `SpeciesRuleSet` registra + hitni sloj (Severity) |
| `d7bc231` | Faza 6 | Interna privatna analitika + D1/D7/D30 retencija |
| `d5ac987` | Faza 4 | Capacitor nativni temelj + testirana logika podsjetnika |

Ranije na grani (prethodni chatovi): audit + sigurnosni preflight (`5a94312`), Faza 5, Faza 3, Faza 2 (`700851a` i raniji).

## 3. Faza 1 — dublja logika obrazaca po vrstama

- **Arhitektura:** `if/else` po vrsti u `PatternEngine` zamijenjen je **`SpeciesRuleSet` registrom** (Spring skuplja sve `@Component`-e u `Map<Species, SpeciesRuleSet>`; nova vrsta = jedan novi component, bez ijedne izmjene motora).
- **Pas/mačka:** `DogRuleSet`/`CatRuleSet` su tanki adapteri nad postojećim analizatorima — **bajt-identičan** izlaz i isti pattern id-jevi (regresija za psa provjerena uživo, čisto).
- **8 starter vrsta** dobiva pravila građena **isključivo iz signala koje ta vrsta stvarno bilježi** (`speciesProfiles.js`): zec/zamorac GI-staza, hrčak "wet-tail", ptica disanje + posturalni znak (URGENT), plus pravila za unos/izlučivanje/tjelesno stanje/ponašanje/okoliš (WATCH/INFO). Očuvan generički `REPEATED_OBSERVATION` za neupotrijebljene ključeve.
- **Hitni sloj:** novi ortogonalni `Severity{INFO,WATCH,URGENT}`. URGENT se pali **samo** iz jasne, prebrojive **istodobne (isti dan) pojave dvaju signala** koje je vlasnik zabilježio, pripete na zadnjih ~7 dana ("događa li se sada" je istinito) — nikad iz zaključivanja i **nikad ne imenuje stanje** u tekstu za vlasnika (interni nazivi žive samo u `ruleId`-jevima).
- **Površine:** severity + urgentNote na `PatternResponse`, `InsightService` ("urgent"), vremenskoj crti (hitni baner + razina događaja) i "HITNI ZNAKOVI" bloku u vet sažetku; severity vodi sortiranje motora.
- **Ispravci nametnuti kodom:** kornjača ne bilježi temperaturu/vlagu → njezino kontekstualno pravilo koristi `water_enclosure`; pravila se podudaraju s točnim vrijednostima koje pravi UI (potvrđeno u `StarterGuidedFields.jsx`), a demo-seed za zeca ispravljen je na te iste vrijednosti + memorija prevezana na bogatije pravilo.

## 4. Faza 6 — privatna analitika + retencija

- **Cilj:** dotad je analitika bila samo frontend-beacon bez pohrane → **D1/D7/D30 nemjerljivi**. Sada postoji interna pohrana bez treće strane i **bez pohranjenog identiteta**.
- **Pseudonim:** svaki red ključan je jednosmjernim `SHA-256(ownerId + salt)` — nikad id ni email; stabilan po vlasniku (retencija radi), ali nepovratan bez id-a i tajne soli.
- **Što se sprema:** pseudonim, dopušteni tip događaja, UTC vrijeme + dan, platforma (web/android/ios), verzija aplikacije, verzija sheme i mala **dopuštena kategorijska meta** (samo `species`/`mode`); imena, bilješke, simptomi, emailovi i slobodan tekst se **odbacuju**.
- **Točke bilježenja (server-side, pouzdano):** registracija, dodavanje ljubimca, dnevni unos, pregled obrazaca, pregled vet sažetka, izvoz, brisanje računa. `POST /api/analytics/events` (autenticirano) prima klijentske/mobilne događaje označene platformom.
- **Izvještaj:** `GET /api/analytics/report` — funnel + **vremenski ispravna D1/D7/D30 retencija** (UTC kohorta po danu prvog viđenja; broje se samo dovoljno stare kohorte). **Admin-zaštita:** 404 bez tokena, 403 uz krivi `X-Analytics-Token`; agregat, bez pseudonima/identiteta u odgovoru.
- **Bilježenje nikad ne ruši zahtjev** (fail-safe), no-op kad je isključeno ili korisnik nije prijavljen.
- Pravila privatnosti (EN+HR) i `docs/observability.md` dopunjeni da to iskreno navedu.

## 5. Faza 4 — mobilni temelj (Capacitor) + obavijesti

Iz stanja "samo dependencije" u pravi nativni temelj: **konfiguracija + dokumentacija + testirana logika**, iskreno označeno verified/generated (nema uređaja/emulatora ovdje).
- **Testirano (verified):** `reminderSchedule.js` — čista, vremenski ispravna logika odluke (`shouldRemind` + `nextReminderAt` + neutralni `reminderBody`), pokrivena unit testovima. `reminders.js` prebačen na nju (ispravlja stari UTC/lokalni miks za de-duplikaciju).
- **Generirano (ne pokreće se ovdje):** `capacitor.config.json`; `nativeNotifications.js` (opt-in dnevna lokalna obavijest preko runtime `Capacitor.Plugins` globala — bez nove npm ovisnosti, lockfile netaknut; neutralan tekst na zaključanom ekranu, nikad ne okida kad je isključeno/bez dopuštenja/već zabilježeno); `mobile.js` (deep-link za `#reset=`/`#shared=` + statusna traka).
- **Već postojalo (verified):** `VITE_API_BASE` + `X-Session-Token` mobilna autentikacija; CSS za safe-area/urez/ciljeve dodira.
- Google prijava ostaje web-redirect tok (dokumentirano). `docs/mobile.md` sadrži korake buildanja i tablicu verified/generated.

## 6. Ranije faze (prethodni chatovi, na grani)

- **Faza 5:** `App.jsx` 5819→1207, `styles.css` u 28 uređenih partiala (bajt-identičan CSS bundle), novi `lib/`/`components/`/`features/`; dodan Vitest. Bez promjene ponašanja.
- **Faza 3:** ekran "Danas" pojednostavljen na jedan uvid + sklopivi ostatak.
- **Faza 2:** iskrene prekretnice vezane uz stvarne pragove motora (`MilestoneCalculator` + `PatternMemoryProgress`).

## 7. Testiranje i verifikacija

- **Backend:** `docker compose build backend` (pokreće `mvn clean package`, cijeli paket) → **147 testova, 0 grešaka**. Novi testovi: SignalWindow, Rabbit/Hamster/Bird RuleSet, StarterRules, PatternResponseSeverity, CatSymptomAnalyzer, FoodExposureAnalyzer, Analytics(Service/Report/EventType).
- **Frontend:** `npm run build` zeleno; `npm test` (Vitest) → **65 testova zeleno** (uklj. novih 8 za `reminderSchedule`).
- **Uživo (curl + preglednik):**
  - Zec "Poppy": hitni GI-staza obrazac vodi na "Danas" → listu obrazaca → **hitni baner na vremenskoj crti** → "HITNI ZNAKOVI" u vet sažetku, na EN i HR. Regresija za psa (Bella) čista.
  - Analitika: V14 se primjenjuje, svih 7 funnel događaja se bilježi, ingest 202/400/401, izvještaj 403/JSON, oblik retencije ispravan, **nema PII-a u izvještaju**.
- **Adversarijalni pregled (8 lensi, Faza 1/6/4, find → verify):** 12 potvrđenih nalaza (1 HIGH), 1 opovrgnut (jednosignalni URGENT za pticu je namjeran izuzetak za vitalni znak). Svi potvrđeni ispravljeni (commit `99235cb`) i verificirani: HIGH bug u `StarterRuleEngine` (ključ se preuzimao prije provjere je li pravilo okinulo → gubitak ponavljajućeg signala u uskom prozoru; + regresijski test); hamster lump samo visible_change; analitika (UTC retencija, ingest odbija milestone događaje, `appVersion` validiran da ne bude PII sink); pravila privatnosti (zadržavanje nakon brisanja + `species`); nativni `#reset=` deep-link; HR "fekalije"→"kuglice izmeta".

## 8. Migracije baze

- Najnovija migracija: **V14** (`V14__analytics_events.sql`) — tablica `analytics_event` + dva indeksa; bez enum-CHECK-a na `type` (validacija u aplikaciji, kao pouka iz `PatternObservation.type`).
- **Upgrade-path (postojeći volumen):** V14 se primjenjuje na V1–V13 (potvrđeno uživo tijekom verifikacije Faze 6).
- **Fresh-install (čisti volumen):** `docker compose down -v` + `up --build` → **14 migracija (V1–V14) primijenjeno od nule**, aplikacija se diže zdrava (~1s). Provjereno da na čistoj instalaciji rade: Faza 1 (hitni obrazac zeca), Faza 6 (registracija + analitički izvještaj) i frontend (200).

## 9. Sigurnost i privatnost

- Analitika bez identiteta (pseudonim, bez id-a/emaila); izvještaj admin-zaštićen i agregatni.
- Ingest je autenticiran (401 bez sesije); nepoznat tip → 400; usporedba admin-tokena je konstantnog vremena.
- Nema novih ovisnosti u web buildu (nativni pluginovi preko runtime globala) → lockfile i `npm ci` netaknuti.
- Preostalo iz ranijeg preflighta: rotirati Google OAuth client secret ako je `.env` možda napustio stroj (vidi odjeljak 14).

## 10. Medicinska sigurnost teksta

- Sav tekst za vlasnika je **ne-dijagnostički**; hitni sloj **nikad ne imenuje stanje** ("wet tail"/"GI staza" žive samo u internim `ruleId`-jevima).
- URGENT se pali samo iz prebrojive istodobne pojave (bez zaključivanja), iza praga od ≥7 unosa, pripet na zadnjih ~7 dana.
- Kvržica/oteklina (mistap) ima uvjetni tekst ("ako raste ili se mijenja").

## 11. Hrvatski jezik (i18n)

- ~60 novih HR nizova za Fazu 1 (`Copy.java`) + 6 novih UI nizova (`hr.js`) za urgent baner i mobilni podsjetnik.
- Držana pravila stila: prirodan, rodno neutralan hrvatski, bez deklinacije imena ljubimca (`{0}` se ispušta i rečenica preslaguje), ne-dijagnostički idiom.
- Verificirano uživo: hitni obrazac i vet blok potpuno na hrvatskom, bez fallbacka na engleski.

## 12. Konfiguracija (nove env varijable)

| Varijabla | Zadano | Značenje |
|---|---|---|
| `PETPATTERN_ANALYTICS_ENABLED` | `true` | Glavni prekidač bilježenja analitike. |
| `PETPATTERN_ANALYTICS_REF_SALT` | dev placeholder | Sol za jednosmjerni pseudonim. Postaviti jaku vrijednost u prod; promjena resetira povijest retencije. |
| `PETPATTERN_ANALYTICS_ADMIN_TOKEN` | prazno | Token za izvještaj (`X-Analytics-Token`). Prazno = izvještaj isključen (404). |

Provedeno kroz `docker-compose.yml` (dev, s fiksnim dev tokenom radi testiranja), `docker-compose.prod.yml` (sol obavezna, token iz env-a) i `.env.example`.

## 13. Naredbe (build / run / verify)

```bash
# Puni stack (portovi 127.0.0.1:7317 frontend, :8317 backend, :15437 pg)
docker compose up -d --build

# Samo backend (mvn clean package + cijeli testni paket)
docker compose build backend

# Frontend
cd frontend && npm run build && npm test

# Autenticirani E2E bez UI prijave
curl -c jar -X POST http://127.0.0.1:8317/api/dev/seed-rabbit   # vraća Poppy (zec) + sesiju
curl -b jar http://127.0.0.1:8317/api/pets/<id>/patterns

# Analitika (izvještaj, dev token)
curl -H "X-Analytics-Token: dev-analytics-token" http://127.0.0.1:8317/api/analytics/report
```

## 14. Ručni koraci za operatera

1. **Grana:** `feature/beta-hardening` nije spojena ni pushana; spojiti/pushati po želji nakon pregleda.
2. **Rotirati Google OAuth client secret** u `.env` ako je ta datoteka mogla napustiti stroj (gitignorirana, nikad u git povijesti, ali ime foldera sugerira kopiju).
3. **Analitika u prod:** postaviti jak `PETPATTERN_ANALYTICS_REF_SALT` i (za izvještaj) `PETPATTERN_ANALYTICS_ADMIN_TOKEN`.
4. **Nativni mobilni buildovi:** trebaju Android Studio / Xcode; slijediti `docs/mobile.md` (instalirati plugine, `VITE_API_BASE`, `npx cap add/sync/open`). U ovom okruženju nisu producirani.
5. Za App/Universal Links (da reset email otvara aplikaciju) konfigurirati `assetlinks.json` / `apple-app-site-association`.

## 15. Poznati nedostaci / follow-ups

- Adversarijalni pregled (8 lensi, Faza 1/6/4) je dovršen; svih 12 potvrđenih nalaza ispravljeno (commit `99235cb`). Dva svjesno NISU mijenjana: nisko "on the same day, on more than one day" (gramatički ispravno; lockstep izmjena HR ključeva ne isplati se uz rizik fallbacka na engleski) i pred-postojeći manjak HR ključeva za visible-change nizove (nije uvedeno ovim diffom — zaseban i18n zadatak).
- Retencija je mjerljiva čim postoji višednevni podatak; svježa demo-instalacija prikazuje kohorte 0 za D1/D7/D30 (točno ponašanje, dokazano unit testom).
- Naslijeđeni frontend beacon (`analytics.js` prema `VITE_ANALYTICS_URL`) ostaje kao zaseban, opcionalan sink.
- Nativni mobilni buildovi nisu provjerljivi ovdje (nema uređaja).

## 16. Tablica statusa

| Stavka | Status | Napomena |
|---|---|---|
| Faza 5 — razdvajanje monolita | ZAVRŠENO | ranije, na grani |
| Faza 3 — Danas | ZAVRŠENO | ranije, na grani |
| Faza 2 — isplativost 1. tjedna | ZAVRŠENO | ranije, na grani |
| Faza 1 — pravila po vrstama + hitni sloj | ZAVRŠENO | 147 backend testova + uživo EN/HR + regresija psa |
| Faza 6 — analitika + retencija | ZAVRŠENO | uživo funnel/ingest/izvještaj + unit-testirana retencija |
| Faza 4 — mobilni temelj + obavijesti | DJELOMIČNO | logika testirana; nativni buildovi nisu provjerljivi (nema uređaja) |
| Migracije od nule (V1–V14) | ZAVRŠENO | 14 migracija primijenjeno na čistom volumenu; sve faze rade |
| Adversarijalni pregled (Faza 1/6/4, 8 lensi) | ZAVRŠENO | 12 nalaza ispravljeno (1 HIGH), 1 opovrgnut; commit `99235cb` |

**Zaključak:** **PASS za beta.** Sve implementirane faze su i testirane (backend **147** / frontend **65** testova zeleno, verifikacija uživo EN+HR, čista instalacija od nule prolazi), a osamostavni adversarijalni pregled (8 lensi) dovršen je s 12 ispravljenih nalaza. Jedina DJELOMIČNA stavka su nativni mobilni buildovi — isključivo iz okolišnog razloga (nema uređaja/emulatora; isporučeni su konfiguracija, dokumentacija i testirana logika). Grana `feature/beta-hardening` je stabilna, bootabilna od nule i spremna za preuzimanje/deploy uz ručne korake iz odjeljka 14.
