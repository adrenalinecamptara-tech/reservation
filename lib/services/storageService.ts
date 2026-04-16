import { createServiceClient } from "@/lib/db/supabase";

const BUCKET = "payment-proofs";

/**
 * Generate a signed upload URL so the browser can upload directly to Supabase Storage.
 * This keeps large files off our Next.js server.
 */
export async function getSignedUploadUrl(
  fileName: string,
  mimeType: string
): Promise<{ signedUrl: string; storagePath: string }> {
  const supabase = createServiceClient();

  // Sanitize filename and prefix with timestamp to avoid collisions
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${Date.now()}_${safe}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data)
    throw new Error(`Failed to create upload URL: ${error?.message}`);

  return { signedUrl: data.signedUrl, storagePath };
}

/**
 * Generate a signed download URL for the admin to view a payment proof.
 * URL expires in 1 hour.
 */
export async function getSignedDownloadUrl(storagePath: string): Promise<string> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error || !data)
    throw new Error(`Failed to create download URL: ${error?.message}`);

  return data.signedUrl;
}

/**
 * Delete a payment proof from storage (e.g. on reservation cancellation).
 */
export async function deletePaymentProof(storagePath: string): Promise<void> {
  const supabase = createServiceClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
