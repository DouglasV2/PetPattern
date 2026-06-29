# PetPattern Architecture

## Product principle

PetPattern is a longitudinal pattern system.

AI is not the product. The product is the structured memory, baseline model, deterministic pattern engine, and owner/vet workflow built around months of pet-specific history.

## High-level architecture

```text
React frontend
  ↓ REST API
Spring Boot backend
  ↓ JPA
PostgreSQL
  ↓
Structured longitudinal pet dataset
  ↓
Deterministic pattern engine
  ↓
Owner-facing pattern cards + vet-ready reports
  ↓
Optional AI summarization layer
```

## Current pilot modules

### Frontend

Path: `frontend/`

Responsibilities:

- pet profile onboarding
- “Bella today” daily check-in UI
- food change logging
- timeline display
- pattern card display
- human, calm, non-SaaS UX

### Backend

Path: `backend/`

Responsibilities:

- persist pets, check-ins, food logs
- expose REST API
- calculate deterministic insights
- seed demo data

### Database

PostgreSQL stores:

- pets
- daily check-ins
- food logs

Future tables:

- medications
- weight measurements
- symptom events
- vet visits
- vet documents
- insight snapshots
- owner feedback on insight accuracy

## Domain model

### Pet

A persistent profile for one animal.

Important fields:

- name
- species
- breed
- birth date
- sex
- current weight

### DailyCheckIn

One daily structured health record.

Important fields:

- stool score
- itching score
- energy score
- appetite score
- sleep quality
- water intake
- vomiting
- diarrhea
- ear redness
- notes

### FoodLog

A structured food exposure event.

Important fields:

- brand
- recipe name
- primary protein
- amount
- is new food
- date

## Pattern engine v1

Path:

```text
backend/src/main/java/com/petpattern/pattern/InsightService.java
```

Current deterministic insights:

1. Itching above personal baseline
2. Water intake lower than personal baseline
3. Stool instability trend
4. Possible food-protein association
5. Baseline-building state when data is insufficient

## Why deterministic first

Deterministic logic gives:

- explainability
- safety
- repeatability
- lower cost
- easier debugging
- clearer medical boundaries

AI should later help with:

- summarizing history
- turning structured logs into vet-readable text
- extracting structure from vet documents
- explaining insights in plain language

AI should not independently diagnose or invent correlations.

## API overview

### Pets

```http
GET /api/pets
POST /api/pets
```

### Check-ins

```http
GET /api/pets/{petId}/checkins
POST /api/pets/{petId}/checkins
```

### Food logs

```http
GET /api/pets/{petId}/food-logs
POST /api/pets/{petId}/food-logs
```

### Insights

```http
GET /api/pets/{petId}/insights
```

### Demo seed

```http
POST /api/dev/seed
```

## Data moat direction

The defensible dataset is not generic pet Q&A.

The moat is:

- individual pet baseline data
- food exposure timelines
- symptom lag windows
- breed-level longitudinal changes
- owner-confirmed pattern usefulness
- vet outcome feedback
- cross-pet anonymized trend models

After scale, PetPattern can know things competitors cannot copy quickly:

- which patterns commonly precede flare-ups
- how specific breeds respond to food transitions
- which symptom combinations predict owner vet visits
- how long certain reactions usually take to normalize
- what “normal” looks like for different ages, breeds and conditions

## Future defensibility layers

1. Personal baseline lock-in
2. Vet report workflow
3. Owner feedback loop
4. Structured food/ingredient dataset
5. Optional wearable integrations
6. Vet clinic partner portal
7. Insurance/prevention partnerships

## Safety boundaries

PetPattern should say:

- “This changed compared to Bella’s usual baseline.”
- “This pattern appeared in your logs.”
- “Bring this summary to your vet.”

PetPattern should not say:

- “Bella has an allergy.”
- “This food caused the disease.”
- “Do not visit the vet.”
- “Give this medication.”

## Deployment direction

Simple first deployment:

- Frontend: Vercel or Netlify
- Backend: Railway/Fly.io/Render
- Database: managed PostgreSQL

Later:

- object storage for photos/documents
- queue for report generation
- analytics events
- AI audit table
- clinic portal
