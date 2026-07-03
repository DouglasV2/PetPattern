-- Medication / treatment tracking (added after the Flyway baseline).
CREATE TABLE medications (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    end_date date,
    name character varying(160) NOT NULL,
    notes character varying(500),
    start_date date NOT NULL,
    pet_id uuid NOT NULL,
    CONSTRAINT medications_pkey PRIMARY KEY (id)
);

ALTER TABLE ONLY medications
    ADD CONSTRAINT fk_medications_pet FOREIGN KEY (pet_id) REFERENCES pets(id);
