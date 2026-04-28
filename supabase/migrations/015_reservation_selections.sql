-- ============================================================
-- Migration 015: Guest selections + computed total + schedule snapshot
--
-- selections JSONB:
--   {
--     "choices": { "2:activities:1": "horse" },   -- razresenje choice slot-ova
--     "addons":  { "2": ["lunch","jeep_safari"] } -- po danu, codes iz service_catalog
--   }
--
-- day_schedule_snapshot JSONB:
--   Kopija package.day_schedule u trenutku rezervacije (za custom builder
--   i za zastitu od kasnijih izmena paketa — istorijski podaci ostaju
--   reproducibilni).
--
-- computed_total NUMERIC:
--   Server-side izracunata cena (paket + addoni). Ne diramo total_amount —
--   on ostaje sto je admin uneo. computed_total je sanity check.
-- ============================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS selections JSONB,
  ADD COLUMN IF NOT EXISTS day_schedule_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS computed_total NUMERIC(10,2);
