-- Atomic idempotency guard for once-per-ref milestone events.
--
-- The recorder already skips a milestone if exists(ref, type), but that read-then-write is not
-- atomic under concurrency. This partial UNIQUE index makes the database the source of truth: a
-- pseudonymous ref can hold at most one row of each milestone type, so a racing double-fire is
-- rejected at insert time (the violation is swallowed as non-fatal — which IS the idempotency
-- guarantee working). Repeatable activity events (check-ins, pattern/vet/overview views,
-- reminders, notification conversions) are intentionally NOT covered, so their rows still
-- accumulate — that is what makes rates and retention measurable.
--
-- Keep this list in sync with AnalyticsEventType.isOncePerRef() (wire names).
CREATE UNIQUE INDEX ux_analytics_once_per_ref
    ON analytics_event (ref, type)
    WHERE type IN (
        'registered',
        'onboarding_completed',
        'first_checkin_completed',
        'third_useful_checkin',
        'seventh_useful_checkin',
        'first_weekly_overview',
        'first_pattern_generated',
        'account_deleted'
    );
