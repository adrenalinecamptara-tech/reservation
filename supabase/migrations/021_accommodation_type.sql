-- ============================================================
-- Migration 021: Accommodation type — Bungalov ili Šator
-- Šator: cabin_id/floor su NULL, broj šatora se izvodi iz number_of_people
-- (TENT_CAPACITY = 2). Cena = weekday_price bez obzira na datum.
-- ============================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS accommodation_type TEXT NOT NULL DEFAULT 'bungalow'
    CHECK (accommodation_type IN ('bungalow','tent'));
