-- Universal visible-change / wound tracking adds photo areas that apply across
-- species (wounds, swelling, shells, feathers, fins/scales). Existing photos are
-- untouched; this only widens the allowed set. Mirrors V10's constraint style.
ALTER TABLE public.pet_photos DROP CONSTRAINT IF EXISTS pet_photos_area_check;
ALTER TABLE public.pet_photos
    ADD CONSTRAINT pet_photos_area_check CHECK (((area)::text = ANY ((ARRAY[
        'EAR'::character varying,
        'PAW'::character varying,
        'SKIN'::character varying,
        'COAT'::character varying,
        'EYE'::character varying,
        'STOOL'::character varying,
        'WOUND'::character varying,
        'SWELLING'::character varying,
        'SHELL'::character varying,
        'FEATHER'::character varying,
        'FIN_SCALE'::character varying,
        'OTHER'::character varying,
        'PROFILE'::character varying
    ])::text[])));
