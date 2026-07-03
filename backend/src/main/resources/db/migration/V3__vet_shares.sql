-- Read-only vet-summary share links.
CREATE TABLE vet_shares (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    token_hash character varying(64) NOT NULL,
    pet_id uuid NOT NULL,
    CONSTRAINT vet_shares_pkey PRIMARY KEY (id),
    CONSTRAINT uk_vet_share_token UNIQUE (token_hash)
);

ALTER TABLE ONLY vet_shares
    ADD CONSTRAINT fk_vet_shares_pet FOREIGN KEY (pet_id) REFERENCES pets(id);
