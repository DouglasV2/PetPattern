-- Separate-period count for pattern observations (spec Part 9).
--
-- detection_count (already present) climbs once per calendar day the engine
-- re-surfaces the SAME evidence, so it is NOT recurrence and stays internal.
-- episode_count tracks genuinely separate periods: it only advances when a
-- pattern reappears after going quiet (see PatternObservation.EPISODE_GAP_DAYS),
-- and it is the only count allowed to back "seen before / repeated" language.
--
-- Existing rows are backfilled to 1 (a single observed period), which is the
-- honest floor: we cannot reconstruct past gaps, and 1 never over-claims.
ALTER TABLE public.pattern_observations
    ADD COLUMN episode_count integer NOT NULL DEFAULT 1;
