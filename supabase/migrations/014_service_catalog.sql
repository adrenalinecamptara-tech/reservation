-- ============================================================
-- Migration 014: Service catalog (cenovnik aktivnosti / obroka)
-- Centralni izvor cena za:
--   - addone (gost dokupljuje)
--   - choice slots (kasnije, ako neka opcija ima price_delta)
--   - custom builder paket (Prilagodjena Ponuda)
--
-- code = primary key (poklapa se sa string-ovima u packages.day_schedule)
-- unit = "per_person" (po osobi) ili "flat" (jednom za grupu)
-- ============================================================

CREATE TABLE IF NOT EXISTS service_catalog (
  code             TEXT PRIMARY KEY,
  label            TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('meal','activity','marker')),
  emoji            TEXT,
  unit             TEXT NOT NULL DEFAULT 'per_person' CHECK (unit IN ('per_person','flat')),
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_hours   NUMERIC(4,1),
  description      TEXT,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_addon_eligible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Funkcija: kreiraj samo ako ne postoji (bez REPLACE da ne pregazi postojeću)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'trg_service_catalog_updated_at'
  ) THEN
    CREATE FUNCTION trg_service_catalog_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
    BEGIN NEW.updated_at = now(); RETURN NEW; END
    $fn$;
  END IF;
END $$;

-- Trigger: kreiraj samo ako ne postoji
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'service_catalog_updated_at'
      AND tgrelid = 'service_catalog'::regclass
  ) THEN
    CREATE TRIGGER service_catalog_updated_at
      BEFORE UPDATE ON service_catalog
      FOR EACH ROW EXECUTE FUNCTION trg_service_catalog_updated_at();
  END IF;
END $$;

-- RLS: javno citanje (guest forma treba katalog), admin pise
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_catalog'
      AND policyname = 'service_catalog_public_read'
  ) THEN
    CREATE POLICY "service_catalog_public_read"
      ON service_catalog FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_catalog'
      AND policyname = 'service_catalog_admin_write'
  ) THEN
    CREATE POLICY "service_catalog_admin_write"
      ON service_catalog USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── Seed: obroci ─────────────────────────────────────────────
-- is_addon_eligible = TRUE: gost moze dokupiti obrok koji nije u rasporedu
-- (UI ce filtrirati da ne moze izabrati onaj koji vec postoji za taj dan)
INSERT INTO service_catalog (code, label, category, emoji, unit, price, is_addon_eligible, sort_order)
VALUES
  ('breakfast','Doručak','meal','🥐','per_person', 8, TRUE,  10),
  ('lunch',    'Ručak',  'meal','🍝','per_person',15, TRUE,  11),
  ('dinner',   'Večera', 'meal','🍖','per_person',12, TRUE,  12)
ON CONFLICT (code) DO NOTHING;

-- Backfill: ako je migracija već pokrenuta sa is_addon_eligible=FALSE
UPDATE service_catalog
SET is_addon_eligible = TRUE
WHERE category = 'meal' AND is_addon_eligible = FALSE;

-- ── Seed: aktivnosti ─────────────────────────────────────────
INSERT INTO service_catalog (code, label, category, emoji, unit, price, duration_hours, is_addon_eligible, sort_order)
VALUES
  ('rafting',     'Rafting',         'activity','🚣','per_person', 40, 4,   TRUE,  20),
  ('hiking',      'Hajking',         'activity','🥾','per_person', 20, 4,   TRUE,  21),
  ('jeep_safari', 'Jeep safari',     'activity','🚙','per_person', 30, 5,   TRUE,  22),
  ('atv',         'ATV / Kvadovi',   'activity','🏍','per_person', 50, 2,   TRUE,  23),
  ('kayak',       'Kajak',           'activity','🛶','per_person', 40, 3,   TRUE,  24),
  ('horse',       'Jahanje',         'activity','🐎','per_person', 35, 2,   TRUE,  25),
  ('canyoning',   'Kanjoning',       'activity','🧗','per_person', 40, 4,   TRUE,  26),
  ('biking',      'Biciklizam',      'activity','🚴','per_person', 20, 3,   TRUE,  27),
  ('excursion',   'Izlet',           'activity','🗺','per_person', 30, 6,   TRUE,  28)
ON CONFLICT (code) DO NOTHING;

-- ── Seed: markeri (ne kosta nista, ne moze biti addon) ───────
INSERT INTO service_catalog (code, label, category, emoji, unit, price, is_addon_eligible, sort_order)
VALUES
  ('arrival',    'Dolazak',     'marker','⬆','per_person',0, FALSE, 90),
  ('departure',  'Odlazak',     'marker','⬇','per_person',0, FALSE, 91),
  ('party',      'Žurka',       'marker','🎉','per_person',0, FALSE, 92),
  ('live_music', 'Lajv muzika', 'marker','🎸','per_person',0, FALSE, 93)
ON CONFLICT (code) DO NOTHING;
