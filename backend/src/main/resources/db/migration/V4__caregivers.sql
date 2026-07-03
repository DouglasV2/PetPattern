-- Multi-caregiver: a pet keeps one primary owner (pets.owner_id) and gains any
-- number of caregivers, plus pending email invitations that become caregivers on
-- acceptance.

CREATE TABLE pet_caregivers (
    id uuid NOT NULL,
    added_at timestamp(6) with time zone NOT NULL,
    pet_id uuid NOT NULL,
    caregiver_id uuid NOT NULL,
    CONSTRAINT pet_caregivers_pkey PRIMARY KEY (id),
    CONSTRAINT uk_pet_caregiver UNIQUE (pet_id, caregiver_id)
);

ALTER TABLE ONLY pet_caregivers
    ADD CONSTRAINT fk_pet_caregivers_pet FOREIGN KEY (pet_id) REFERENCES pets(id);
ALTER TABLE ONLY pet_caregivers
    ADD CONSTRAINT fk_pet_caregivers_owner FOREIGN KEY (caregiver_id) REFERENCES owners(id);

CREATE TABLE pet_invites (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    invited_email character varying(254) NOT NULL,
    pet_id uuid NOT NULL,
    invited_by uuid NOT NULL,
    CONSTRAINT pet_invites_pkey PRIMARY KEY (id),
    CONSTRAINT uk_pet_invite UNIQUE (pet_id, invited_email)
);

ALTER TABLE ONLY pet_invites
    ADD CONSTRAINT fk_pet_invites_pet FOREIGN KEY (pet_id) REFERENCES pets(id);
ALTER TABLE ONLY pet_invites
    ADD CONSTRAINT fk_pet_invites_owner FOREIGN KEY (invited_by) REFERENCES owners(id);
