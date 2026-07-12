-- Activity logging: date-only walks/play/etc. Multiple rows per day are allowed
-- (a dog can have two walks), so there is deliberately NO unique constraint. Used
-- for day-level activity<->symptom co-occurrence; existing data is untouched.
CREATE TABLE activity_log (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    occurred_date date NOT NULL,
    type character varying(20) NOT NULL,
    notes character varying(500),
    pet_id uuid NOT NULL,
    CONSTRAINT activity_log_pkey PRIMARY KEY (id),
    CONSTRAINT activity_log_type_check CHECK (((type)::text = ANY ((ARRAY[
        'WALK'::character varying,
        'PLAY'::character varying,
        'EXERCISE'::character varying,
        'GROOMING'::character varying,
        'OUTING'::character varying,
        'OTHER'::character varying
    ])::text[])))
);

ALTER TABLE ONLY activity_log
    ADD CONSTRAINT fk_activity_log_pet FOREIGN KEY (pet_id) REFERENCES pets(id);

CREATE INDEX ix_activity_log_pet_date ON activity_log (pet_id, occurred_date);
