import { createServiceClient } from "@/lib/db/supabase";
import type { Reservation, ReservationStatus, Floor, Cabin } from "@/lib/db/types";

export interface OccupiedReservation {
  id: string;
  kind: "guest" | "partner";
  cabin_id: string;
  floor: Floor;
  arrival: string;
  departure: string;
  status: ReservationStatus;
  first_name: string;
  last_name: string;
  number_of_people: number;
  package_type: string | null;
  voucher_number: string | null;
  partner_name?: string | null;
}

export interface AvailableUnit {
  cabin_id: string;
  cabin_name: string;
  floor: Floor;
  available: boolean;
  conflict?: {
    id: string;
    first_name: string;
    last_name: string;
    arrival: string;
    departure: string;
  };
}

// ── Date helpers ─────────────────────────────────────────────────

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthRange(year: number, month: number): { start: string; endExclusive: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = addDays(start, daysInMonth(year, month));
  return { start, endExclusive: end };
}

export function rangesOverlap(a1: string, d1: string, a2: string, d2: string): boolean {
  return a1 < d2 && a2 < d1;
}

export function eachDayInRange(from: string, toExclusive: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur < toExclusive) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function deriveDeparture(
  arrival: string,
  departure: string | null,
  packageType: string | null
): string {
  if (departure && departure > arrival) return departure;
  const pkg = (packageType ?? "").toLowerCase();
  const fourDay =
    pkg.includes("4") ||
    pkg.includes("balans") ||
    pkg.includes("adrenalin") ||
    pkg.includes("rafting plus") ||
    pkg.includes("cetiri") ||
    pkg.includes("četiri");
  return addDays(arrival, fourDay ? 3 : 2);
}

function toOccupied(r: Reservation): OccupiedReservation | null {
  if (!r.cabin_id || !r.floor) return null;
  return {
    id: r.id,
    kind: "guest",
    cabin_id: r.cabin_id,
    floor: r.floor,
    arrival: r.arrival_date,
    departure: deriveDeparture(r.arrival_date, r.departure_date, r.package_type),
    status: r.status,
    first_name: r.first_name,
    last_name: r.last_name,
    number_of_people: r.number_of_people,
    package_type: r.package_type,
    voucher_number: r.voucher_number,
  };
}

interface PartnerBookingRow {
  id: string;
  cabin_id: string;
  floor: Floor;
  arrival_date: string;
  nights: number;
  number_of_people: number;
  partner?: { name: string } | null;
}

function partnerToOccupied(b: PartnerBookingRow): OccupiedReservation {
  const name = b.partner?.name ?? "Partner";
  return {
    id: b.id,
    kind: "partner",
    cabin_id: b.cabin_id,
    floor: b.floor,
    arrival: b.arrival_date,
    departure: addDays(b.arrival_date, b.nights),
    status: "approved",
    first_name: name,
    last_name: "",
    number_of_people: b.number_of_people,
    package_type: null,
    voucher_number: null,
    partner_name: name,
  };
}

// ── Queries ──────────────────────────────────────────────────────

export async function getMonthReservations(
  year: number,
  month: number
): Promise<OccupiedReservation[]> {
  const supabase = createServiceClient();
  const { start, endExclusive } = monthRange(year, month);

  const [resResult, partnerResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("*")
      .neq("status", "cancelled")
      .lt("arrival_date", endExclusive),
    supabase
      .from("partner_bookings")
      .select("id, cabin_id, floor, arrival_date, nights, number_of_people, partner:partners(name)")
      .lt("arrival_date", endExclusive),
  ]);

  if (resResult.error) throw new Error(`Failed to load month reservations: ${resResult.error.message}`);
  if (partnerResult.error) throw new Error(`Failed to load partner bookings: ${partnerResult.error.message}`);

  const guestOccupied = ((resResult.data ?? []) as Reservation[])
    .map(toOccupied)
    .filter((r): r is OccupiedReservation => r !== null)
    .filter((r) => rangesOverlap(r.arrival, r.departure, start, endExclusive));

  const partnerRows = (partnerResult.data ?? []) as unknown as PartnerBookingRow[];
  const partnerOccupied = partnerRows
    .map(partnerToOccupied)
    .filter((r) => rangesOverlap(r.arrival, r.departure, start, endExclusive));

  return [...guestOccupied, ...partnerOccupied];
}

export async function getAvailableUnits(
  arrival: string,
  departure: string,
  excludeReservationId?: string
): Promise<AvailableUnit[]> {
  const supabase = createServiceClient();

  const [cabinsResult, reservationsResult, partnersResult] = await Promise.all([
    supabase.from("cabins").select().eq("active", true).order("name"),
    supabase
      .from("reservations")
      .select("*")
      .neq("status", "cancelled")
      .lt("arrival_date", departure),
    supabase
      .from("partner_bookings")
      .select("id, cabin_id, floor, arrival_date, nights, number_of_people, partner:partners(name)")
      .lt("arrival_date", departure),
  ]);

  if (cabinsResult.error) throw new Error(cabinsResult.error.message);
  if (reservationsResult.error) throw new Error(reservationsResult.error.message);
  if (partnersResult.error) throw new Error(partnersResult.error.message);

  const cabins = (cabinsResult.data ?? []) as Cabin[];
  const guestReservations = ((reservationsResult.data ?? []) as Reservation[])
    .filter((r) => !excludeReservationId || r.id !== excludeReservationId)
    .map(toOccupied)
    .filter((r): r is OccupiedReservation => r !== null)
    .filter((r) => rangesOverlap(r.arrival, r.departure, arrival, departure));

  const partnerRows = (partnersResult.data ?? []) as unknown as PartnerBookingRow[];
  const partnerOccupied = partnerRows
    .map(partnerToOccupied)
    .filter((r) => rangesOverlap(r.arrival, r.departure, arrival, departure));

  const reservations = [...guestReservations, ...partnerOccupied];

  const units: AvailableUnit[] = [];
  for (const cabin of cabins) {
    for (const floor of ["ground", "upper"] as const) {
      const conflict = reservations.find(
        (r) => r.cabin_id === cabin.id && r.floor === floor
      );
      units.push({
        cabin_id: cabin.id,
        cabin_name: cabin.name,
        floor,
        available: !conflict,
        conflict: conflict
          ? {
              id: conflict.id,
              first_name: conflict.first_name,
              last_name: conflict.last_name,
              arrival: conflict.arrival,
              departure: conflict.departure,
            }
          : undefined,
      });
    }
  }
  return units;
}
