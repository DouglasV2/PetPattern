-- Cat-specific daily check-in signals. Nullable / defaulted so existing dog
-- check-ins are untouched (dogs simply never set these).

ALTER TABLE daily_check_ins ADD COLUMN litter_box_use character varying(255);
ALTER TABLE daily_check_ins ADD COLUMN urination_change character varying(255);
ALTER TABLE daily_check_ins ADD COLUMN hiding_behavior character varying(255);
ALTER TABLE daily_check_ins ADD COLUMN straining boolean NOT NULL DEFAULT false;
ALTER TABLE daily_check_ins ADD COLUMN weight_concern boolean NOT NULL DEFAULT false;

-- Match the baseline's enum-check style (NULL passes, as it does for the dog enums).
ALTER TABLE daily_check_ins
    ADD CONSTRAINT daily_check_ins_litter_box_use_check
    CHECK (((litter_box_use)::text = ANY ((ARRAY['NORMAL'::character varying, 'LESS'::character varying, 'MORE'::character varying, 'NONE'::character varying, 'UNKNOWN'::character varying])::text[])));
ALTER TABLE daily_check_ins
    ADD CONSTRAINT daily_check_ins_urination_change_check
    CHECK (((urination_change)::text = ANY ((ARRAY['NORMAL'::character varying, 'LESS'::character varying, 'MORE'::character varying, 'UNKNOWN'::character varying])::text[])));
ALTER TABLE daily_check_ins
    ADD CONSTRAINT daily_check_ins_hiding_behavior_check
    CHECK (((hiding_behavior)::text = ANY ((ARRAY['NORMAL'::character varying, 'MORE'::character varying, 'UNKNOWN'::character varying])::text[])));
