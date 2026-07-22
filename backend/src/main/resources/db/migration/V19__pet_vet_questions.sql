-- Owner's standing "questions for your vet" (spec Part 4). Free-text the owner
-- edits over time and that appears in the vet summary they share. Nullable; no
-- backfill needed.
ALTER TABLE public.pets
    ADD COLUMN vet_questions varchar(2000);
