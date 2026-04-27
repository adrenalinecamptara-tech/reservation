import { createServiceClient } from "@/lib/db/supabase";
import type { Partner, PartnerBooking, PartnerBookingInsert, Floor } from "@/lib/db/types";
import { addDays, rangesOverlap } from "./calendarService";

export async function listPartners(): Promise<Partner[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("partners").select("*").order("name");
  if (error) throw new Error(`Failed to list partners: ${error.message}`);
  return (data ?? []) as Partner[];
}

export async function createPartner(input: {
  name: string;
  default_price_per_person: number;
  notes?: string | null;
}): Promise<Partner> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("partners")
    .insert({
      name: input.name,
      default_price_per_person: input.default_price_per_person,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to create partner: ${error?.message}`);
  return data as Partner;
}

export async function updatePartner(
  id: string,
  input: {
    name?: string;
    default_price_per_person?: number;
    notes?: string | null;
  },
): Promise<Partner> {
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.default_price_per_person !== undefined)
    patch.default_price_per_person = input.default_price_per_person;
  if (input.notes !== undefined) patch.notes = input.notes;
  const { data, error } = await supabase
    .from("partners")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(`Failed to update partner: ${error?.message}`);
  return data as Partner;
}

export async function deletePartner(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { count, error: countErr } = await supabase
    .from("partner_bookings")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", id);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Partner ima rezervacije — prvo obriši ili premesti rezervacije.",
    );
  }
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete partner: ${error.message}`);
}

export async function listPartnerBookings(): Promise<PartnerBooking[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("partner_bookings")
    .select("*, partner:partners(*), cabin:cabins(*)")
    .order("arrival_date", { ascending: false });
  if (error) throw new Error(`Failed to list partner bookings: ${error.message}`);
  return (data ?? []) as PartnerBooking[];
}

export async function getMonthPartnerBookings(
  startIso: string,
  endExclusiveIso: string
): Promise<PartnerBooking[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("partner_bookings")
    .select("*, partner:partners(*), cabin:cabins(*)")
    .lt("arrival_date", endExclusiveIso);
  if (error) throw new Error(`Failed to load partner bookings: ${error.message}`);
  return ((data ?? []) as PartnerBooking[]).filter((b) => {
    const dep = addDays(b.arrival_date, b.nights);
    return rangesOverlap(b.arrival_date, dep, startIso, endExclusiveIso);
  });
}

export async function getAllPartnerBookingsOverlapping(
  arrivalIso: string,
  departureExclusiveIso: string,
  excludeId?: string
): Promise<PartnerBooking[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("partner_bookings")
    .select("*")
    .lt("arrival_date", departureExclusiveIso);
  if (error) throw new Error(`Failed to load partner bookings: ${error.message}`);
  return ((data ?? []) as PartnerBooking[])
    .filter((b) => !excludeId || b.id !== excludeId)
    .filter((b) => {
      const dep = addDays(b.arrival_date, b.nights);
      return rangesOverlap(b.arrival_date, dep, arrivalIso, departureExclusiveIso);
    });
}

export async function createPartnerBooking(
  input: PartnerBookingInsert & { id?: never }
): Promise<PartnerBooking> {
  const supabase = createServiceClient();
  const departure = addDays(input.arrival_date, input.nights);

  // Conflict check: reservations
  const { data: resRows, error: resErr } = await supabase
    .from("reservations")
    .select("id, cabin_id, floor, arrival_date, departure_date, package_type, status, first_name, last_name")
    .neq("status", "cancelled")
    .lt("arrival_date", departure)
    .eq("cabin_id", input.cabin_id)
    .eq("floor", input.floor);
  if (resErr) throw new Error(resErr.message);

  const { deriveDeparture } = await import("./calendarService");
  const guestConflict = (resRows ?? []).find((r) => {
    const dep = deriveDeparture(r.arrival_date, r.departure_date, r.package_type);
    return rangesOverlap(r.arrival_date, dep, input.arrival_date, departure);
  });
  if (guestConflict) {
    throw new Error(
      `Konflikt: ova jedinica je zauzeta rezervacijom (${guestConflict.first_name} ${guestConflict.last_name}) u tom periodu.`
    );
  }

  // Conflict check: other partner bookings
  const partnerConflicts = await getAllPartnerBookingsOverlapping(input.arrival_date, departure);
  const pc = partnerConflicts.find(
    (b) => b.cabin_id === input.cabin_id && b.floor === input.floor
  );
  if (pc) {
    throw new Error("Konflikt: ova jedinica je već zauzeta za drugog partnera u tom periodu.");
  }

  const { data, error } = await supabase
    .from("partner_bookings")
    .insert(input)
    .select("*, partner:partners(*), cabin:cabins(*)")
    .single();
  if (error || !data) throw new Error(`Failed to create partner booking: ${error?.message}`);
  return data as PartnerBooking;
}

export async function deletePartnerBooking(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("partner_bookings").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete partner booking: ${error.message}`);
}

export function partnerBookingDeparture(b: PartnerBooking): string {
  return addDays(b.arrival_date, b.nights);
}

export function partnerBookingTotal(b: PartnerBooking): number {
  return Number(b.price_per_person) * b.number_of_people * b.nights;
}
