-- Indexes on foreign-key columns that are filtered on the hot paths (per-pet /
-- per-owner lookups on /overview, list endpoints, export) and scanned during
-- cascade cleanup (delete account / delete pet). Postgres does NOT auto-index
-- FKs, so these were sequential scans.
--
-- Deliberately NOT indexed here (already covered by a UNIQUE constraint whose
-- leading column serves the lookup):
--   daily_check_ins(pet_id, check_in_date)     -> uk_pet_checkin_date
--   pattern_observations(pet_id, pattern_key)  -> uk_pattern_observation_pet_key
--   auth_sessions(token_hash)                  -> uk_session_token
--   password_reset_tokens(owner_id)            -> idx_reset_token_owner (V7)

CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets (owner_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_pet ON food_logs (pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_photos_pet ON pet_photos (pet_id);
CREATE INDEX IF NOT EXISTS idx_food_trials_pet ON food_trials (pet_id);
CREATE INDEX IF NOT EXISTS idx_medications_pet ON medications (pet_id);
CREATE INDEX IF NOT EXISTS idx_ai_parse_attempts_pet ON ai_parse_attempts (pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_caregivers_caregiver ON pet_caregivers (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_pet_invites_pet ON pet_invites (pet_id);
