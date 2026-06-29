# PetPattern Tasks

## Sprint 1 - Bella Today Product Spine

- [x] Center the main product screen around "Bella today".
- [x] Show pet identity, current state, most important possible pattern, and next action in the first screen.
- [x] Add profile, today status, recent signals, current food, primary action, secondary action, and pattern teaser.
- [x] Add `/api/pets/{petId}/overview` with latest check-in, current food, and pattern candidates.

## Sprint 2 - Daily Check-In Flow

- [x] Add enum-backed daily check-in fields for stool, appetite, water, and energy.
- [x] Support `GET /api/pets/{petId}/check-ins`, `POST /api/pets/{petId}/check-ins`, and `GET /api/pets/{petId}/check-ins/latest`.
- [x] Keep legacy `/checkins` route working.
- [x] Build a quick tap "How was Bella today?" flow that returns to Bella today after save.

## Sprint 3 - Food And Trigger Tracking

- [x] Add food kind, date started, product name, primary protein, secondary proteins, grain-free, new food, and notes.
- [x] Support `GET /api/pets/{petId}/food-logs`, `POST /api/pets/{petId}/food-logs`, and `GET /api/pets/{petId}/food-logs/current`.
- [x] Build "What changed in Bella's food?" with protein and food-kind controls.
- [x] Surface the latest food event on Bella today.

## Sprint 4 - Pattern Engine V1

- [x] Add deterministic `com.petpattern.patterns` package.
- [x] Implement `PatternEngine`, `PatternCandidate`, `PatternType`, `PatternConfidence`, `BaselineCalculator`, `SymptomTrendAnalyzer`, `FoodExposureAnalyzer`, and `PatternExplanationBuilder`.
- [x] Implement itching above baseline, stool instability, water drop, and possible food trigger rules.
- [x] Support `GET /api/pets/{petId}/patterns`.
- [x] Show pattern cards and a pattern detail section in the frontend.

## Demo Data

- [x] Seed Bella as an adult Labrador mix.
- [x] Seed 45 days of daily check-ins.
- [x] Seed repeated chicken exposure periods and one main food.
- [x] Make demo data produce useful deterministic pattern cards.

## Quality Checks

- [x] `npm install`
- [x] `npm run build`
- [ ] `mvn clean package -DskipTests` - local Maven is not installed on PATH in this shell.
- [x] `docker compose up --build`
