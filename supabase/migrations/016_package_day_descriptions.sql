-- ============================================================
-- Migration 016: Per-day description on package day_schedule
-- Email template "Šta te čeka" sekcija koristi description ako postoji.
-- Naslov dana se računa runtime: "Petak — Dolazak + Žurka" iz
-- (arrival_date + dayIdx) → naziv dana, plus aktivnosti spojene sa "+".
-- ============================================================

-- Trodnevni Maj / Savršen vikend / Team building (3 dana)
UPDATE packages
SET day_schedule = jsonb_set(
  jsonb_set(
    jsonb_set(
      day_schedule,
      '{0,description}',
        '"Dođi kad možeš, sobe su spremne. Uveče večera, pa DJ i muzika u restoranu."'::jsonb
    ),
    '{1,description}',
      '"Doručak do 10h, polazak na rafting u 11h. Po povratku ručak, slobodno vreme, odbojka, bilijar. Uveče večera i živa muzika."'::jsonb
  ),
  '{2,description}',
    '"Doručak, i polako se spremi za povratak u realnost prepun utiska i energije."'::jsonb
)
WHERE day_schedule IS NOT NULL
  AND name IN ('Trodnevni Maj','Savršen vikend','Team building');

-- Porodični kombo (3 dana, choice dan 2)
UPDATE packages
SET day_schedule = jsonb_set(
  jsonb_set(
    jsonb_set(
      day_schedule,
      '{0,description}',
        '"Dolazak u kamp, smeštaj, prva večera i opuštanje uz muziku."'::jsonb
    ),
    '{1,description}',
      '"Rafting i jedna aktivnost po vašem izboru (jahanje, jeep safari, kvadovi ili izlet). Uveče zajedničko opuštanje uz večeru i muziku."'::jsonb
  ),
  '{2,description}',
    '"Doručak i miran povratak kući."'::jsonb
)
WHERE day_schedule IS NOT NULL
  AND name = 'Porodični kombo';

-- Balans (3 dana, hiking + safari)
UPDATE packages
SET day_schedule = jsonb_set(
  jsonb_set(
    jsonb_set(
      day_schedule,
      '{0,description}',
        '"Dolazak, smeštaj i prva večera uz muziku."'::jsonb
    ),
    '{1,description}',
      '"Doručak, zatim rafting i hajking po prelepim predelima Tare. Uveče večera i druženje."'::jsonb
  ),
  '{2,description}',
    '"Doručak, ručak i jeep safari kao završnica, pa polako put kući."'::jsonb
)
WHERE day_schedule IS NOT NULL
  AND name = 'Balans - Rafting i Safari';

-- Adrenalin (4 dana, 2x rafting + ATV)
UPDATE packages
SET day_schedule = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        day_schedule,
        '{0,description}',
          '"Dolazak, smeštaj i prva večera uz živu muziku."'::jsonb
      ),
      '{1,description}',
        '"Doručak, polazak na rafting u 11h, ručak po povratku, slobodno vreme, večera i muzika."'::jsonb
    ),
    '{2,description}',
      '"Drugi rafting + kvadovska tura kroz planinu. Uveče večera i muzika."'::jsonb
  ),
  '{3,description}',
    '"Doručak i polako put kući."'::jsonb
)
WHERE day_schedule IS NOT NULL
  AND name = 'Adrenalin - Rafting i Kvadovi';

-- Rafting plus (4 dana, choice dan 3)
UPDATE packages
SET day_schedule = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        day_schedule,
        '{0,description}',
          '"Dolazak, smeštaj i prva večera uz muziku."'::jsonb
      ),
      '{1,description}',
        '"Doručak, polazak na rafting u 11h, ručak po povratku, slobodno vreme, večera i muzika."'::jsonb
    ),
    '{2,description}',
      '"Aktivnost po vašem izboru (kanjoning, jahanje, biciklizam, kvadovi ili izlet). Uveče večera i druženje."'::jsonb
  ),
  '{3,description}',
    '"Doručak i polako put kući."'::jsonb
)
WHERE day_schedule IS NOT NULL
  AND name = 'Rafting plus';
