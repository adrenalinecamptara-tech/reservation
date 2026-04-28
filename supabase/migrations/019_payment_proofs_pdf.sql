-- ============================================================
-- Migration 019: Allow PDF u "payment-proofs" Storage bucket-u
-- Bucket je kreiran kroz Supabase UI; kod (PaymentStep i upload route) već
-- prihvata PDF, ali bucket-ov allowed_mime_types nije imao 'application/pdf'.
-- Ova migracija dodaje PDF u dozvoljene tipove i podiže limit na 10 MB.
-- Idempotentno: ON CONFLICT update.
-- ============================================================

INSERT INTO storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760, -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'],
  file_size_limit = 10485760;
