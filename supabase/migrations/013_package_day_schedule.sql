-- ============================================================
-- Migration 013: Package day-by-day schedule
-- Adds JSONB day_schedule column to packages with per-day
-- meals + activities + opcioni addons.
--
-- Format pravilo:
--   - "string"           = fiksno (uvek se desava)
--   - ["a","b","c"]      = choice slot (gost bira 1)
--   - addons[]           = opciono se dokupljuje (gost bira 0..N)
--
-- Primer:
-- [
--   {"day":1,"meals":["dinner"],"activities":["arrival","party"]},
--   {"day":2,"meals":["breakfast","lunch","dinner"],"activities":["rafting","party","live_music"]},
--   {"day":3,"meals":["breakfast","lunch","dinner"],
--    "activities":[["canyoning","horse","biking","atv","excursion"], "party"],
--    "addons":["jeep_safari"]}
-- ]
-- ============================================================

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS day_schedule JSONB;

-- ── Backfill: seed-ovani paketi (po imenu) ────────────────────

-- Trodnevni Maj / Savršen vikend / Team building (3 dana, klasik)
UPDATE packages
SET day_schedule = '[
  {"day":1,"meals":["dinner"],"activities":["arrival","party"]},
  {"day":2,"meals":["breakfast","lunch","dinner"],"activities":["rafting","party"]},
  {"day":3,"meals":["breakfast"],"activities":["departure"]}
]'::jsonb
WHERE day_schedule IS NULL
  AND name IN ('Trodnevni Maj','Savršen vikend','Team building');

-- Porodicni kombo: 3 dana, gost bira jednu od bonus aktivnosti dan 2
UPDATE packages
SET day_schedule = '[
  {"day":1,"meals":["dinner"],"activities":["arrival","party"]},
  {"day":2,"meals":["breakfast","lunch","dinner"],"activities":["rafting", "party"]},
  {"day":3,"meals":["breakfast"],"activities":[["horse","jeep_safari","atv","excursion"],"departure"]}
]'::jsonb
WHERE day_schedule IS NULL
  AND name = 'Porodični kombo';

-- Balans (3 dana, rafting | hiking + safari, fiksno)
UPDATE packages
SET day_schedule = '[
  {"day":1,"meals":["dinner"],"activities":["arrival","party"]},
  {"day":2,"meals":["breakfast","lunch","dinner"],"activities":[["rafting","hiking"],"party"]},
  {"day":3,"meals":["breakfast","lunch"],"activities":["jeep_safari","departure"]}
]'::jsonb
WHERE day_schedule IS NULL
  AND name = 'Balans - Rafting i Safari';

-- Adrenalin (4 dana, 2x rafting + ATV, fiksno)
UPDATE packages
SET day_schedule = '[
  {"day":1,"meals":["dinner"],"activities":["arrival","party"]},
  {"day":2,"meals":["breakfast","lunch","dinner"],"activities":["rafting","party"]},
  {"day":3,"meals":["breakfast","lunch","dinner"],"activities":["rafting","atv","party"]},
  {"day":4,"meals":["breakfast"],"activities":["departure"]}
]'::jsonb
WHERE day_schedule IS NULL
  AND name = 'Adrenalin - Rafting i Kvadovi';

-- Rafting plus (4 dana, rafting + IZBOR aktivnosti dan 3)
UPDATE packages
SET day_schedule = '[
  {"day":1,"meals":["dinner"],"activities":["arrival","party"]},
  {"day":2,"meals":["breakfast","lunch","dinner"],"activities":["rafting","party"]},
  {"day":3,"meals":["breakfast","lunch","dinner"],"activities":[["canyoning","horse","biking","atv","excursion"],"party"]},
  {"day":4,"meals":["breakfast"],"activities":["departure"]}
]'::jsonb
WHERE day_schedule IS NULL
  AND name = 'Rafting plus';

-- Prilagodjena Ponuda — builder paket; day_schedule ostaje NULL.
-- Gost ga sastavlja kroz custom builder (Faza 3 — service_catalog).
