-- ============================================================
-- Migration 017: Skini "živa muzika" iz description-a
--
-- Živa muzika se renderuje runtime u emailu samo kad je dan SUBOTA i
-- nije zadnji dan paketa (dan odlaska). Description ostaje čist tekst
-- bez pomena žive muzike — logika je u email template-u.
--
-- Idempotentno: drugi run preskače jer NOT LIKE već-ocišćen tekst.
-- ============================================================

UPDATE packages
SET day_schedule = regexp_replace(
  day_schedule::text,
  ' i živa muzika',
  '',
  'g'
)::jsonb
WHERE day_schedule IS NOT NULL
  AND day_schedule::text LIKE '% i živa muzika%';

UPDATE packages
SET day_schedule = regexp_replace(
  day_schedule::text,
  ' uz živu muziku',
  '',
  'g'
)::jsonb
WHERE day_schedule IS NOT NULL
  AND day_schedule::text LIKE '% uz živu muziku%';
