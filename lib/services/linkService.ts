import { createServiceClient } from "@/lib/db/supabase";
import type { InviteLink } from "@/lib/db/types";
import { randomBytes } from "crypto";

/**
 * Generate a cryptographically random URL-safe token.
 */
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Generate a new invite link for a guest.
 * Admin calls this after receiving a deposit from the guest.
 */
export async function generateInviteLink(options: {
  createdBy: string;
  notes?: string;
  expiresInHours?: number;
}): Promise<InviteLink> {
  const supabase = createServiceClient();
  const token = generateToken();

  const expiresAt = options.expiresInHours
    ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("invite_links")
    .insert({
      token,
      created_by: options.createdBy,
      notes: options.notes ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create invite link: ${error.message}`);
  return data;
}

/**
 * Validate a token. Returns the link if valid, null if invalid/expired/used.
 */
export async function validateToken(token: string): Promise<InviteLink | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("invite_links")
    .select()
    .eq("token", token)
    .single();

  if (error || !data) return null;
  if (data.used) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  return data;
}

/**
 * Mark a token as used (called after guest submits the form).
 */
export async function markTokenUsed(token: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("invite_links")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("token", token);

  if (error) throw new Error(`Failed to mark token used: ${error.message}`);
}

/**
 * List all invite links (admin portal).
 */
export async function listLinks(): Promise<InviteLink[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("invite_links")
    .select()
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list links: ${error.message}`);
  return data ?? [];
}
