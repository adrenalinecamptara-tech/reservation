-- Track in-person payment confirmation by worker on /verify page
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS paid_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_by  TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_paid_at ON reservations(paid_at);
