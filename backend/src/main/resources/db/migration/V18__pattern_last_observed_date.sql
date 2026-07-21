-- Data-derived episode gap for pattern observations (spec Part 9 hardening).
--
-- episode_count must reflect genuinely separate periods in the DATA, not how
-- often the owner opens the patterns view. last_observed_date records the most
-- recent check-in date on which the pattern was actually observed; a new episode
-- is only counted when a fresh detection's earliest evidence is a real gap after
-- this date — never from request cadence.
--
-- Existing rows start null; the next detection seeds it, so no backfill is needed.
ALTER TABLE public.pattern_observations
    ADD COLUMN last_observed_date date;
