-- GDPR / trust: record when an owner accepted the terms, privacy policy, and
-- medical disclaimer. Nullable so accounts created before this remain valid.
ALTER TABLE owners ADD COLUMN accepted_terms_at timestamp(6) with time zone;
ALTER TABLE owners ADD COLUMN accepted_privacy_at timestamp(6) with time zone;
ALTER TABLE owners ADD COLUMN accepted_medical_disclaimer_at timestamp(6) with time zone;
