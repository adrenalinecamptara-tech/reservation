import { createServiceClient } from "@/lib/db/supabase";
import type {
  Cabin,
  HoldStatus,
  ReservationHold,
  ReservationHoldInsert,
  ReservationHoldUnit,
  ReservationHoldUnitInput,
} from "@/lib/db/types";
import { listCabins } from "@/lib/services/cabinService";
import {
  getAvailableUnits,
  rangesOverlap,
} from "@/lib/services/calendarService";

type HoldUpdate = Partial<ReservationHoldInsert>;
type HoldCreateInput = ReservationHoldInsert & {
  units?: ReservationHoldUnitInput[];
};

export { getEffectiveHoldStatus } from "@/lib/utils/holdStatus";
import { getEffectiveHoldStatus } from "@/lib/utils/holdStatus";

function assertHoldDates(input: {
  arrival_date: string;
  departure_date: string;
  hold_until_date: string;
}) {
  if (!input.arrival_date || !input.departure_date || !input.hold_until_date) {
    throw new Error("Datumi su obavezni.");
  }
  if (input.departure_date <= input.arrival_date) {
    throw new Error("Datum odlaska mora biti posle datuma dolaska.");
  }
}

async function assertUnitAvailable(
  cabinId: string,
  floor: "ground" | "upper",
  arrival: string,
  departure: string,
  excludeHoldId?: string,
) {
  const units = await getAvailableUnits(
    arrival,
    departure,
    undefined,
    excludeHoldId,
  );
  const target = units.find((u) => u.cabin_id === cabinId && u.floor === floor);
  if (target && !target.available) {
    const c = target.conflict;
    throw new Error(
      c
        ? `Jedinica je zauzeta (${c.first_name} ${c.last_name}, ${c.arrival} → ${c.departure}).`
        : "Jedinica je zauzeta za izabrani period.",
    );
  }
}

function normalizeHoldUnits(
  units: ReservationHoldUnitInput[] | undefined,
  fallback: Pick<
    ReservationHoldInsert,
    "cabin_id" | "floor" | "number_of_people"
  >,
): ReservationHoldUnitInput[] {
  if (units && units.length > 0) return units;
  return [
    {
      cabin_id: fallback.cabin_id,
      floor: fallback.floor,
      people_count: fallback.number_of_people,
    },
  ];
}

async function assertUnitsValid(
  units: ReservationHoldUnitInput[],
  totalPeople: number,
  arrival: string,
  departure: string,
  excludeHoldId?: string,
) {
  if (units.length === 0) throw new Error("Dodaj bar jednu sobu.");

  const seen = new Set<string>();
  for (const unit of units) {
    const key = `${unit.cabin_id}:${unit.floor}`;
    if (seen.has(key)) throw new Error("Ista soba je izabrana više puta.");
    seen.add(key);
  }

  const cabins = await listCabins();
  const cabinMap = new Map<string, Cabin>(cabins.map((c) => [c.id, c]));
  for (const unit of units) {
    const cabin = cabinMap.get(unit.cabin_id);
    if (!cabin) throw new Error("Izabrani bungalov ne postoji.");
    if (unit.people_count < 1)
      throw new Error("Svaka soba mora imati bar 1 osobu.");
    // Kapacitet (ground_beds/upper_beds) više nije tvrda granica.
  }

  const sum = units.reduce((acc, unit) => acc + unit.people_count, 0);
  if (sum !== totalPeople) {
    throw new Error(
      `Zbir ljudi po sobama (${sum}) mora biti jednak broju osoba hold rezervacije (${totalPeople}).`,
    );
  }

  for (const unit of units) {
    await assertUnitAvailable(
      unit.cabin_id,
      unit.floor,
      arrival,
      departure,
      excludeHoldId,
    );
  }
}

export async function listReservationHolds(): Promise<ReservationHold[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .select(
      "*, cabin:cabins(*), reservation_hold_units(*, cabin:cabins(*))",
    )
    .order("created_at", { ascending: false });

  if (error)
    throw new Error(`Failed to list reservation holds: ${error.message}`);
  return (data ?? []) as ReservationHold[];
}

export async function listReservationHoldUnits(
  reservationHoldId: string,
): Promise<ReservationHoldUnit[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_hold_units")
    .select("*, cabin:cabins(*)")
    .eq("reservation_hold_id", reservationHoldId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load hold units: ${error.message}`);
  return (data ?? []) as ReservationHoldUnit[];
}

export async function createReservationHold(
  input: HoldCreateInput,
): Promise<ReservationHold> {
  assertHoldDates(input);
  const units = normalizeHoldUnits(input.units, input);
  await assertUnitsValid(
    units,
    input.number_of_people,
    input.arrival_date,
    input.departure_date,
  );

  const primary = units[0];
  const { units: _units, ...holdInput } = input;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .insert({
      ...holdInput,
      cabin_id: primary.cabin_id,
      floor: primary.floor,
      status: input.status ?? "active",
    })
    .select("*, cabin:cabins(*)")
    .single();

  if (error || !data)
    throw new Error(
      `Failed to create reservation hold: ${error?.message ?? "unknown"}`,
    );

  const rows = units.map((unit) => ({
    reservation_hold_id: data.id,
    cabin_id: unit.cabin_id,
    floor: unit.floor,
    people_count: unit.people_count,
  }));
  const { error: unitsErr } = await supabase
    .from("reservation_hold_units")
    .insert(rows);
  if (unitsErr) {
    // Rollback: ukloni upravo kreirani hold da ne ostane siroce bez jedinica.
    await supabase.from("reservation_holds").delete().eq("id", data.id);
    throw new Error(`Failed to save hold units: ${unitsErr.message}`);
  }

  return data as ReservationHold;
}

export async function getMonthReservationHolds(
  startIso: string,
  endExclusiveIso: string,
): Promise<ReservationHold[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .select("*, cabin:cabins(*)")
    .in("status", ["active", "expired"] as const)
    .lt("arrival_date", endExclusiveIso);

  if (error)
    throw new Error(`Failed to load reservation holds: ${error.message}`);

  return ((data ?? []) as ReservationHold[]).filter((h) =>
    rangesOverlap(h.arrival_date, h.departure_date, startIso, endExclusiveIso),
  );
}

export async function getReservationHold(id: string): Promise<ReservationHold> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .select("*, cabin:cabins(*)")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(`Hold not found: ${id}`);
  return data as ReservationHold;
}

export async function setReservationHoldUnits(
  reservationHoldId: string,
  units: ReservationHoldUnitInput[],
): Promise<void> {
  const supabase = createServiceClient();
  const current = await getReservationHold(reservationHoldId);
  await assertUnitsValid(
    units,
    current.number_of_people,
    current.arrival_date,
    current.departure_date,
    reservationHoldId,
  );

  const { error: delErr } = await supabase
    .from("reservation_hold_units")
    .delete()
    .eq("reservation_hold_id", reservationHoldId);
  if (delErr) throw new Error(`Failed to clear hold units: ${delErr.message}`);

  const rows = units.map((unit) => ({
    reservation_hold_id: reservationHoldId,
    cabin_id: unit.cabin_id,
    floor: unit.floor,
    people_count: unit.people_count,
  }));
  const { error: insErr } = await supabase
    .from("reservation_hold_units")
    .insert(rows);
  if (insErr) throw new Error(`Failed to save hold units: ${insErr.message}`);

  const primary = units[0];
  const { error: updErr } = await supabase
    .from("reservation_holds")
    .update({ cabin_id: primary.cabin_id, floor: primary.floor })
    .eq("id", reservationHoldId);
  if (updErr)
    throw new Error(`Failed to mirror primary hold unit: ${updErr.message}`);
}

export async function updateReservationHold(
  id: string,
  patch: HoldUpdate,
): Promise<ReservationHold> {
  const current = await getReservationHold(id);
  const next = {
    ...current,
    ...patch,
    status: patch.status ?? current.status,
  };

  assertHoldDates({
    arrival_date: String(next.arrival_date),
    departure_date: String(next.departure_date),
    hold_until_date: String(next.hold_until_date),
  });

  if (next.status === "active" || next.status === "expired") {
    const existingUnits = await listReservationHoldUnits(id);
    const units =
      existingUnits.length > 0
        ? existingUnits.map((unit) => ({
            cabin_id: unit.cabin_id,
            floor: unit.floor,
            people_count: unit.people_count,
          }))
        : [
            {
              cabin_id: String(next.cabin_id),
              floor: next.floor,
              people_count: Number(next.number_of_people),
            },
          ];
    await assertUnitsValid(
      units,
      Number(next.number_of_people),
      String(next.arrival_date),
      String(next.departure_date),
      id,
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .update(patch)
    .eq("id", id)
    .select("*, cabin:cabins(*)")
    .single();
  if (error || !data)
    throw new Error(
      `Failed to update reservation hold: ${error?.message ?? "unknown"}`,
    );
  return data as ReservationHold;
}

export async function setReservationHoldStatus(
  id: string,
  status: HoldStatus,
): Promise<ReservationHold> {
  return updateReservationHold(id, { status });
}

export async function deleteReservationHold(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("reservation_holds")
    .delete()
    .eq("id", id);
  if (error)
    throw new Error(`Failed to delete reservation hold: ${error.message}`);
}

export async function getOverlappingReservationHolds(
  arrival: string,
  departure: string,
  excludeHoldId?: string,
): Promise<ReservationHold[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("reservation_holds")
    .select("*")
    .in("status", ["active", "expired"] as const)
    .lt("arrival_date", departure);

  if (error)
    throw new Error(
      `Failed to load overlapping reservation holds: ${error.message}`,
    );

  return ((data ?? []) as ReservationHold[])
    .filter((h) => !excludeHoldId || h.id !== excludeHoldId)
    .filter((h) =>
      rangesOverlap(h.arrival_date, h.departure_date, arrival, departure),
    );
}
