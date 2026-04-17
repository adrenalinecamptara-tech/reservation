import { createServiceClient } from "@/lib/db/supabase";
import type { Reservation, ReservationInsert, ReservationUpdate } from "@/lib/db/types";
import { markTokenUsed } from "./linkService";
import { notifyAdmin } from "./emailService";
import { generateVoucher } from "./pdfService";
import { sendVoucherToGuest, sendUpdatedVoucherToGuest } from "./emailService";

/**
 * Create a reservation from guest form submission.
 * Validates the token, inserts the record, marks token used, and notifies admin.
 */
export async function createReservation(
  data: ReservationInsert,
  token: string
): Promise<Reservation> {
  const supabase = createServiceClient();

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert(data)
    .select("*, cabin:cabins(*)")
    .single();

  if (error) throw new Error(`Failed to create reservation: ${error.message}`);

  // Mark invite link as used
  await markTokenUsed(token);

  // Notify admin via email (non-blocking — don't fail the whole flow if email fails)
  notifyAdmin(reservation).catch((err) =>
    console.error("Admin notification failed:", err)
  );

  return reservation;
}

/**
 * Get a single reservation by ID with cabin data joined.
 */
export async function getReservation(id: string): Promise<Reservation> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("*, cabin:cabins(*)")
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(`Reservation not found: ${id}`);
  return data;
}

/**
 * List reservations with optional filters.
 */
export async function listReservations(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<Reservation[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("reservations")
    .select("*, cabin:cabins(*)")
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status as any);
  }
  if (filters?.dateFrom) {
    query = query.gte("arrival_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("arrival_date", filters.dateTo);
  }
  if (filters?.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list reservations: ${error.message}`);
  return data ?? [];
}

/**
 * Approve a reservation — generates PDF voucher and emails it to the guest.
 */
export async function approveReservation(
  id: string,
  approvedBy: string
): Promise<Reservation> {
  const supabase = createServiceClient();

  // Update status to approved
  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending") // Only approve pending reservations
    .select("*, cabin:cabins(*)")
    .single();

  if (error || !reservation)
    throw new Error(`Failed to approve reservation: ${error?.message ?? "not found or already processed"}`);

  // Generate PDF voucher
  const pdfBuffer = await generateVoucher(reservation);

  // Send to guest
  await sendVoucherToGuest(reservation, pdfBuffer);

  // Mark voucher as sent
  await supabase
    .from("reservations")
    .update({ voucher_sent_at: new Date().toISOString() })
    .eq("id", id);

  return { ...reservation, voucher_sent_at: new Date().toISOString() };
}

/**
 * Update reservation fields (cabin assignment, notes, dates, status).
 */
export async function updateReservation(
  id: string,
  data: ReservationUpdate
): Promise<Reservation> {
  const supabase = createServiceClient();

  const { data: reservation, error } = await supabase
    .from("reservations")
    .update(data)
    .eq("id", id)
    .select("*, cabin:cabins(*)")
    .single();

  if (error || !reservation)
    throw new Error(`Failed to update reservation: ${error?.message}`);
  return reservation;
}

/**
 * Regenerate the voucher PDF and resend it to the guest as an update confirmation.
 * Sets status to "modified".
 */
export async function resendVoucher(id: string): Promise<Reservation> {
  const reservation = await getReservation(id);
  const pdfBuffer = await generateVoucher(reservation);
  await sendUpdatedVoucherToGuest(reservation, pdfBuffer);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservations")
    .update({
      status: "modified",
      voucher_sent_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, cabin:cabins(*)")
    .single();

  if (error || !data) throw new Error(`Failed to mark resent: ${error?.message}`);
  return data;
}

/**
 * Cancel a reservation with an optional reason.
 */
export async function cancelReservation(
  id: string,
  reason?: string
): Promise<Reservation> {
  return updateReservation(id, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason ?? null,
  });
}

/**
 * Get dashboard stats — cancelled reservations are excluded from all counts
 * (total, guests, deposits). They remain in the DB as a paper trail only.
 */
export async function getStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  cancelled: number;
  totalPeople: number;
  totalDeposits: number;
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("status, number_of_people, deposit_amount");

  if (error) throw new Error(`Failed to get stats: ${error.message}`);

  const rows = data ?? [];
  const active = rows.filter((r) => r.status !== "cancelled");

  return {
    total: active.length,
    pending: active.filter((r) => r.status === "pending").length,
    approved: active.filter((r) => r.status === "approved" || r.status === "modified").length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    totalPeople: active.reduce((sum, r) => sum + (r.number_of_people ?? 0), 0),
    totalDeposits: active.reduce((sum, r) => sum + (Number(r.deposit_amount) ?? 0), 0),
  };
}

/**
 * Delete a reservation and its associated payment proof from storage.
 */
export async function deleteReservation(id: string): Promise<void> {
  const supabase = createServiceClient();

  // Fetch payment_proof_path before deleting
  const { data: reservation } = await supabase
    .from("reservations")
    .select("payment_proof_path")
    .eq("id", id)
    .single();

  // Delete storage file if it exists
  if (reservation?.payment_proof_path) {
    await supabase.storage
      .from("payment-proofs")
      .remove([reservation.payment_proof_path]);
  }

  const { error } = await supabase
    .from("reservations")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete reservation: ${error.message}`);
}
