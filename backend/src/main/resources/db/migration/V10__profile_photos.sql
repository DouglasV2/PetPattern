-- Keep pet portraits separate from health/progression photos. Existing OTHER
-- photos stay as-is; new sidebar/mobile avatar uploads use PROFILE.
ALTER TABLE public.pet_photos DROP CONSTRAINT IF EXISTS pet_photos_area_check;
ALTER TABLE public.pet_photos
    ADD CONSTRAINT pet_photos_area_check CHECK (((area)::text = ANY ((ARRAY[
        'EAR'::character varying,
        'PAW'::character varying,
        'SKIN'::character varying,
        'COAT'::character varying,
        'EYE'::character varying,
        'STOOL'::character varying,
        'OTHER'::character varying,
        'PROFILE'::character varying
    ])::text[])));
