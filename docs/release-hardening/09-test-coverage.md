# WP8 — User-flow test coverage

## Approach (honest scoping)
Full browser E2E (Playwright driving a seeded running stack) was **not** added: the prompt says add
Playwright "only if justified and maintainable", and within this sprint the critical flows are more
maintainably covered by (a) the backend unit suite that owns the business rules + authorization, and
(b) frontend integration/component tests that drive real user interactions with the actual
components. Real browser E2E is a documented follow-up (commands below). Where a flow is only
partially covered, it is marked PARTIAL.

## Flow → coverage matrix
| # | Flow | Covered by | Status |
|---|---|---|---|
| 1 | Registration / login | `AuthScreen.test.jsx` (login submit, register gating, forgot), backend `AuthServiceTest` | ✅ |
| 2 | Onboarding + pet creation | backend `PetController` (PET_CREATED/ONBOARDING), `AnalyticsRecordingTest` | PARTIAL (UI via component) |
| 3 | First "same as usual" check-in | `TodayDecisionActions.test.jsx`, App `quickLog` analytics, `AnalyticsRecordingTest` milestones | ✅ |
| 4 | Changed-day check-in | `TodayDecisionActions.test.jsx` (Something changed), App `saveCheckIn` | ✅ |
| 5 | Third / seventh milestone | `AnalyticsRecordingTest` (threshold + idempotency), `AnalyticsEventTypeTest` | ✅ |
| 6 | Today confirmation + progress | `TodayView.test.jsx`, `PatternMemoryProgress.test.jsx` | ✅ |
| 7 | Immediate urgent before 7 logs | `ImmediateObservationServiceTest` (15), `ImmediateObservationCard.test.jsx` | ✅ |
| 8 | Historical pattern after enough history | `ImmediateObservationServiceTest.historicalLayerStaysBlocked…`, species rule tests | ✅ |
| 9 | Photo timeline | `PhotosView` component; backend photo endpoints | PARTIAL (E2E follow-up) |
| 10 | Vet summary generation | backend `VetSummaryServiceTest`, VET_SUMMARY_GENERATED wiring | ✅ |
| 11 | Read-only vet share | backend `SharedVetController` / `VetShareController`, `SharedVetView` | PARTIAL |
| 12 | Caregiver invite + authz boundary | backend `CaregiverController` + `PetAccess` ownership, CAREGIVER_INVITED | PARTIAL |
| 13 | Food change | backend `FoodTrialServiceTest`, `FoodExposureAnalyzerTest`; `FoodView` component | ✅ |
| 14 | Reminder preference | `reminderSchedule.test.js`, `nativeNotifications.test.js` (16 tests) | ✅ |
| 15 | Account data export | backend `AccountController` (DATA_EXPORT_REQUESTED) + `ExportService` | ✅ |
| 16 | Account deletion | backend `AccountServiceTest`; UI double-`window.confirm` (AccountView) | PARTIAL (UI via manual/E2E) |
| 17 | Unauthorized access to another pet | backend `PetAccess` (requireOwnedPet in every pet controller), `ImmediateObservationServiceTest.…noLeak` | ✅ |
| 18 | Analytics admin authorization | `AnalyticsControllerTest` (404 no-token / 403 bad-token / 200 valid) | ✅ |
| 19 | Empty / error / offline | api `NetworkError` (WP4), `ChunkErrorBoundary`, analytics empty-dataset test | ✅ |
| 20 | Primary mobile viewport | `capacitor.css` safe-area, `mobile.test.js` back-button | PARTIAL (device E2E blocked) |

Frontend: **97 tests / 15 files**. Backend: **179 tests / 30 files**.

## Exact commands
```bash
# Frontend unit + integration (component/flow) tests
cd frontend && npm test                 # vitest run  (or: npx vitest run)
cd frontend && npx vitest                # watch mode

# Backend tests (no global Maven needed — uses the wrapper)
cd backend && ./mvnw clean test
# or, containerized (this repo's normal path — no local JDK/Maven):
docker run --rm -v "$PWD/backend":/app -v petpattern_m2:/root/.m2 -w /app \
  maven:3.9.9-eclipse-temurin-21 mvn clean test

# Production build (also a gate)
cd frontend && npm ci && npm run build

# Dependency audit gate
cd frontend && npm audit --omit=dev      # production deps

# Release archive + hygiene gate
ops/make-release.sh

# End-to-end (NOT YET SET UP — documented follow-up):
#   cd frontend && npm i -D @playwright/test && npx playwright install
#   npx playwright test              # headless
#   npx playwright test --headed     # headed
# E2E must run against a seeded stack (docker compose up --build) and must not
# depend on production secrets or a real OAuth provider (use a test/mock session).

# Complete CI-equivalent verification locally
cd frontend && npm ci && npx vitest run && npm run build && npm audit --omit=dev
cd backend && ./mvnw clean test
ops/make-release.sh
```
