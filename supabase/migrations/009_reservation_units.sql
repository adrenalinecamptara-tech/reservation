-- Multi-unit reservations: each reservation can occupy multiple (cabin, floor) with per-unit people count.
-- Backfill: svaka postojeca rezervacija sa cabin_id+floor dobija jedan red sa svim svojim ljudima.

CREATE TABLE IF NOT EXISTS reservation_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  cabin_id UUID NOT NULL REFERENCES cabins(id) ON DELETE RESTRICT,
  floor TEXT NOT NULL CHECK (floor IN ('ground', 'upper')),
  people_count INT NOT NULL CHECK (people_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, cabin_id, floor)
);

CREATE INDEX IF NOT EXISTS idx_reservation_units_res ON reservation_units(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_units_cabin_floor ON reservation_units(cabin_id, floor);

-- Backfill postojecih rezervacija koje vec imaju dodeljen smestaj.
INSERT INTO reservation_units (reservation_id, cabin_id, floor, people_count)
SELECT id, cabin_id, floor, number_of_people
FROM reservations
WHERE cabin_id IS NOT NULL
  AND floor IS NOT NULL
  AND number_of_people > 0
ON CONFLICT (reservation_id, cabin_id, floor) DO NOTHING;
