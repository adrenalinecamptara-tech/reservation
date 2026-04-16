-- ============================================================
-- Adrenaline Camp Tara — Initial Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CABINS
-- ============================================================
CREATE TABLE cabins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  ground_beds  INTEGER NOT NULL DEFAULT 6,
  upper_beds   INTEGER NOT NULL DEFAULT 4,
  notes        TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed 4 bungalows
INSERT INTO cabins (name, ground_beds, upper_beds) VALUES
  ('Bungalov 1', 6, 4),
  ('Bungalov 2', 6, 4),
  ('Bungalov 3', 6, 4),
  ('Bungalov 4', 6, 4);

-- ============================================================
-- INVITE LINKS
-- ============================================================
CREATE TABLE invite_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        TEXT UNIQUE NOT NULL,
  created_by   UUID,                          -- admin user id (auth.users)
  notes        TEXT,                          -- e.g. "Ana Petrović, 6 osoba"
  used         BOOLEAN NOT NULL DEFAULT FALSE,
  used_at      TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_links_token ON invite_links(token);

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TYPE reservation_status AS ENUM (
  'pending',    -- guest submitted form, awaiting admin review
  'approved',   -- admin approved, voucher sent
  'cancelled',  -- cancelled
  'modified'    -- admin edited post-approval
);

CREATE TABLE reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_link_id      UUID REFERENCES invite_links(id) ON DELETE SET NULL,

  -- Guest personal data
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT NOT NULL,
  id_card_number      TEXT NOT NULL,

  -- Booking
  number_of_people    INTEGER NOT NULL CHECK (number_of_people > 0),
  arrival_date        DATE NOT NULL,
  departure_date      DATE,
  package_type        TEXT,

  -- Financial
  deposit_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount        NUMERIC(10,2),
  remaining_amount    NUMERIC(10,2),
  currency            TEXT NOT NULL DEFAULT 'EUR',

  -- Payment proof (Supabase Storage path)
  payment_proof_path  TEXT,
  payment_proof_name  TEXT,

  -- Cabin assignment (admin fills post-approval)
  cabin_id            UUID REFERENCES cabins(id) ON DELETE SET NULL,
  floor               TEXT CHECK (floor IN ('ground', 'upper')),

  -- Status & admin
  status              reservation_status NOT NULL DEFAULT 'pending',
  admin_notes         TEXT,
  approved_by         UUID,                   -- auth.users id
  approved_at         TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Voucher
  voucher_sent_at     TIMESTAMPTZ,
  voucher_number      TEXT UNIQUE,            -- e.g. "ACT-2026-0001"

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_status      ON reservations(status);
CREATE INDEX idx_reservations_arrival     ON reservations(arrival_date);
CREATE INDEX idx_reservations_email       ON reservations(email);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate voucher number: ACT-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_voucher_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  year_str TEXT := to_char(now(), 'YYYY');
  seq      INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq
  FROM reservations
  WHERE voucher_number LIKE 'ACT-' || year_str || '-%';

  NEW.voucher_number := 'ACT-' || year_str || '-' || lpad(seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_voucher_number
  BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION generate_voucher_number();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Cabins: admins full access, public read (future calendar iFrame)
ALTER TABLE cabins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cabins_admin_all"   ON cabins USING (auth.role() = 'authenticated');
CREATE POLICY "cabins_public_read" ON cabins FOR SELECT USING (true);

-- Invite links: admins only
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links_admin_all" ON invite_links USING (auth.role() = 'authenticated');

-- Reservations: admins full access; anonymous INSERT via server-side service key
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reservations_admin_all" ON reservations USING (auth.role() = 'authenticated');
-- Note: public INSERT is handled in API routes using the service_role key (bypasses RLS).
