-- ============================================================
-- Migration 023: Broj ljudi iz partner grupe koji idu na rafting
-- NULL = svi iz grupe idu (default ponašanje)
-- broj < number_of_people = samo toliko ljudi
-- Operations agregator za rafting koristi:
--   rafting_people ?? number_of_people
-- ============================================================

ALTER TABLE partner_bookings
  ADD COLUMN IF NOT EXISTS rafting_people INTEGER
    CHECK (rafting_people IS NULL OR rafting_people >= 0);
