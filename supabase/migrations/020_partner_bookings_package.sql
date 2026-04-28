-- ============================================================
-- Migration 020: Opcioni paket na partner_bookings
-- Ako partner ima izabran paket → operativa priprema sve iz paketa za
-- te ljude (obroci, aktivnosti). Bez paketa → samo dolazak/odlazak.
-- Cena ostaje definisana po partneru (price_per_person × nights).
-- ============================================================

ALTER TABLE partner_bookings
  ADD COLUMN IF NOT EXISTS package_id UUID
    REFERENCES packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_bookings_package
  ON partner_bookings(package_id);
