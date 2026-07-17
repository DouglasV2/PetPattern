# WP2 — Product analytics & retention

Privacy-safe, internal product analytics: activation funnel + D1/D7/D30 retention + platform
attribution. Builds on the existing solid foundation (pseudonymous ref, UTC, schema version,
fail-safe recording); this sprint completed the event vocabulary, made milestones idempotent,
moved the metadata allow-list to per-event, and added platform attribution.

## Event inventory (23 requested + 2 retained legacy)

| Event (enum) | wire | once/ref | meta keys |
|---|---|---|---|
| ACCOUNT_REGISTERED | registered | ✔ | — |
| ONBOARDING_COMPLETED | onboarding_completed | ✔ | species |
| PET_CREATED | pet_created | | species |
| FIRST_CHECKIN_COMPLETED | first_checkin_completed | ✔ | species |
| SAME_AS_USUAL_CHECKIN_COMPLETED | same_as_usual_checkin | | species |
| CHANGED_DAY_CHECKIN_COMPLETED | changed_day_checkin | | species |
| THIRD_USEFUL_CHECKIN_REACHED | third_useful_checkin | ✔ | species |
| SEVENTH_USEFUL_CHECKIN_REACHED | seventh_useful_checkin | ✔ | species |
| FIRST_WEEKLY_OVERVIEW_AVAILABLE | first_weekly_overview | ✔ | species |
| WEEKLY_OVERVIEW_VIEWED | weekly_overview_viewed | | species |
| FIRST_PATTERN_GENERATED | first_pattern_generated | ✔ | species |
| PATTERN_VIEWED | pattern_viewed | | species |
| PHOTO_TIMELINE_USED | photo_timeline_used | | species |
| VET_SUMMARY_GENERATED | vet_summary_generated | | species |
| VET_SUMMARY_SHARED | vet_summary_shared | | species |
| CAREGIVER_INVITED | caregiver_invited | | — |
| REMINDER_ENABLED | reminder_enabled | | — |
| REMINDER_PERMISSION_GRANTED | reminder_permission_granted | | — |
| REMINDER_PERMISSION_DENIED | reminder_permission_denied | | — |
| REMINDER_NOTIFICATION_OPENED | reminder_notification_opened | | — |
| NOTIFICATION_TO_CHECKIN_CONVERSION | notification_to_checkin | | — |
| DATA_EXPORT_REQUESTED | export_clicked | | — |
| ACCOUNT_DELETED | account_deleted | ✔ | — |
| _CHECKIN_CREATED (legacy)_ | checkin_created | | species, mode |
| _VET_SUMMARY_VIEWED (legacy)_ | vet_summary_viewed | | species |

Wire names are frozen for DB compatibility (e.g. ACCOUNT_REGISTERED still stores `registered`).

### Where events fire (server-authoritative)
- ACCOUNT_REGISTERED → AuthController (register).
- PET_CREATED + ONBOARDING_COMPLETED → PetController.createPet.
- CHECKIN_CREATED + FIRST/THIRD/SEVENTH_USEFUL milestones → CheckInController.upsert.
- FIRST_PATTERN_GENERATED + FIRST_WEEKLY_OVERVIEW_AVAILABLE → PetController.overview.
- VET_SUMMARY_GENERATED (+ legacy VIEWED) → VetSummaryController; VET_SUMMARY_SHARED → VetShareController.
- CAREGIVER_INVITED → CaregiverController.invite.
- DATA_EXPORT_REQUESTED / ACCOUNT_DELETED → AccountController.
- Client-known events (SAME_AS_USUAL / CHANGED_DAY check-in mode, PHOTO_TIMELINE_USED,
  WEEKLY_OVERVIEW_VIEWED, PATTERN_VIEWED, and the 5 reminder/notification events) are posted by the
  authenticated client to `POST /api/analytics/events`, which rejects once-per-ref milestone types
  (a client must not self-report a server-authoritative milestone) and unknown types.

## Definitions

- **Active day** — a pseudonymous ref has ≥1 event on a given UTC calendar day (`occurred_on`).
- **Useful check-in** — a distinct saved daily check-in day. Editing an existing day does not count
  again (the milestone counter is `count(DailyCheckIn) where pet.owner = owner`, so re-saving the
  same date does not advance it).
- **D1 / D7 / D30 retention** — a ref's *cohort day* is its earliest active UTC day. It is
  "DN-retained" if it has any event on the day exactly N days later. A ref is only counted in the
  DN cohort once day N has fully elapsed relative to the report's UTC "today", so an in-progress
  cohort never deflates the rate. `rate = retained / cohort` (0 when the cohort is empty).
- **Platform attribution** — each event stores its platform (`web`/`android`/`ios`). The report
  gives per-platform distinct-users + totals, and per-platform retention where a ref is attributed
  to the platform of its **earliest** event (acquisition platform).
- **Timezone boundaries** — the server runs `TZ=UTC` and the report uses `LocalDate.now(UTC)`, so
  bucketing is timezone-safe regardless of JVM zone.
- **Duplicate prevention** — once-per-ref milestones are guarded by (a) an `exists(ref,type)`
  pre-check and (b) a partial `UNIQUE(ref,type)` index (`V15`) over the milestone wire names, so a
  concurrent double-fire is rejected atomically at the database (the violation is swallowed as
  non-fatal — that IS the idempotency guarantee).

## Privacy invariants (unchanged, still enforced + tested)

Stored per event: pseudonymous ref (SHA-256(ownerId + salt), never the id), wire type, UTC
timestamp + day, platform, optional version-shaped app version, schema version, and per-event
allow-listed categorical meta. **Never** stored: owner/pet name, email, notes, symptom/medication/
food text, vet info, photo paths, share content, or raw health observations. Free text and any key
not on the event's own allow-list are stripped. The report endpoint 404s until an admin token is
configured and 403s on a wrong token (constant-time compare).

## Example report output (SYNTHETIC test data only — illustrative shape)

```json
{
  "generatedOn": "2026-03-01",
  "firstDay": "2026-01-30", "lastDay": "2026-03-01",
  "totalEvents": 4120, "distinctUsers": 300,
  "funnel": [
    { "type": "registered",             "distinctUsers": 300, "totalEvents": 300 },
    { "type": "onboarding_completed",   "distinctUsers": 258, "totalEvents": 258 },
    { "type": "first_checkin_completed","distinctUsers": 232, "totalEvents": 232 },
    { "type": "third_useful_checkin",   "distinctUsers": 171, "totalEvents": 171 },
    { "type": "seventh_useful_checkin", "distinctUsers": 118, "totalEvents": 118 },
    { "type": "first_weekly_overview",  "distinctUsers": 121, "totalEvents": 121 },
    { "type": "first_pattern_generated","distinctUsers": 74,  "totalEvents": 74 },
    { "type": "vet_summary_generated",  "distinctUsers": 39,  "totalEvents": 61 },
    { "type": "vet_summary_shared",     "distinctUsers": 21,  "totalEvents": 24 },
    { "type": "caregiver_invited",      "distinctUsers": 33,  "totalEvents": 37 },
    { "type": "reminder_enabled",       "distinctUsers": 140, "totalEvents": 140 },
    { "type": "reminder_permission_granted", "distinctUsers": 96, "totalEvents": 96 },
    { "type": "reminder_permission_denied",  "distinctUsers": 34, "totalEvents": 34 },
    { "type": "notification_to_checkin",     "distinctUsers": 58, "totalEvents": 210 }
  ],
  "retention": [
    { "dayN": 1,  "cohortSize": 300, "retained": 168, "rate": 0.56 },
    { "dayN": 7,  "cohortSize": 300, "retained": 96,  "rate": 0.32 },
    { "dayN": 30, "cohortSize": 240, "retained": 41,  "rate": 0.171 }
  ],
  "platforms": [
    { "platform": "web",     "distinctUsers": 205, "totalEvents": 2810 },
    { "platform": "android", "distinctUsers": 71,  "totalEvents": 980 },
    { "platform": "ios",     "distinctUsers": 24,  "totalEvents": 330 }
  ],
  "retentionByPlatform": [
    { "platform": "android", "dayN": 1, "cohortSize": 71, "retained": 45, "rate": 0.634 },
    { "platform": "ios",     "dayN": 1, "cohortSize": 24, "retained": 14, "rate": 0.583 },
    { "platform": "web",     "dayN": 1, "cohortSize": 205,"retained": 109,"rate": 0.532 }
  ]
}
```

The retention math itself (both overall and per-platform) is verified deterministically in
`AnalyticsReportServiceTest` with plain inputs; the JSON above is a hand-authored illustration of
the response shape, not measured production data.
