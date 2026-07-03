-- One-time, expiring password-reset tokens. Only the SHA-256 hash of the emailed
-- token is stored (same approach as auth_sessions), so a DB leak never exposes a
-- usable reset link. used_at enforces one-time use; expires_at the lifetime.
CREATE TABLE password_reset_tokens (
    id uuid NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    used_at timestamp(6) with time zone,
    token_hash character varying(64) NOT NULL,
    owner_id uuid NOT NULL,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT uk_reset_token UNIQUE (token_hash)
);

ALTER TABLE ONLY password_reset_tokens
    ADD CONSTRAINT fk_reset_token_owner FOREIGN KEY (owner_id) REFERENCES owners(id);

CREATE INDEX idx_reset_token_owner ON password_reset_tokens (owner_id);
