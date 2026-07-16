-- Internal, privacy-safe product analytics (activation funnel + D1/D7/D30 retention).
--
-- Stores ONLY: a pseudonymous, one-way ref (SHA-256 of the owner id + a server salt),
-- an allow-listed event type, a UTC timestamp and calendar day (for retention buckets),
-- the platform (web/android/ios), an optional app version, the analytics schema version,
-- and small allow-listed categorical meta. It NEVER stores the owner id, a name, a note,
-- a symptom, an email, or any health content — so it cannot be linked back to a person or
-- to a pet's health.
--
-- No enum CHECK on `type` on purpose: event types evolve, and a stale CHECK under a
-- validating schema would reject new types (the same lesson as PatternObservation.type).
-- Types and platforms are validated in the application layer instead.
CREATE TABLE analytics_event (
    id uuid NOT NULL,
    ref character varying(64) NOT NULL,
    type character varying(40) NOT NULL,
    occurred_at timestamp(6) with time zone NOT NULL,
    occurred_on date NOT NULL,
    platform character varying(10) NOT NULL,
    app_version character varying(20),
    schema_version integer NOT NULL,
    meta character varying(500),
    CONSTRAINT analytics_event_pkey PRIMARY KEY (id)
);

-- Funnel: distinct refs per type over a day range.
CREATE INDEX ix_analytics_event_type_day ON analytics_event (type, occurred_on);
-- Retention: a ref's cohort day (min) and its active days.
CREATE INDEX ix_analytics_event_ref_day ON analytics_event (ref, occurred_on);
