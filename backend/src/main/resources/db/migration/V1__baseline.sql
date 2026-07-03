-- PetPattern baseline schema (Route A, Phase 2).
-- Captured from the Hibernate-generated schema so ddl-auto=validate passes
-- against both existing volumes and fresh databases. Later changes go in V2+.

CREATE TABLE public.ai_parse_attempts (
    id uuid NOT NULL,
    confidence character varying(255),
    created_at timestamp(6) with time zone NOT NULL,
    note character varying(2000),
    pet_id uuid,
    provider character varying(255)
);
CREATE TABLE public.auth_sessions (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    token_hash character varying(64) NOT NULL,
    owner_id uuid NOT NULL
);
CREATE TABLE public.daily_check_ins (
    id uuid NOT NULL,
    appetite_score integer,
    check_in_date date NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    diarrhea boolean NOT NULL,
    ear_redness boolean NOT NULL,
    energy_score integer,
    itching_score integer,
    notes character varying(1200),
    sleep_quality_score integer,
    stool_score integer,
    vomiting boolean NOT NULL,
    water_intake_ml integer,
    pet_id uuid NOT NULL,
    free_text_note character varying(1200),
    appetite_level character varying(255),
    energy_level character varying(255),
    stool_state character varying(255),
    water_level character varying(255),
    CONSTRAINT daily_check_ins_appetite_level_check CHECK (((appetite_level)::text = ANY ((ARRAY['LOWER'::character varying, 'NORMAL'::character varying, 'HIGHER'::character varying, 'REFUSED'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT daily_check_ins_appetite_score_check CHECK (((appetite_score >= 0) AND (appetite_score <= 10))),
    CONSTRAINT daily_check_ins_energy_level_check CHECK (((energy_level)::text = ANY ((ARRAY['LOW'::character varying, 'NORMAL'::character varying, 'RESTLESS'::character varying, 'HIGH'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT daily_check_ins_energy_score_check CHECK (((energy_score >= 0) AND (energy_score <= 10))),
    CONSTRAINT daily_check_ins_itching_score_check CHECK (((itching_score >= 0) AND (itching_score <= 10))),
    CONSTRAINT daily_check_ins_sleep_quality_score_check CHECK (((sleep_quality_score >= 0) AND (sleep_quality_score <= 10))),
    CONSTRAINT daily_check_ins_stool_score_check CHECK (((stool_score <= 5) AND (stool_score >= 1))),
    CONSTRAINT daily_check_ins_stool_state_check CHECK (((stool_state)::text = ANY ((ARRAY['NORMAL'::character varying, 'SOFT'::character varying, 'DIARRHEA'::character varying, 'NO_STOOL'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT daily_check_ins_water_intake_ml_check CHECK ((water_intake_ml >= 0)),
    CONSTRAINT daily_check_ins_water_level_check CHECK (((water_level)::text = ANY ((ARRAY['LOWER'::character varying, 'NORMAL'::character varying, 'HIGHER'::character varying, 'UNKNOWN'::character varying])::text[])))
);
CREATE TABLE public.food_log_secondary_proteins (
    food_log_id uuid NOT NULL,
    protein character varying(255) NOT NULL,
    CONSTRAINT food_log_secondary_proteins_protein_check CHECK (((protein)::text = ANY ((ARRAY['CHICKEN'::character varying, 'BEEF'::character varying, 'LAMB'::character varying, 'SALMON'::character varying, 'TURKEY'::character varying, 'DUCK'::character varying, 'PORK'::character varying, 'EGG'::character varying, 'DAIRY'::character varying, 'UNKNOWN'::character varying, 'OTHER'::character varying])::text[])))
);
CREATE TABLE public.food_logs (
    id uuid NOT NULL,
    amount_grams integer,
    brand character varying(255),
    created_at timestamp(6) with time zone NOT NULL,
    date date NOT NULL,
    new_food boolean NOT NULL,
    notes character varying(1200),
    primary_protein character varying(255),
    recipe_name character varying(255),
    pet_id uuid NOT NULL,
    date_started date NOT NULL,
    food_kind character varying(255) NOT NULL,
    grain_free boolean NOT NULL,
    product_name character varying(255),
    CONSTRAINT food_logs_amount_grams_check CHECK ((amount_grams >= 0)),
    CONSTRAINT food_logs_food_kind_check CHECK (((food_kind)::text = ANY ((ARRAY['MAIN_FOOD'::character varying, 'TREAT'::character varying, 'SUPPLEMENT'::character varying, 'OTHER'::character varying])::text[])))
);
CREATE TABLE public.food_trials (
    id uuid NOT NULL,
    completed_date date,
    created_at timestamp(6) with time zone NOT NULL,
    notes character varying(500),
    protein character varying(40) NOT NULL,
    reintroduced_date date,
    start_date date NOT NULL,
    status character varying(255) NOT NULL,
    target_end_date date NOT NULL,
    pet_id uuid NOT NULL,
    CONSTRAINT food_trials_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'REINTRODUCED'::character varying, 'COMPLETED'::character varying, 'ABANDONED'::character varying])::text[])))
);
CREATE TABLE public.owners (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    display_name character varying(120),
    email character varying(254) NOT NULL,
    password_hash character varying(255) NOT NULL
);
CREATE TABLE public.pattern_observations (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    detection_count integer NOT NULL,
    first_detected_date date NOT NULL,
    last_confidence character varying(255),
    last_detected_date date NOT NULL,
    last_summary character varying(1200),
    last_title character varying(240),
    pattern_key character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    status_updated_at timestamp(6) with time zone,
    type character varying(255) NOT NULL,
    pet_id uuid NOT NULL,
    CONSTRAINT pattern_observations_status_check CHECK (((status)::text = ANY ((ARRAY['NEW'::character varying, 'ACKNOWLEDGED'::character varying, 'SHARED_WITH_VET'::character varying, 'RESOLVED'::character varying, 'NOT_RELEVANT'::character varying])::text[])))
);
CREATE TABLE public.pet_photos (
    id uuid NOT NULL,
    area character varying(255) NOT NULL,
    caption character varying(300),
    captured_date date NOT NULL,
    content_type character varying(64) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    data bytea NOT NULL,
    pet_id uuid NOT NULL,
    CONSTRAINT pet_photos_area_check CHECK (((area)::text = ANY ((ARRAY['EAR'::character varying, 'PAW'::character varying, 'SKIN'::character varying, 'COAT'::character varying, 'EYE'::character varying, 'STOOL'::character varying, 'OTHER'::character varying])::text[])))
);
CREATE TABLE public.pets (
    id uuid NOT NULL,
    birth_date date,
    breed character varying(255),
    created_at timestamp(6) with time zone NOT NULL,
    current_weight_kg numeric(6,2),
    name character varying(255) NOT NULL,
    sex character varying(255),
    species character varying(255) NOT NULL,
    owner_id uuid,
    CONSTRAINT pets_sex_check CHECK (((sex)::text = ANY ((ARRAY['FEMALE'::character varying, 'MALE'::character varying, 'UNKNOWN'::character varying])::text[]))),
    CONSTRAINT pets_species_check CHECK (((species)::text = ANY ((ARRAY['DOG'::character varying, 'CAT'::character varying])::text[])))
);
ALTER TABLE ONLY public.ai_parse_attempts
    ADD CONSTRAINT ai_parse_attempts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.daily_check_ins
    ADD CONSTRAINT daily_check_ins_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.food_log_secondary_proteins
    ADD CONSTRAINT food_log_secondary_proteins_pkey PRIMARY KEY (food_log_id, protein);
ALTER TABLE ONLY public.food_logs
    ADD CONSTRAINT food_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.food_trials
    ADD CONSTRAINT food_trials_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.owners
    ADD CONSTRAINT owners_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pattern_observations
    ADD CONSTRAINT pattern_observations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pet_photos
    ADD CONSTRAINT pet_photos_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.owners
    ADD CONSTRAINT uk_owner_email UNIQUE (email);
ALTER TABLE ONLY public.pattern_observations
    ADD CONSTRAINT uk_pattern_observation_pet_key UNIQUE (pet_id, pattern_key);
ALTER TABLE ONLY public.daily_check_ins
    ADD CONSTRAINT uk_pet_checkin_date UNIQUE (pet_id, check_in_date);
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT uk_session_token UNIQUE (token_hash);
ALTER TABLE ONLY public.daily_check_ins
    ADD CONSTRAINT fk3f7w7xj0max4oe4pbtieq5x7k FOREIGN KEY (pet_id) REFERENCES public.pets(id);
ALTER TABLE ONLY public.pets
    ADD CONSTRAINT fk6teg4kcjcnjhduguft56wcfoa FOREIGN KEY (owner_id) REFERENCES public.owners(id);
ALTER TABLE ONLY public.food_logs
    ADD CONSTRAINT fk9i3isk475dmjpa12bw9qcw698 FOREIGN KEY (pet_id) REFERENCES public.pets(id);
ALTER TABLE ONLY public.food_log_secondary_proteins
    ADD CONSTRAINT fkc3lh1vm8adxjj9dicqspop9hn FOREIGN KEY (food_log_id) REFERENCES public.food_logs(id);
ALTER TABLE ONLY public.pattern_observations
    ADD CONSTRAINT fkcdtnsy2h4gwrnj1mvq3g1vhb9 FOREIGN KEY (pet_id) REFERENCES public.pets(id);
ALTER TABLE ONLY public.pet_photos
    ADD CONSTRAINT fkfdp39phgvx1umgkmyevib6te8 FOREIGN KEY (pet_id) REFERENCES public.pets(id);
ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT fkkrh73jhqrcae6l68rc15fvlum FOREIGN KEY (owner_id) REFERENCES public.owners(id);
ALTER TABLE ONLY public.food_trials
    ADD CONSTRAINT fknnu1ksy6m3i33kbk83ackt28o FOREIGN KEY (pet_id) REFERENCES public.pets(id);
