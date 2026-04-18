-- Add "paid" lifecycle status — set when worker confirms in-person payment via /verify
ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'paid';
