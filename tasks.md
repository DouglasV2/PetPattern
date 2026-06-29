# PetPattern Tasks

## Product objective

Build the first version of a product that becomes more valuable the longer a pet owner uses it.

The MVP must prove one thing:

> Owners will repeatedly log small health signals because the product gives them meaningful, emotionally relevant pattern feedback over time.

## Non-negotiables

- Do not build a chatbot-first product.
- Do not claim diagnosis.
- Do not create fake certainty.
- Do not use generic AI SaaS UI language.
- Daily check-in must take under 20 seconds.
- Insights must be based on stored structured history.
- AI can summarize, but deterministic logic decides the core pattern candidates.

## Phase 1 — 3-month solo-dev MVP

### Week 1 — Repository and core entities

- [ ] Confirm local run for frontend/backend/Postgres.
- [ ] Add user auth.
- [ ] Add owner profile.
- [ ] Harden pet profile model.
- [ ] Add validation for log ranges.
- [ ] Add basic error states in UI.

### Week 2 — Daily check-in loop

- [ ] Improve check-in speed.
- [ ] Add yesterday reminder state.
- [ ] Add missed-day recovery UX.
- [ ] Add empty states that motivate baseline building.
- [ ] Add mobile-first check-in screen.

### Week 3 — Food and trigger tracking

- [ ] Improve food model: brand, recipe, protein, grain-free, treats, table scraps.
- [ ] Add food transition start/end.
- [ ] Add repeat food exposures.
- [ ] Add treat log.
- [ ] Add “what changed recently?” screen.

### Week 4 — Symptom timeline

- [ ] Add itching detail: paws, ears, belly, face, general.
- [ ] Add stool photo placeholder.
- [ ] Add vomiting/diarrhea events.
- [ ] Add ear redness and licking frequency.
- [ ] Add weight timeline.

### Week 5 — Pattern engine v1

- [ ] Baseline calculation: 7/30/90 day windows.
- [ ] Itching anomaly detection.
- [ ] Stool anomaly detection.
- [ ] Water-intake drop detection.
- [ ] Food exposure correlation with lag windows.
- [ ] Confidence scoring.
- [ ] Explain why each insight appeared.

### Week 6 — Vet-ready reports

- [ ] Generate 30-day summary endpoint.
- [ ] Add printable report view.
- [ ] Add CSV export.
- [ ] Add “questions for your vet” section.
- [ ] Add medical disclaimer and escalation copy.

### Week 7 — Retention loops

- [ ] Add daily streak carefully, without gamifying sickness.
- [ ] Add “baseline built” milestone.
- [ ] Add “pattern confidence increased” milestone.
- [ ] Add soft reminder copy.
- [ ] Add weekly digest.

### Week 8 — Trust and safety

- [ ] Add urgent-care copy for red flags.
- [ ] Add “call your vet” guidance without diagnosis.
- [ ] Add source-neutral language.
- [ ] Audit copy for unsafe certainty.
- [ ] Add owner consent language for data use.

### Week 9 — AI layer v1

- [ ] Use AI only to summarize structured logs into human-readable notes.
- [ ] Add AI-generated vet report narrative.
- [ ] Add AI extraction from typed vet notes.
- [ ] Add guardrails: never diagnose, never prescribe.
- [ ] Log every AI output for review.

### Week 10 — Monetization

- [ ] Free: one pet, basic logs, limited insight history.
- [ ] Plus: unlimited history, advanced patterns, reports.
- [ ] Add Stripe later.
- [ ] Add paywall only after product loop is validated.

### Week 11 — Beta onboarding

- [ ] Add landing page.
- [ ] Add founder-led onboarding flow.
- [ ] Add invitation code support.
- [ ] Add feedback collection.
- [ ] Add analytics events.

### Week 12 — Pilot launch

- [ ] Recruit 30 dog owners with recurring itching/stomach issues.
- [ ] Do weekly interviews.
- [ ] Track D1/D7/D30 retention.
- [ ] Track daily logging completion.
- [ ] Track whether owners show reports to vets.
- [ ] Decide if wedge is strong enough.

## Metrics that matter

- Daily check-in completion rate
- D7 retention
- D30 retention
- Number of logged days per active pet
- Number of meaningful pattern cards generated
- Percentage of users who say “this noticed something I missed”
- Percentage of users willing to pay after 30 days
- Number of vet report exports

## Kill criteria

Kill or pivot if:

- Users do not log after the first week.
- Users only want emergency answers.
- Pattern cards feel obvious or generic.
- Owners do not trust the product enough to bring it to a vet.
- The product feels like a prettier diary instead of compounding intelligence.

## Strongest initial customer segment

Dog owners who already feel pain:

- recurring itching
- recurring soft stool/diarrhea
- suspected food allergies
- repeated food switching
- multiple vet visits without clear pattern
- high emotional anxiety about missing early signs

Do not start with casual healthy-pet owners.
