-- Multi-species support. Widens the pets.species CHECK to the new species and
-- adds a flexible, owner-observed observations field for starter species.
--
-- Additive + backward compatible: existing DOG/CAT rows are untouched, and
-- observations_json is NULL for every existing check-in. Dogs and cats keep
-- using their explicit columns; only starter species write observations_json.

ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_species_check;
ALTER TABLE pets
    ADD CONSTRAINT pets_species_check
    CHECK (((species)::text = ANY ((ARRAY[
        'DOG'::character varying,
        'CAT'::character varying,
        'RABBIT'::character varying,
        'HAMSTER'::character varying,
        'GUINEA_PIG'::character varying,
        'BIRD'::character varying,
        'REPTILE'::character varying,
        'TURTLE'::character varying,
        'FISH_AQUARIUM'::character varying,
        'OTHER_SMALL_PET'::character varying
    ])::text[])));

-- Species-specific observations for starter species (BIRD, REPTILE, RABBIT, …)
-- and any future signal that does not yet deserve a first-class column. Stored
-- as a small, stable JSON string of owner-observed facts only — never a
-- diagnosis, disease label, or inferred medical cause.
ALTER TABLE daily_check_ins ADD COLUMN observations_json character varying(8000);
