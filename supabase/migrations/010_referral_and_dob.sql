-- 010_referral_and_dob.sql
ALTER TABLE reservations
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN referral_source TEXT,
  ADD COLUMN referral_source_other TEXT;

UPDATE reservations
SET referral_source = 'Instagram'
WHERE referral_source IS NULL;
