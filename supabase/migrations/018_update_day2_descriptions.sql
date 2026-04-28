-- ============================================================
-- Migration 018: Ažuriraj opis dan 2 za Trodnevni Maj / Savršen vikend
-- / Team building da kaže "Uveče večera i muzika u restoranu." umesto
-- samo "Uveče večera."
--
-- Email runtime dodaje "(Živa svirka)" samo subotom (i ne zadnji dan).
-- ============================================================

UPDATE packages
SET day_schedule = jsonb_set(
  day_schedule,
  '{1,description}',
    '"Doručak do 10h, polazak na rafting u 11h. Po povratku ručak, slobodno vreme, odbojka, bilijar. Uveče večera i muzika u restoranu."'::jsonb
)
WHERE day_schedule IS NOT NULL
  AND name IN ('Trodnevni Maj','Savršen vikend','Team building');
