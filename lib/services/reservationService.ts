import { createServiceClient } from "@/lib/db/supabase";
import type {
  Reservation,
  ReservationInsert,
  ReservationUpdate,
} from "@/lib/db/types";
import { markTokenUsed } from "./linkService";
import { notifyAdmin } from "./emailService";
import { generateVoucher } from "./pdfService";
import { sendVoucherToGuest, sendUpdatedVoucherToGuest } from "./emailService";
import { addDays, deriveDeparture, rangesOverlap } from "./calendarService";

const CAMP_CAPACITY = 40;

/**
 * Create a reservation from guest form submission.
 * Validates the token, inserts the record, marks token used, and notifies admin.
 */
export async function createReservation(
  data: ReservationInsert,
  token: string,
): Promise<Reservation> {
  const supabase = createServiceClient();

  // Pass through new fields (date_of_birth, referral_source, referral_source_other)
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
    console.error("Admin notification failed:", err),
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
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
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
  approvedBy: string,
): Promise<Reservation> {
  const supabase = createServiceClient();

  // Fetch reservation first — allow re-approving if a previous attempt partially failed
  const existing = await getReservation(id);
  if (existing.status === "cancelled") {
    throw new Error("Otkazana rezervacija ne može biti odobrena.");
  }

  // Update status to approved (idempotent — works even if already approved)
  const { data: reservation, error } = await supabase
    .from("reservations")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: existing.approved_at ?? new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, cabin:cabins(*)")
    .single();

  if (error || !reservation)
    throw new Error(
      `Failed to approve reservation: ${error?.message ?? "not found"}`,
    );

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
  data: ReservationUpdate,
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

  if (error || !data)
    throw new Error(`Failed to mark resent: ${error?.message}`);
  return data;
}

/**
 * Cancel a reservation with an optional reason.
 */
export async function cancelReservation(
  id: string,
  reason?: string,
): Promise<Reservation> {
  return updateReservation(id, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason ?? null,
  });
}

/**
 * Confirm in-person payment by a worker scanning the voucher. Idempotent.
 */
export async function confirmPayment(
  id: string,
  paidBy: string,
): Promise<Reservation> {
  const supabase = createServiceClient();
  const existing = await getReservation(id);
  if (existing.status === "cancelled") {
    throw new Error("Otkazana rezervacija ne može biti naplaćena.");
  }
  const { data, error } = await supabase
    .from("reservations")
    .update({
      status: "paid",
      paid_at: existing.paid_at ?? new Date().toISOString(),
      paid_by: existing.paid_by ?? paidBy,
    })
    .eq("id", id)
    .select("*, cabin:cabins(*)")
    .single();
  if (error || !data)
    throw new Error(`Failed to confirm payment: ${error?.message}`);
  return data;
}

/**
 * Get dashboard stats — cancelled reservations are excluded from all counts
 * (total, guests, deposits). They remain in the DB as a paper trail only.
 * `totalRevenue` counts full total_amount only for reservations marked paid.
 */
export async function getStats(): Promise<{
  total: number;
  pending: number;
  approved: number;
  cancelled: number;
  paid: number;
  totalPeople: number;
  totalDeposits: number;
  totalRevenue: number;
}> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("reservations")
    .select("status, number_of_people, deposit_amount, total_amount, paid_at");

  if (error) throw new Error(`Failed to get stats: ${error.message}`);

  const rows = data ?? [];
  const active = rows.filter((r) => r.status !== "cancelled");
  const paidRows = active.filter((r) => r.paid_at);

  return {
    total: active.length,
    pending: active.filter((r) => r.status === "pending").length,
    approved: active.filter(
      (r) => (r.status === "approved" || r.status === "modified") && !r.paid_at,
    ).length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    paid: paidRows.length,
    totalPeople: active.reduce((sum, r) => sum + (r.number_of_people ?? 0), 0),
    totalDeposits: active.reduce(
      (sum, r) => sum + (Number(r.deposit_amount) ?? 0),
      0,
    ),
    totalRevenue: paidRows.reduce(
      (sum, r) => sum + (Number(r.total_amount ?? r.deposit_amount) ?? 0),
      0,
    ),
  };
}

export interface DashboardData {
  today: string;
  todayLabel: string;
  arrivalsToday: Array<{
    id: string;
    name: string;
    people: number;
    package: string | null;
    cabin: string | null;
  }>;
  departuresToday: Array<{
    id: string;
    name: string;
    people: number;
    cabin: string | null;
  }>;
  inCampNow: { people: number; capacity: number; reservations: number };
  weekOccupancy: Array<{
    date: string;
    dayLabel: string;
    people: number;
    capacity: number;
  }>;
  pipeline: {
    pending: number;
    approvedUnpaid: number;
    paid: number;
    cancelled: number;
  };
  money: {
    totalDeposits: number;
    totalRevenue: number;
    outstandingRevenue: number;
    avgPerReservation: number;
    partnerRevenue: number;
  };
  partners: { bookingsCount: number; peopleCount: number; revenue: number };
  pendingList: Reservation[];
}

/**
 * Single-query dashboard payload — daily occupancy, week capacity strip, pipeline, money.
 * Capacity is per-day (40 beds), not seasonal total.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createServiceClient();
  const [resResult, partnerResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("*, cabin:cabins(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_bookings")
      .select("number_of_people, price_per_person"),
  ]);
  const { data, error } = resResult;
  if (error) throw new Error(`Failed to load dashboard: ${error.message}`);
  if (partnerResult.error)
    throw new Error(
      `Failed to load partner bookings: ${partnerResult.error.message}`,
    );
  const partnerRows = partnerResult.data ?? [];

  const all = (data ?? []) as Reservation[];
  const active = all.filter((r) => r.status !== "cancelled");

  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("sr-Latn-RS", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const withDeparture = active.map((r) => ({
    r,
    departure: deriveDeparture(
      r.arrival_date,
      r.departure_date,
      r.package_type,
    ),
  }));

  // Today
  const arrivalsToday = active
    .filter((r) => r.arrival_date === today)
    .map((r) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      people: r.number_of_people,
      package: r.package_type,
      cabin: r.cabin
        ? `${r.cabin.name}${r.floor ? ` — ${r.floor === "ground" ? "Prizemlje" : "Sprat"}` : ""}`
        : null,
    }));

  const departuresToday = withDeparture
    .filter(({ departure }) => departure === today)
    .map(({ r }) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      people: r.number_of_people,
      cabin: r.cabin
        ? `${r.cabin.name}${r.floor ? ` — ${r.floor === "ground" ? "Prizemlje" : "Sprat"}` : ""}`
        : null,
    }));

  // In camp now: arrival <= today < departure
  const inCampRows = withDeparture.filter(
    ({ r, departure }) => r.arrival_date <= today && today < departure,
  );
  const inCampNow = {
    people: inCampRows.reduce((s, { r }) => s + (r.number_of_people ?? 0), 0),
    capacity: CAMP_CAPACITY,
    reservations: inCampRows.length,
  };

  // Week occupancy starting today
  const weekOccupancy = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    const next = addDays(date, 1);
    const people = withDeparture
      .filter(({ r, departure }) =>
        rangesOverlap(r.arrival_date, departure, date, next),
      )
      .reduce((s, { r }) => s + (r.number_of_people ?? 0), 0);
    const dayLabel = new Date(date + "T00:00:00").toLocaleDateString(
      "sr-Latn-RS",
      {
        weekday: "short",
        day: "numeric",
        month: "numeric",
      },
    );
    return { date, dayLabel, people, capacity: CAMP_CAPACITY };
  });

  // Pipeline
  const pipeline = {
    pending: active.filter((r) => r.status === "pending").length,
    approvedUnpaid: active.filter(
      (r) => (r.status === "approved" || r.status === "modified") && !r.paid_at,
    ).length,
    paid: active.filter((r) => r.paid_at).length,
    cancelled: all.filter((r) => r.status === "cancelled").length,
  };

  // Money
  const totalDeposits = active.reduce(
    (s, r) => s + (Number(r.deposit_amount) || 0),
    0,
  );
  const paidRows = active.filter((r) => r.paid_at);
  const totalRevenue = paidRows.reduce(
    (s, r) => s + (Number(r.total_amount ?? r.deposit_amount) || 0),
    0,
  );
  const outstandingRevenue = active
    .filter(
      (r) => (r.status === "approved" || r.status === "modified") && !r.paid_at,
    )
    .reduce((s, r) => s + (Number(r.remaining_amount) || 0), 0);
  const avgPerReservation =
    paidRows.length > 0 ? totalRevenue / paidRows.length : 0;

  const pendingList = active.filter((r) => r.status === "pending").slice(0, 10);

  const partnerPeople = partnerRows.reduce(
    (s, r) => s + (Number(r.number_of_people) || 0),
    0,
  );
  const partnerRevenue = partnerRows.reduce(
    (s, r) =>
      s + (Number(r.price_per_person) || 0) * (Number(r.number_of_people) || 0),
    0,
  );

  return {
    today,
    todayLabel,
    arrivalsToday,
    departuresToday,
    inCampNow,
    weekOccupancy,
    pipeline,
    money: {
      totalDeposits,
      totalRevenue,
      outstandingRevenue,
      avgPerReservation,
      partnerRevenue,
    },
    partners: {
      bookingsCount: partnerRows.length,
      peopleCount: partnerPeople,
      revenue: partnerRevenue,
    },
    pendingList,
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

  const { error } = await supabase.from("reservations").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete reservation: ${error.message}`);
}
