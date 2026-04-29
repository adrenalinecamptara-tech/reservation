-- ============================================================
-- Migration 022: Robust voucher_number generator
-- Stari generator je koristio COUNT(*) + 1 — pucao bi na duplikat
-- ako je rezervacija obrisana (count daje rupu) ili pri konkurentnom
-- insertu (race condition).
--
-- Novi generator: MAX(seq) + 1 sa retry loop-om dok ne nađe slobodan
-- broj. Eliminiše glavni izvor `reservations_voucher_number_key`
-- duplicate violation grešaka.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_voucher_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  year_str     TEXT := to_char(now(), 'YYYY');
  max_seq      INTEGER;
  candidate    TEXT;
  exists_count INTEGER;
BEGIN
  -- Krećemo od najvećeg sekvencijalnog broja te godine + 1
  SELECT COALESCE(
    MAX(NULLIF(regexp_replace(voucher_number, '^ACT-' || year_str || '-', ''), '')::INTEGER),
    0
  )
    INTO max_seq
    FROM reservations
   WHERE voucher_number LIKE 'ACT-' || year_str || '-%';

  -- Retry petlja u slučaju race condition-a
  LOOP
    max_seq := max_seq + 1;
    candidate := 'ACT-' || year_str || '-' || lpad(max_seq::TEXT, 4, '0');
    SELECT COUNT(*) INTO exists_count
      FROM reservations WHERE voucher_number = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;

  NEW.voucher_number := candidate;
  RETURN NEW;
END;
$$;
