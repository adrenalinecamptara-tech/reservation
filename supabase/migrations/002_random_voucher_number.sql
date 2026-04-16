-- ============================================================
-- Migration 002: Random 10-digit unique voucher numbers
-- Replace sequential ACT-YYYY-NNNN with random 10-digit numbers
-- ============================================================

CREATE OR REPLACE FUNCTION generate_voucher_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  candidate TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate random 10-digit number (1000000000–9999999999)
    candidate := LPAD(
      ((FLOOR(RANDOM() * 9000000000) + 1000000000)::BIGINT)::TEXT,
      10, '0'
    );
    SELECT COUNT(*) INTO exists_count
    FROM reservations WHERE voucher_number = candidate;
    EXIT WHEN exists_count = 0;
  END LOOP;

  NEW.voucher_number := candidate;
  RETURN NEW;
END;
$$;
