-- Internal reservation holds (pre-booking placeholders)
-- Koristi se za cuvanje mesta do dogovorenog roka uplate.

CREATE TABLE IF NOT EXISTS reservation_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  cabin_id UUID NOT NULL REFERENCES cabins(id) ON DELETE RESTRICT,
  floor TEXT NOT NULL CHECK (floor IN ('ground', 'upper')),
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  number_of_people INT NOT NULL CHECK (number_of_people > 0),
  hold_until_date DATE NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted', 'cancelled')),
  converted_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (departure_date > arrival_date)
);

CREATE INDEX IF NOT EXISTS idx_reservation_holds_arrival ON reservation_holds(arrival_date);
CREATE INDEX IF NOT EXISTS idx_reservation_holds_status ON reservation_holds(status);
CREATE INDEX IF NOT EXISTS idx_reservation_holds_unit ON reservation_holds(cabin_id, floor);
CREATE INDEX IF NOT EXISTS idx_reservation_holds_hold_until ON reservation_holds(hold_until_date);

CREATE OR REPLACE FUNCTION set_reservation_holds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_reservation_holds_updated_at'
      AND tgrelid = 'reservation_holds'::regclass
  ) THEN
    CREATE TRIGGER trg_reservation_holds_updated_at
    BEFORE UPDATE ON reservation_holds
    FOR EACH ROW
    EXECUTE FUNCTION set_reservation_holds_updated_at();
  END IF;
END;
$$;
