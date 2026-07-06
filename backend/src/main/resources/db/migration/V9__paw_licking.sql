-- Optional dog signal: paw licking / chewing (a common allergy sign, distinct
-- from body scratching). Boolean, defaults false so existing rows are valid.
ALTER TABLE daily_check_ins ADD COLUMN paw_licking boolean NOT NULL DEFAULT false;
