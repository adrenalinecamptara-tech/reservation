import { createServiceClient } from "@/lib/db/supabase";
import type {
  Cabin,
  ReservationUnit,
  ReservationUnitInput,
  Floor,
} from "@/lib/db/types";
import {
  getAvailableUnits,
  deriveDeparture,
} from "@/lib/services/calendarService";

export interface CabinAvailability {
  cabin: Cabin;
  groundBedsUsed: number;
  upperBedsUsed: number;
  groundBedsAvailable: number;
  upperBedsAvailable: number;
  isFull: boolean;
}

/**
 * List all active cabins.
 */
export async function listCabins(): Promise<Cabin[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("cabins")
    .select()
    .eq("active", true)
    .order("name");

  if (error) throw new Error(`Failed to list cabins: ${error.message}`);
  return data ?? [];
}

/**
 * Get cabin availability for a specific arrival date.
 * Counts all approved/pending reservations that overlap with the date.
 * Used for calendar display and future OTA sync.
 */
export async function getCabinAvailability(
  date: string, // ISO date string YYYY-MM-DD
): Promise<CabinAvailability[]> {
  const supabase = createServiceClient();

  const [cabinsResult, reservationsResult] = await Promise.all([
    supabase.from("cabins").select().eq("active", true).order("name"),
    supabase
      .from("reservations")
      .select("*")
      .eq("arrival_date", date)
      .in("status", ["pending", "approved"] as const),
  ]);

  if (cabinsResult.error) throw new Error(cabinsResult.error.message);
  if (reservationsResult.error)
    throw new Error(reservationsResult.error.message);

  const cabins = (cabinsResult.data ?? []) as Cabin[];
  const reservations = (reservationsResult.data ??
    []) as import("@/lib/db/types").Reservation[];

  return cabins.map((cabin) => {
    const cabinReservations = reservations.filter(
      (r) => r.cabin_id === cabin.id,
    );
    const groundUsed = cabinReservations
      .filter((r) => r.floor === "ground")
      .reduce((sum, r) => sum + r.number_of_people, 0);
    const upperUsed = cabinReservations
      .filter((r) => r.floor === "upper")
      .reduce((sum, r) => sum + r.number_of_people, 0);

    return {
      cabin,
      groundBedsUsed: groundUsed,
      upperBedsUsed: upperUsed,
      groundBedsAvailable: Math.max(0, cabin.ground_beds - groundUsed),
      upperBedsAvailable: Math.max(0, cabin.upper_beds - upperUsed),
      isFull: groundUsed >= cabin.ground_beds && upperUsed >= cabin.upper_beds,
    };
  });
}

/**
 * Assign a cabin and floor to a reservation.
 */
export async function assignCabin(
  reservationId: string,
  cabinId: string,
  floor: "ground" | "upper",
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("reservations")
    .update({ cabin_id: cabinId, floor })
    .eq("id", reservationId);

  if (error) throw new Error(`Failed to assign cabin: ${error.message}`);
}

/**
 * List reservation units for a reservation (joined with cabin for display).
 */
export async function listReservationUnits(
  reservationId: string,
): Promise<ReservationUnit[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_units")
    .select("*, cabin:cabins(*)")
    .eq("reservation_id", reservationId)
    .order("created_at", { ascending: true });
  if (error)
    throw new Error(`Failed to load reservation units: ${error.message}`);
  return (data ?? []) as unknown as ReservationUnit[];
}

/**
 * Replace all reservation_units for a reservation with the given list.
 * Validates that each (cabin, floor) is free (excluding this reservation) and has enough beds.
 * Updates reservations.cabin_id/floor to the first unit as "primary" for backward compat.
 */
export async function setReservationUnits(
  reservationId: string,
  units: ReservationUnitInput[],
): Promise<void> {
  const supabase = createServiceClient();

  if (units.length === 0) {
    // Clear units + legacy fields
    const { error: delErr } = await supabase
      .from("reservation_units")
      .delete()
      .eq("reservation_id", reservationId);
    if (delErr) throw new Error(`Failed to clear units: ${delErr.message}`);
    await supabase
      .from("reservations")
      .update({ cabin_id: null, floor: null })
      .eq("id", reservationId);
    return;
  }

  // Dedup check — no two rows for same (cabin, floor)
  const seen = new Set<string>();
  for (const u of units) {
    const key = `${u.cabin_id}:${u.floor}`;
    if (seen.has(key)) throw new Error("Ista jedinica je izabrana više puta.");
    seen.add(key);
  }

  // Load reservation for date range & people count
  const { data: reservation, error: resErr } = await supabase
    .from("reservations")
    .select("arrival_date, departure_date, package_type, number_of_people")
    .eq("id", reservationId)
    .single();
  if (resErr || !reservation)
    throw new Error(
      `Reservation not found: ${resErr?.message ?? reservationId}`,
    );

  const arrival = reservation.arrival_date;
  const departure = deriveDeparture(
    arrival,
    reservation.departure_date,
    reservation.package_type,
  );

  // Validate beds per unit
  const cabins = await listCabins();
  const cabinMap = new Map(cabins.map((c) => [c.id, c]));
  for (const u of units) {
    const cabin = cabinMap.get(u.cabin_id);
    if (!cabin) throw new Error("Izabrani bungalov ne postoji.");
    if (u.people_count < 1) throw new Error("Broj ljudi u sobi mora biti ≥ 1.");
    // Kapacitet (ground_beds/upper_beds) više nije tvrda granica — admin može
    // dodeliti više osoba, a worker dashboard će označiti potrebu za dodatnim
    // krevetom.
  }

  const totalPeople = units.reduce((s, u) => s + u.people_count, 0);
  if (totalPeople !== reservation.number_of_people) {
    throw new Error(
      `Zbir ljudi po sobama (${totalPeople}) mora biti jednak broju osoba rezervacije (${reservation.number_of_people}).`,
    );
  }

  // Conflict check — available for this date range, excluding self
  const availability = await getAvailableUnits(
    arrival,
    departure,
    reservationId,
  );
  for (const u of units) {
    const match = availability.find(
      (a) => a.cabin_id === u.cabin_id && a.floor === u.floor,
    );
    if (match && !match.available) {
      const who = match.conflict
        ? ` (${match.conflict.first_name} ${match.conflict.last_name})`
        : "";
      throw new Error(`Jedinica je već zauzeta${who}. Izaberi drugu.`);
    }
  }

  // Replace: delete old, insert new. (Transaction-less — Supabase client does not expose txn; best effort.)
  const { error: delErr } = await supabase
    .from("reservation_units")
    .delete()
    .eq("reservation_id", reservationId);
  if (delErr) throw new Error(`Failed to clear units: ${delErr.message}`);

  const rows = units.map((u) => ({
    reservation_id: reservationId,
    cabin_id: u.cabin_id,
    floor: u.floor as Floor,
    people_count: u.people_count,
  }));
  const { error: insErr } = await supabase
    .from("reservation_units")
    .insert(rows);
  if (insErr) throw new Error(`Failed to save units: ${insErr.message}`);

  // Update legacy primary cabin_id/floor to first unit (status remains unchanged)
  const primary = units[0];
  await supabase
    .from("reservations")
    .update({ cabin_id: primary.cabin_id, floor: primary.floor })
    .eq("id", reservationId);
}

/**
 * Get total camp capacity summary for a date (for dashboard).
 */
export async function getTotalAvailability(date: string): Promise<{
  totalBeds: number;
  usedBeds: number;
  availableBeds: number;
}> {
  const availability = await getCabinAvailability(date);
  const totalBeds = availability.reduce(
    (sum, a) => sum + a.cabin.ground_beds + a.cabin.upper_beds,
    0,
  );
  const usedBeds = availability.reduce(
    (sum, a) => sum + a.groundBedsUsed + a.upperBedsUsed,
    0,
  );
  return { totalBeds, usedBeds, availableBeds: totalBeds - usedBeds };
}
