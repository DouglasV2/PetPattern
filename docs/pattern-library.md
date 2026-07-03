# PetPattern — Internal Pattern Library

> Internal engineering / product asset. **Not user-facing.** This document is the
> specification of PetPattern's species-specific pattern logic — the part that
> makes PetPattern harder to copy than a generic "ask an LLM about my pet" prompt.
> The moat is not a model; it's this: deterministic, species-aware,
> baseline-relative rules over a longitudinal log, framed so nothing ever reads as
> a diagnosis.
>
> Thesis: **ChatGPT answers questions. PetPattern remembers your pet.**
>
> Source of truth is the code, not this doc. Paths are relative to
> `backend/src/main/java/com/petpattern/`. Where this doc and the code disagree,
> the code wins — update this doc.

---

## 0. Engine-wide mechanics (applies to every pattern)

These gates are the spine. Every pattern below inherits them.

| Mechanic | Rule | Source |
|---|---|---|
| **Global gate** | Fewer than **7** check-ins in the window → `analyze()` returns nothing. No pattern of any kind can appear. | `PatternEngine.java:52-54` |
| **Lookback** | Only check-ins / food logs from `today − 120 days` are loaded. Older history is invisible. | `PatternEngine.java:48-50` |
| **Species routing** | `species == CAT` → cat analyzers only. Otherwise → dog analyzers only. A cat never runs dog rules and vice-versa. | `PatternEngine.java:57-71` |
| **"Recent"/"baseline" anchor** | Windows anchor on `latestDate = max(checkInDate)`, **not** `today`. A pet last logged 20 days ago still has a "recent 3 days" = its last 3 logged days. | `BaselineCalculator.java:15-21, 76-81` |
| **Confidence emitted** | Dog and cat rules emit **MEDIUM or HIGH only**. `LOW` exists in the enum but is never produced. | analyzers + `PatternConfidence.java` |
| **Ranking** | Sort by confidence desc (HIGH=3, MEDIUM=2), then `PatternType.name()` alphabetically. | `PatternEngine.java:73-85` |
| **Future dates** | Check-ins can't be future-dated (API guard, 1-day skew tolerance), so `latestDate` isn't skewed forward. | `CheckInController.java:55-61` |

### Confidence

`PatternConfidence` is a bare 3-value enum; the tier is **assigned by each analyzer** when it builds the `PatternCandidate`, and the cross-cutting layer only ranks/displays it (`PatternMemoryService.java:220-230`, `InsightService.java:67`, `VetSummaryService.java:310,439`).

### Lifecycle & memory (`PatternMemoryService`)

The engine is stateless; `PatternMemoryService` is the memory around it — *"it never invents a pattern, it only annotates and remembers what the engine already found."*

- **active** = the engine detects it **today** (`upsertDetection`, once per calendar day).
- **settled** = last detected within the last **30 days** (`FADE_WINDOW_DAYS = 30`) but not today. Still shown, marked as no-longer-current. (`:80-95`)
- **dropped off** = not detected for > 30 days → invisible, but the `PatternObservation` row persists.
- **owner status** = standing decision on a pattern (`watching` / `told the vet` / `resolved` / `not relevant`), idempotent on the pattern key; dismissed patterns are excluded from the Bella-today view so they never nag. (`setStatus`, `activePatterns` `:105-134`)
- Detection upserts catch `DataIntegrityViolationException` and retry as update, per-pattern (a race on one pattern never poisons the others). (`:143-172`)

### The "What changed?" timeline (`PatternTimelineService`)

Per pattern, a deterministic before-and-after story assembled from stored history. It emits an event **only when a signal shifts** (not a row per day):

- **Window** is per type, anchored on `latestDate`: food-trigger `[foodStart−5, min(foodStart+14, latest)]`; itching `latest−20`; stool `latest−16`; water-drop `latest−10`; ear `latest−16`; all cat patterns `latest−20`. (`:142-162`)
- **Event sources:** `FOOD_STARTED` (kind + protein + "new food"), `MEDICATION_STARTED/ENDED`, symptom transitions, owner `NOTE`, and a closing `PATTERN_DETECTED` marker. (`:94-135`)
- **Symptom transitions** (onset-only, dog-biased): itching crosses ≥5, stool becomes unstable, water becomes LOWER, ear-redness onset, vomiting onset. Appetite / litter box / urination / straining / hiding / higher-water produce **no** transition events — those cards lean on food/med events + the closing marker (and can render "not enough history yet"). (`:213-277`)
- Same-day ordering is causes-first: food → meds → symptoms → notes → marker. (`:424-435`)

### Medical-safe framing (enforced everywhere)

Every card summary, timeline explanation, and vet-summary line carries a non-diagnostic boundary — cat cards append `catBoundary()` = *"This is not a diagnosis, but it may be worth discussing with your vet."*; the timeline and vet summary carry *"PetPattern does not diagnose or replace veterinary care. This is a possible pattern from owner-reported logs, not a medical conclusion."* **No pattern names a disease, cause, allergy, or treatment.** This is a hard invariant — see §Wording rules at the end.

---

## 1. DOG patterns

Dogs run: `POSSIBLE_FOOD_TRIGGER`, `ITCHING_ABOVE_BASELINE`, `STOOL_INSTABILITY`, `WATER_DROP`, `RECURRING_EAR_REDNESS`. (There is **no** dog vomiting-cluster or dog appetite/energy pattern — see §3.)

### 1.1 POSSIBLE_FOOD_TRIGGER — "food change → scratching / stool"

1. **Name / enum:** "Possible {protein}-related pattern" — `POSSIBLE_FOOD_TRIGGER`. `FoodExposureAnalyzer.possibleFoodTrigger`.
2. **Species:** Dog.
3. **Signals in:** FoodLog `primaryProtein` + `dateStarted` (any `foodKind` — main/treat/supplement); check-in `itchingScore` and unstable-stool (`diarrhea` OR `stoolState∈{SOFT,DIARRHEA}` OR `stoolScore≤2`).
4. **Min activation:** ≥21 check-ins AND ≥2 food logs; protein grouped (excl. null/UNKNOWN/OTHER) with ≥2 logs; per exposure a post-window `[start+3, start+10]` with ≥2 check-ins; a window "worsens" if `(lift≥1.5 AND postAvg≥5.0)` OR `unstableStoolDays≥2`, where `lift = postAvg − beforeAvg` (before = `[start−10,start−1]`, else global avg). Fires only if best protein has **≥2 worsening exposures** (`repeatedWindows≥2`).
5. **Must NOT fire:** <21 check-ins / <2 food logs; no protein appears ≥2×; only one worsening window; itching rise that stays below 5.0; a single soft-stool day per window; OTHER/UNKNOWN-protein foods (invisible even if correlated).
6. **Confidence:** `avgLift = liftTotal/repeatedWindows`; ≥2.2 → HIGH, else MEDIUM.
7. **Evidence shown:** title "Possible {protein}-related pattern"; summary "More scratching or stool changes were logged after {protein}-based food or treats more than once. Not a diagnosis — could be worth raising with your vet."; bullets: food looked at, times it lined up, avg rise in scratching (+x/10), "We looked at days 3–10 after each change".
8. **"What changed?" events:** anchored on the related food log; FOOD_STARTED + med + itching/stool onset + notes in `[foodStart−5, foodStart+14]`.
9. **Vet summary:** main concern (if top) "Possible food-related pattern: more itching and stool changes were logged after certain foods. The owner would like to review this with a vet."; FOOD EXPOSURE HISTORY lists each change (date/label/kind/protein/new-food).
10. **Edge cases:** sparse → silent; future food date pushes the window past existing check-ins → that exposure skipped; `stoolScore≤2` overrides `stoolState=NORMAL`; an old flare that recovered still counts toward `repeatedWindows` (this pattern is recurrence-historical by design, not "currently active").
11. **Trigger dataset (chicken → scratching, HIGH):** ≥21 daily check-ins; food logs chicken 2026-06-01 (treat) and 2026-06-20 (main). Before each: itching ~2–3. In each `[+3,+10]` window: itching ~6. → 2 windows, avgLift ~3.8 ≥ 2.2 → HIGH. (Stool variant: put ≥2 SOFT/DIARRHEA days in each window instead.)

### 1.2 ITCHING_ABOVE_BASELINE — "scratching higher than usual"

1. **Enum:** `ITCHING_ABOVE_BASELINE`. `SymptomTrendAnalyzer.itchingAboveBaseline`.
2. **Species:** Dog. 3. **Signal:** `itchingScore` (0–10).
4. **Min activation:** recent = last 3 logged days; baseline = 30-day window ending 3 days before latest, and `baseline.size() ≥ 14`. **Adaptive threshold** = `max(1.8, min(stdDev, 3.0))` where stdDev is over *calm* baseline days only (score null or <5). Fire iff `lift = recentAvg − baselineAvg ≥ threshold` AND `recentAvg ≥ 5.0`.
5. **Must NOT fire:** <14 baseline days; `recentAvg < 5.0` (a jump on a low-itch dog is suppressed); rise smaller than this dog's own variability floor (1.8). An earlier flare inside baseline does not inflate the bar (calm-days-only stdDev — deliberate).
6. **Confidence:** `lift ≥ threshold + 1.2` → HIGH, else MEDIUM.
7. **Evidence:** "Scratching is higher than usual"; "Last 3 days: about {r}/10", "Usual lately: about {b}/10", "That's roughly +{lift} higher than usual".
8. **Events:** `latest−20…latest`, ITCHING_CHANGE onset + food/med/notes.
9. **Vet summary:** "Recurring scratching above {name}'s normal range that the owner wants to understand." + avg/peak in the check-in narrative.
10. **Edge cases:** <14 baseline → no-op even at 10/10; if the flare is only in baseline and recent is calm, lift is negative → no fire (correct).
11. **Trigger dataset:** ≥14 calm baseline days (itch 1–3, stdDev ~1 → threshold 1.8, baseline avg ~2.0); recent 3 days 6,7,6 → lift 4.3 ≥ 3.0 → HIGH.

### 1.3 STOOL_INSTABILITY — "stool less stable this week"

1. **Enum:** `STOOL_INSTABILITY`. `SymptomTrendAnalyzer.stoolInstability`. 2. **Species:** Dog.
3. **Signal:** per-day unstable = `diarrhea` OR `stoolState∈{SOFT,DIARRHEA}` OR `stoolScore≤2`.
4. **Min activation:** recent = last 7 logged days; fire iff `size ≥ 4` AND `unstableDays ≥ 2`.
5. **Must NOT fire:** <4 logged days in the week; a single soft day; NO_STOOL/UNKNOWN/NORMAL-with-score>2 are stable.
6. **Confidence:** `unstableDays ≥ 3` → HIGH, else MEDIUM.
7. **Evidence:** "Stool has been less stable this week"; "Recent days reviewed", "Soft stool or diarrhea days", "Worth comparing with recent food changes".
8. **Events:** `latest−16…latest` (reaches back to catch a food change); STOOL_CHANGE onset (alert if diarrhea, watch if softer).
9. **Vet summary:** "Recurring soft stool or diarrhea that the owner wants to review." + STOOL CHANGES counts.
10. **Edge cases:** `stoolState=NORMAL` + `stoolScore=1` counts as unstable; `diarrhea=true` overrides state; a flare >7 days ago recovers automatically (fixed last-7 window).
11. **Trigger dataset:** last 7 days include SOFT, `diarrhea=true`, `stoolScore=2` (3 unstable), ≥4 logged → HIGH.

### 1.4 WATER_DROP — "drinking less than usual" (dog)

1. **Enum:** `WATER_DROP`. `SymptomTrendAnalyzer.waterDrop`. 2. **Species:** Dog (cats use `WATER_CHANGE`).
3. **Signals:** categorical `WaterLevel`, and quantitative `waterIntakeMl`.
4. **Min activation:** fire if `≥2 LOWER days in the last 3`, **OR** a quantitative drop — recent avg ml vs 30-day baseline (skip last 3), requires `baseline.size()≥14`, `baselineAvg>0`, and `dropPercent ≥ 0.20` (20%).
5. **Must NOT fire:** <2 lower days and <20% ml drop; ml path needs ≥14 baseline days. Detects **decrease only** (a rise is not a dog pattern).
6. **Confidence:** `lowerDays ≥ 3` → HIGH, else MEDIUM.
7/8/9. Evidence/timeline/vet framing as "water lower than usual", non-diagnostic; timeline WATER_CHANGE onset event on LOWER.
10. **Known engine note (see §Beta):** in the ml-only branch the evidence day-count is `max(lowerDays, 2)`, which can render "2 lower-water days" when the trigger was actually an ml average drop — a cosmetic mismatch flagged for post-beta.
11. **Trigger dataset:** last 3 days water LOWER,LOWER,LOWER → HIGH; or recent avg 300 ml vs baseline 500 ml (−40%) with ≥14 baseline days.

### 1.5 RECURRING_EAR_REDNESS — "ear redness keeps coming back"

1. **Enum:** `RECURRING_EAR_REDNESS`. `SymptomTrendAnalyzer.recurringEarRedness`. 2. **Species:** Dog.
3. **Signal:** boolean `earRedness`. 4. **Min activation:** recent = last 14 logged days; fire iff `size ≥ 7` AND `earRednessDays ≥ 3`.
5. **Must NOT fire:** <7 logged days in 14; <3 red-ear days.
6. **Confidence:** `earRednessDays ≥ 5` → HIGH, else MEDIUM.
7. **Evidence:** "Ear redness keeps coming back"; "Days with red or irritated ears", "Sometimes lines up with food or seasonal changes".
8/9. Events `latest−16…latest`; vet "Recurring ear redness that the owner wants to review." No otitis/infection language.
10. **Edge cases:** red days scrolling out of the 14-day window stops it firing (auto-recovers). Single boolean → no contradictions.
11. **Trigger dataset:** ≥7 logged in last 14 days, ear-redness on 4 of them → MEDIUM (5th → HIGH).

---

## 2. CAT patterns

Cats run: `APPETITE_LOW`, `WATER_CHANGE`, `LITTER_BOX_CHANGE` (absorbs urination + straining), `HIDING_INCREASED`, `REPEATED_VOMITING`. Weight concern is **context only** (§2.6).

### 2.1 APPETITE_LOW — "appetite lower than usual"

1. **Enum:** `APPETITE_LOW`. `CatSymptomAnalyzer.appetiteLow`. 2. **Species:** Cat.
3. **Signal:** `appetiteLevel` (LOWER/NORMAL/HIGHER/REFUSED/UNKNOWN).
4. **Min activation:** recent = last 3 days; `lowerDays` = days LOWER or REFUSED; fire iff `lowerDays ≥ 2`.
5. **Must NOT fire:** <2 lower/refused days; NORMAL/HIGHER/UNKNOWN don't count.
6. **Confidence:** `lowerDays ≥ 3` OR any REFUSED day → HIGH, else MEDIUM.
7. **Evidence:** "Appetite lower than usual"; "Days appetite was lower or refused"; "A lower appetite in cats is worth watching".
8/9. Events `latest−20…latest` (appetite itself has no transition event); vet "…{name}'s appetite has been lower than usual, which the owner wants to review."
10. **Edge cases:** 2 logs in the 3-day window both LOWER → fires MEDIUM (window counts logged days); one REFUSED + one HIGHER → no fire.
11. **Trigger dataset:** …D8 LOWER, D9 REFUSED, D10 LOWER → HIGH.

### 2.2 WATER_CHANGE — "water intake changed from usual" (cat)

1. **Enum:** `WATER_CHANGE`. `CatSymptomAnalyzer.waterChange`. 2. **Species:** Cat (categorical only; never reads `waterIntakeMl`).
3. **Signal:** `waterLevel` (LOWER/NORMAL/HIGHER/UNKNOWN).
4. **Min activation:** recent = last 3 days; lower branch first — `lowerDays≥2` → fire (lower); else `higherDays≥2` → fire (higher). Detects **both directions**.
5. **Must NOT fire:** neither direction reaches 2; mixed 1+1.
6. **Confidence:** `changedDays ≥ 3` → HIGH, else MEDIUM.
7. **Evidence:** "Water intake changed from usual" (lower/higher); "Changes in a cat's water intake are worth keeping an eye on".
8/9. Timeline emits a water event only on **LOWER** onset (higher-water card has no matching symptom event); vet wellbeing narrates only lower water. Asymmetry is deliberate.
10. **Edge cases:** 3 HIGHER days → fires but no timeline water event; UNKNOWN ignored.
11. **Trigger dataset:** …D8–D10 LOWER → HIGH (lower).

### 2.3 LITTER_BOX_CHANGE — "litter box behavior changed" (+ urination + straining)

1. **Enum:** `LITTER_BOX_CHANGE`. `CatSymptomAnalyzer.litterBoxChange`. 2. **Species:** Cat. **This one pattern absorbs urination change and straining** — they are not separate types.
3. **Signals:** `litterBoxUse` (NORMAL/LESS/MORE/NONE/UNKNOWN), `urinationChange` (NORMAL/LESS/MORE/UNKNOWN), `straining` (boolean).
4. **Min activation:** recent = last 3 days. `changedDays` = days litter∈{LESS,MORE,NONE} OR urination∈{LESS,MORE}. Fire if **any** of: `changedDays≥2`, `strainingDays≥1`, `noneDays≥2`.
5. **Must NOT fire:** a single LESS/MORE/urination-change day with no straining and no repeated NONE (a cat skipping the box once is benign); a single NONE day alone.
6. **Confidence:** `strainingDays≥1` OR `noneDays≥2` → HIGH, else MEDIUM. `reported = max(changedDays, strainingDays, noneDays)`.
7. **Evidence:** "Litter box behavior changed recently" (+ " Straining was also noted on at least one day." if straining); "Litter box changes are worth mentioning to your vet".
8. **Vet summary:** dedicated CatSignals block "LITTER BOX & BEHAVIOR" over the full range (litter changed / none / urination changed / straining counts).
9. **Wording note:** straining/NONE is the **highest-acuity** cat sign (possible urethral obstruction) but is worded as softly as every other card — medically safe, and intentionally non-alarmist. See §Beta for a possible (non-diagnostic) "worth a prompt vet call" nudge.
10. **Edge cases:** straining once with everything else normal → HIGH (straining alone triggers, `reported=1`); NONE one day + MORE another → MEDIUM (changedDays≥2, but noneDays<2 and no strain).
11. **Trigger dataset:** …D8 litter LESS; D9 litter NONE + urination LESS + straining; D10 urination MORE → HIGH, reported=3, strainNote shown.

### 2.4 HIDING_INCREASED — "hiding more than usual"

1. **Enum:** `HIDING_INCREASED`. `CatSymptomAnalyzer.hidingIncreased`. 2. **Species:** Cat. **Standalone** — does not read appetite despite the "hiding + appetite" framing (appetite co-appears only as its own `APPETITE_LOW` card).
3. **Signal:** `hidingBehavior == MORE`. 4. **Min activation:** recent = last **5** days (wider than the 3-day cards); fire iff `moreDays ≥ 2`.
5. **Must NOT fire:** <2 MORE days; NORMAL/LESS/UNKNOWN don't count.
6. **Confidence:** `moreDays ≥ 3` → HIGH, else MEDIUM.
7. **Evidence:** "Hiding logged more than usual"; "More hiding in cats is worth watching".
8/9. Events `latest−20…latest` (no hiding transition event); vet "hid more than usual on {N days}"; main concern "…hiding more than usual, which the owner wants to review."
10. **Edge cases:** 5-day window means 2 hiding days with normal days between still fire; MORE→LESS→MORE = 2 → MEDIUM (LESS doesn't cancel).
11. **Trigger dataset:** last 5 days …MORE, NORMAL, MORE, MORE → HIGH.

### 2.5 REPEATED_VOMITING — "vomiting logged more than once" (cat)

1. **Enum:** `REPEATED_VOMITING`. `CatSymptomAnalyzer.repeatedVomiting`. 2. **Species:** Cat (the *card* is cat-only; dogs surface vomiting only descriptively).
3. **Signal:** boolean `vomiting`. 4. **Min activation:** recent = last **7** days (widest cat window); fire iff `vomitDays ≥ 2`.
5. **Must NOT fire:** a single vomit day (isolated vomiting is common/benign).
6. **Confidence:** `vomitDays ≥ 3` → HIGH, else MEDIUM.
7. **Evidence:** "Vomiting logged more than once"; "Worth bringing to your vet if it continues".
8/9. Timeline emits a vomiting onset event (`alert`); vet check-in summary "Vomiting was noted on {N days}."
10. **Edge cases:** cluster older than 7 days → no fire (unless a stale pet's latest logs anchor there); two vomit days 6 days apart still fit the window.
11. **Trigger dataset:** last 7 days: vomit on 3 of them → HIGH.

### 2.6 Weight concern — CONTEXT ONLY (not a pattern)

`weightConcern` has **no PatternType** and never activates a card. There is no "weight + appetite/water" composite rule; that combination surfaces only as the independent `APPETITE_LOW` / `WATER_CHANGE` cards plus a weight line in the vet summary CatSignals ("had a weight concern noted on {N days}"). Medical-safe — a restatement of the owner's own flag.

---

## 3. Not implemented (documented gaps, not bugs)

- **Dog vomiting cluster:** none. `REPEATED_VOMITING` is cat-gated. A dog's vomiting appears only in the timeline (if another dog pattern is active) and the vet summary count.
- **Dog appetite / energy drop:** none. `APPETITE_LOW` is cat-only; there is **no** energy-based pattern for any species (`energyLevel` feeds only the vet-summary wellbeing block).

These are the two rubrics most worth adding after beta (§Beta priorities).

---

## 4. Food trials (`FoodTrialService`) — the owner-run experiment

Turns a trial + logged history into a **before / during / after** comparison. "Reports what the numbers did; never claims a cause or a cure."

- **Windows:** baseline `[start−14, start−1]`; elimination `[start, reintroduced−1 | min(now,targetEnd)]`; reintroduction `[reintroduced, min(now, reintroduced+14)]` (null if not reintroduced).
- **Per window:** logged days, avg itching (`round1`), unstable-stool days.
- **Slips (integrity):** any food log in the elimination window whose primary/secondary protein == the target protein. `cleanRun = no slips`.
- **Verdict (medical-safe):** needs baseline & elimination each ≥3 logged days with an itching avg. `drop = baselineAvg − eliminationAvg`. Strong two-way signal (drop ≥2 during, and reintro ≥2 higher) → "Scratching eased while {food} was out, and was logged higher again after it came back. Worth raising with your vet." Weaker/none → hedged variants. Never "confirmed allergy".

---

## 5. Vet summary & 30-day recap framing

- **Vet summary** (`VetSummaryService`): owner-observed concern → recent check-in narrative → food exposure history → stool changes (dog) / litter-box & behavior (cat) → water/appetite/energy → possible patterns (as `[Confidence] title: summary`) → notes. Disclaimer on every render. Species-branched (stool block suppressed for cats; CatSignals block shown instead).
- **30-day recap** (`RecapService`): calmest stretch, food changes, photos, trials, active-pattern count, milestones. Pattern milestone framing: "Spotted a possible pattern → Worth keeping an eye on, and bringing to your vet." Never diagnostic.

---

## 6. Wording rules (the invariant that keeps this launch-safe)

Every pattern surface MUST:
- say **"possible pattern"**, never "diagnosis" / "confirmed" / "allergy" / "caused by".
- describe **what was logged** ("more scratching was logged after…"), never a mechanism.
- point to the vet as the decision-maker ("worth discussing with your vet"), never prescribe.
- carry the boundary line (`catBoundary()` / timeline / vet disclaimer).

Banned in any pattern string: *diagnose, treatment recommendation, therapy, rule out, confirmed allergy, symptoms indicate, medical conclusion, caused by.* Preferred: *possible pattern, worth watching, worth mentioning to your vet, based on your logs, owner-reported logs, was logged around the same time, changed around the same period.*

---

## 7. What's already covered (v0.1.0-beta engine)

- Dog: food-trigger (scratching **and** stool), itching-above-baseline, stool-instability, water-drop (categorical **and** ml), recurring ear redness. ✅
- Cat: appetite-low, water-change (both directions), litter-box (incl. urination + straining), hiding, repeated-vomiting; weight as context. ✅
- Adaptive itching threshold (per-dog variability floor). ✅
- Longitudinal memory: active/settled/dropped + owner status, per-day dedupe, race-safe. ✅
- Per-pattern "What changed?" timeline with causes-first ordering. ✅
- Food-trial before/during/after with slip detection. ✅
- Species-branched vet summary + recap. ✅
- Medical-safe wording invariant across all surfaces. ✅

## 8. Could improve after beta (only with real owner data)

1. **Dog vomiting cluster** + **dog appetite/energy drop** patterns (the two engine gaps) — validate thresholds on real logs first.
2. **Cat straining / litter-NONE**: consider a stronger (still non-diagnostic) "worth a prompt vet call" nudge for the one genuinely time-sensitive cat sign — tune with vet input.
3. **Timeline transition events for cat signals** (litter box, urination, straining, hiding, higher-water) so cat cards' timelines aren't food/med-only.
4. **Window anchoring**: revisit "recent = last logged days" vs "recent = last N calendar days" for dormant accounts (a re-engaged owner sees stale patterns as if current).
5. **WATER_DROP evidence count** (`max(lowerDays,2)` in the ml-only branch) — show the real driver (ml drop) instead of a possibly-fabricated day count.
6. **FoodExposure double-count**: overlapping exposure windows for the same protein can inflate `avgLift`; de-dupe check-ins before the lift math.
7. Confidence calibration once there's ground truth (owner "told my vet → it was X" feedback) — today confidence is heuristic (never LOW for dog/cat).

## 9. Most important rubrics for v0.1.0-beta

Rank order for "must be rock-solid at launch" (highest owner trust impact + highest medical sensitivity):

1. **Cat LITTER_BOX_CHANGE (straining / NONE)** — the one time-sensitive cat sign; must fire reliably and stay non-diagnostic.
2. **Cat REPEATED_VOMITING** and **Dog STOOL_INSTABILITY** — common, high-signal, easy to get the "don't over-fire on one bad day" threshold wrong.
3. **POSSIBLE_FOOD_TRIGGER** — the flagship "PetPattern remembers" moment; the ≥2-exposure requirement is what makes it credible, not noise.
4. **ITCHING_ABOVE_BASELINE** — the adaptive per-dog threshold is the clearest "not a generic app" differentiator; protect it.
5. Everything else (appetite, water, hiding, ear) — solid, lower stakes.

The moat is #3 + #4 + the memory layer: baseline-relative, multi-exposure, longitudinal, species-aware, and medically humble. A single LLM prompt can't reproduce that without the stored history and the deterministic guards.
