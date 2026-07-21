-- Active-period model for food (spec Part 1). A MAIN_FOOD is the interval
-- [date_started, end_date); null end_date means still active. When a new main
-- food begins, the previous period's end_date is set to the successor's start,
-- so history is preserved rather than overwritten.
--
-- Existing rows keep end_date NULL. The application relinks a pet's main-food
-- chain the next time a food is logged, so past periods close deterministically
-- without a data backfill here.
ALTER TABLE public.food_logs
    ADD COLUMN end_date date;
