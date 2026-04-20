-- Partners (B2B) and their on-site bookings.
-- Partneri (npr. Rajska Rijeka) dovode svoje grupe — zauzimaju jedinice ali nisu klasične rezervacije.

CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  default_price_per_person NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  cabin_id UUID NOT NULL REFERENCES cabins(id) ON DELETE RESTRICT,
  floor TEXT NOT NULL CHECK (floor IN ('ground', 'upper')),
  arrival_date DATE NOT NULL,
  nights INT NOT NULL CHECK (nights > 0),
  number_of_people INT NOT NULL CHECK (number_of_people > 0),
  price_per_person NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  paid_by TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_bookings_arrival ON partner_bookings(arrival_date);
CREATE INDEX IF NOT EXISTS idx_partner_bookings_partner ON partner_bookings(partner_id);

-- Seed: Rajska Rijeka partner sa cenom 25€/os.
INSERT INTO partners (name, default_price_per_person)
VALUES ('Rajska Rijeka', 25)
ON CONFLICT (name) DO NOTHING;
