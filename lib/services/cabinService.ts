import { createServiceClient } from "@/lib/db/supabase";
import type { Cabin } from "@/lib/db/types";

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
  date: string // ISO date string YYYY-MM-DD
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
  if (reservationsResult.error) throw new Error(reservationsResult.error.message);

  const cabins = (cabinsResult.data ?? []) as Cabin[];
  const reservations = (reservationsResult.data ?? []) as import("@/lib/db/types").Reservation[];

  return cabins.map((cabin) => {
    const cabinReservations = reservations.filter((r) => r.cabin_id === cabin.id);
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
      isFull:
        groundUsed >= cabin.ground_beds && upperUsed >= cabin.upper_beds,
    };
  });
}

/**
 * Assign a cabin and floor to a reservation.
 */
export async function assignCabin(
  reservationId: string,
  cabinId: string,
  floor: "ground" | "upper"
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("reservations")
    .update({ cabin_id: cabinId, floor, status: "modified" as const })
    .eq("id", reservationId);

  if (error) throw new Error(`Failed to assign cabin: ${error.message}`);
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
    0
  );
  const usedBeds = availability.reduce(
    (sum, a) => sum + a.groundBedsUsed + a.upperBedsUsed,
    0
  );
  return { totalBeds, usedBeds, availableBeds: totalBeds - usedBeds };
}
