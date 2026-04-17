-- ============================================================
-- Migration 004: Separate verify_code from voucher_number
--
-- voucher_number stays as ACT-YYYY-NNNN (sequential, admin ref)
-- verify_code is a new random 10-digit field used for the QR
-- code URL and verification page (/verify/[verifyCode])
-- ============================================================

-- Restore voucher_number to sequential ACT-YYYY-NNNN
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

-- Add verify_code column
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS verify_code TEXT UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_verify_code
  ON reservations(verify_code);

-- Function to generate a unique random 10-digit verify code
CREATE OR REPLACE FUNCTION generate_verify_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate    TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    candidate := LPAD(
      ((FLOOR(RANDOM() * 9000000000) + 1000000000)::BIGINT)::TEXT,
      10, '0'
    );
    SELECT COUNT(*) INTO exists_count
    FROM reservations WHERE verify_code = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;

  NEW.verify_code := candidate;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_verify_code
  BEFORE INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION generate_verify_code();

-- Backfill verify_code for any existing rows that don't have one
DO $$
DECLARE
  r RECORD;
  candidate TEXT;
  exists_count INTEGER;
BEGIN
  FOR r IN SELECT id FROM reservations WHERE verify_code IS NULL LOOP
    LOOP
      candidate := LPAD(
        ((FLOOR(RANDOM() * 9000000000) + 1000000000)::BIGINT)::TEXT,
        10, '0'
      );
      SELECT COUNT(*) INTO exists_count
      FROM reservations WHERE verify_code = candidate;
      EXIT WHEN exists_count = 0;
    END LOOP;
    UPDATE reservations SET verify_code = candidate WHERE id = r.id;
  END LOOP;
END;
$$;
