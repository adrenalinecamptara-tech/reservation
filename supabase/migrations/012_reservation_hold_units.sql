-- Multi-unit hold reservations: one hold can occupy multiple (cabin, floor) units.
-- Legacy reservation_holds.cabin_id/floor stay as mirror of the first unit.

CREATE TABLE IF NOT EXISTS reservation_hold_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_hold_id UUID NOT NULL REFERENCES reservation_holds(id) ON DELETE CASCADE,
  cabin_id UUID NOT NULL REFERENCES cabins(id) ON DELETE RESTRICT,
  floor TEXT NOT NULL CHECK (floor IN ('ground', 'upper')),
  people_count INT NOT NULL CHECK (people_count > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reservation_hold_id, cabin_id, floor)
);

CREATE INDEX IF NOT EXISTS idx_reservation_hold_units_hold ON reservation_hold_units(reservation_hold_id);
CREATE INDEX IF NOT EXISTS idx_reservation_hold_units_cabin_floor ON reservation_hold_units(cabin_id, floor);

INSERT INTO reservation_hold_units (reservation_hold_id, cabin_id, floor, people_count)
SELECT id, cabin_id, floor, number_of_people
FROM reservation_holds
WHERE cabin_id IS NOT NULL
  AND floor IS NOT NULL
  AND number_of_people > 0
ON CONFLICT (reservation_hold_id, cabin_id, floor) DO NOTHING;
