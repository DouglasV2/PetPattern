# WP1 — Species-rule consistency review

Reviewed every species rule set for consistency between **urgency tier**, **required history**,
**thresholds/windows**, and **displayed language**, after adding the immediate safety layer.

## Urgency tiers by species (after WP1)

| Species | URGENT (immediate) | WATCH / INFO (historical, ≥7 logs) | Urgent mechanism |
|---|---|---|---|
| DOG | `DOG_ACUTE_DISTRESS` (≥3 serious signs same day) | itching/stool/water/ear/food-trigger | structured fields |
| CAT | `CAT_URINARY_OBSTRUCTION_RISK` (straining + little/no urine) | appetite/water/litter/hiding/vomiting | structured fields |
| RABBIT | `RABBIT_GI_STASIS_RISK` (eat less + fewer droppings) | intake/dental/energy+hiding | StarterRule `within(7)` |
| GUINEA_PIG | `GUINEA_PIG_GI_STASIS_RISK` | weight/dental | StarterRule `within(7)` |
| HAMSTER | `HAMSTER_WET_TAIL_RISK` (watery droppings + low energy) | activity/weight/lump | StarterRule `within(7)` |
| BIRD | `BIRD_LABORED_BREATHING`, `BIRD_SICK_POSTURE` | feathers/quiet | StarterRule `within(7)` |
| REPTILE | **none — by design** | feeding-refusal/basking/thermal-context | brumation/fasting is normal |
| TURTLE | **none — by design** | (starter WATCH/INFO) | environment-driven |
| FISH_AQUARIUM | **none — by design** | spots/swimming/appetite/water-context | water-quality-driven |
| OTHER_SMALL_PET | **none** | (starter WATCH/INFO) | no vital-sign signal set |
| GENERIC (fallback) | **none** | REPEATED_OBSERVATION | species-neutral |

**Deliberate non-urgent species (medically cautious):** reptile feeding refusal (fasting/brumation
is normal), aquarium changes (dominated by water quality), and turtle are intentionally never
urgent. WP1 adds *no-false-urgency* tests for reptile and fish rather than fabricating urgency from
mild signals — consistent with the product's "medically cautious, never diagnostic" rule.

## Consistency confirmed

- **Urgent tier uniform:** every URGENT rule = `within(7)` freshness + `minDays 1` +
  `URGENT_CONFIDENCE` (MEDIUM on one co-occurrence, HIGH once it repeats) + `RuleCopy.urgent(...)`.
  Dog/cat (structured) match the same freshness + a near-latest-entry resolve gate via
  `ImmediateObservations`.
- **Watch/info tier uniform:** `WATCH_CONFIDENCE`/`CONTEXT_CONFIDENCE` + `RuleCopy.of(...)` +
  `UrgentCopy.watchBoundary()`.
- **Language uniform + non-diagnostic:** every urgent summary ends with
  `UrgentCopy.boundary()` ("This is not a diagnosis and PetPattern cannot tell you the cause.")
  and every urgent note ends with `UrgentCopy.vetHandoff(name)`. Internal condition names
  ("GI stasis", "wet tail", "urinary obstruction") live **only** in `ruleId`s, never in
  owner-facing copy — verified across all sets including the two new dog/cat rules.
- **Required history separation:** urgent signs are ungated (immediate layer); every recurrence /
  baseline-deviation / trigger claim still requires ≥7 check-ins (`PatternEngine`) and only those
  are persisted to `pattern_observations`.

## Behaviour to be aware of (intentional, documented)

At ≥7 check-ins an urgent starter rule can appear in **both** the immediate `immediateObservations`
list (Today "happening now" card) and, if it recurs, the historical `patterns` list (Patterns tab).
These are separate response fields with different meanings ("now" vs "over time") and are rendered
in distinct sections, so it reads as reinforcement, not contradiction.
