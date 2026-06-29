# PetPattern Architecture

PetPattern is a full-stack pilot for longitudinal dog health memory.

## Frontend

- React + Vite app in `frontend/`.
- Local dev port: `http://localhost:7317`.
- The app uses lightweight hash routes for:
  - `#today`
  - `#check-in`
  - `#food`
  - `#patterns`
- The first product screen is "Bella today", not a generic operational screen.

## Backend

- Spring Boot app in `backend/`.
- Local API port: `http://localhost:8317/api`.
- Main domain objects:
  - `Pet`
  - `DailyCheckIn`
  - `FoodLog`
- Main API endpoints:
  - `GET /api/pets`
  - `GET /api/pets/{petId}/overview`
  - `GET /api/pets/{petId}/check-ins`
  - `POST /api/pets/{petId}/check-ins`
  - `GET /api/pets/{petId}/check-ins/latest`
  - `GET /api/pets/{petId}/food-logs`
  - `POST /api/pets/{petId}/food-logs`
  - `GET /api/pets/{petId}/food-logs/current`
  - `GET /api/pets/{petId}/patterns`

## Database

- PostgreSQL via Docker Compose.
- Host port: `localhost:15437`.
- Internal Docker port: `5432`.
- Hibernate `ddl-auto: update` is used for the pilot.

## Deterministic Pattern Engine

The pattern engine lives in `com.petpattern.patterns`.

It is intentionally deterministic and rule based:

- `PatternEngine` coordinates the analysis.
- `BaselineCalculator` computes recent and historical comparison windows.
- `SymptomTrendAnalyzer` detects itching, stool, and water changes.
- `FoodExposureAnalyzer` checks repeated post-food exposure windows.
- `PatternExplanationBuilder` creates cautious, pet-owner-friendly explanations.

Current pattern types:

- `ITCHING_ABOVE_BASELINE`
- `STOOL_INSTABILITY`
- `WATER_DROP`
- `POSSIBLE_FOOD_TRIGGER`

## AI Position

AI is not the product in this sprint. The product value is structured longitudinal data and deterministic pattern detection. AI may be useful later as an extraction or explanation layer, but it should not replace the stored history or rule-based pattern engine.
