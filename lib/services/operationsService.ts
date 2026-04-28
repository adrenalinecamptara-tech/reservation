import { createServiceClient } from "@/lib/db/supabase";
import type {
  Package,
  PartnerBooking,
  Reservation,
} from "@/lib/db/types";
import {
  ACTIVITY_TYPES,
  MEAL_TYPES,
  isChoice,
  selectionKey,
  type ActivityType,
  type MealType,
  type PackageDay,
  type Selections,
} from "@/lib/constants/activities";
import {
  addDays,
  deriveDeparture,
  eachDayInRange,
  rangesOverlap,
} from "./calendarService";

export interface GuestRef {
  id: string;
  name: string;
  people: number;
  kind: "guest" | "partner";
}

export interface DayOperations {
  date: string;
  dayLabel: string;
  arrivals: GuestRef[];
  departures: GuestRef[];
  inCampPeople: number;
  meals: Record<MealType, number>;
  activities: Partial<Record<ActivityType, GuestRef[]>>;
}

export interface WeekOperations {
  startIso: string;
  endIsoExclusive: string;
  days: DayOperations[];
}

function emptyMeals(): Record<MealType, number> {
  return { breakfast: 0, lunch: 0, dinner: 0 };
}

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("sr-Latn-RS", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

function pushActivity(
  dayOps: DayOperations,
  activity: ActivityType,
  ref: GuestRef,
) {
  if (!dayOps.activities[activity]) dayOps.activities[activity] = [];
  dayOps.activities[activity]!.push(ref);
}

function isMeal(code: string): code is MealType {
  return (MEAL_TYPES as readonly string[]).includes(code);
}
function isActivity(code: string): code is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(code);
}

/**
 * Razresenje gostovih izbora u operativi:
 *   - prioritet: reservations.day_schedule_snapshot (sacuvan u trenutku rezervacije)
 *   - fallback: package.day_schedule (paket koji je gost izabrao)
 *
 * Za choice slot citamo selections.choices[<key>]; ako gost nije izabrao
 * (legacy ili nezavrsena rezervacija), uzimamo prvu opciju kao placeholder.
 *
 * Addone iz selections.addons[<dayIdx>] takodje brojimo:
 *   - meal codes (breakfast/lunch/dinner) idu u meals counter
 *   - activity codes idu u activities listu sa GuestRef
 */
function applyReservation(
  res: Reservation,
  pkg: Package | undefined,
  byDate: Map<string, DayOperations>,
) {
  const departure = deriveDeparture(
    res.arrival_date,
    res.departure_date,
    res.package_type,
  );
  const ref: GuestRef = {
    id: res.id,
    name: `${res.first_name} ${res.last_name}`.trim() || "Gost",
    people: res.number_of_people,
    kind: "guest",
  };

  // Arrival / departure markers
  const arrDay = byDate.get(res.arrival_date);
  if (arrDay) arrDay.arrivals.push(ref);
  const depDay = byDate.get(departure);
  if (depDay) depDay.departures.push(ref);

  const schedule: PackageDay[] | null =
    res.day_schedule_snapshot ?? pkg?.day_schedule ?? null;
  const sel: Selections = res.selections ?? {};

  const stayDays = eachDayInRange(res.arrival_date, departure);
  stayDays.forEach((iso, idx) => {
    const dayOps = byDate.get(iso);
    if (!dayOps) return;
    dayOps.inCampPeople += res.number_of_people;

    if (!schedule || schedule.length === 0) return;
    const entry =
      schedule.find((s) => s.day === idx + 1) ?? schedule[schedule.length - 1];
    if (!entry) return;

    // Meals (static + razresen choice)
    entry.meals.forEach((e, entryIdx) => {
      let code: string | null = null;
      if (isChoice(e)) {
        const key = selectionKey(idx, "meals", entryIdx);
        code = sel.choices?.[key] ?? e[0] ?? null;
      } else {
        code = e;
      }
      if (code && isMeal(code))
        dayOps.meals[code] += res.number_of_people;
    });

    // Activities (static + razresen choice)
    entry.activities.forEach((e, entryIdx) => {
      let code: string | null = null;
      if (isChoice(e)) {
        const key = selectionKey(idx, "activities", entryIdx);
        code = sel.choices?.[key] ?? e[0] ?? null;
      } else {
        code = e;
      }
      if (code && isActivity(code)) pushActivity(dayOps, code, ref);
    });

    // Addons — gost je dokupio
    const addonCodes = sel.addons?.[String(idx)] ?? [];
    for (const code of addonCodes) {
      if (isMeal(code)) {
        dayOps.meals[code] += res.number_of_people;
      } else if (isActivity(code)) {
        pushActivity(dayOps, code, ref);
      }
    }
  });
}

/**
 * Partneri: pretpostavljamo da jedu u kampu (3 obroka/dan tokom boravka).
 * Bez aktivnosti — partneri vode svoj program.
 */
function applyPartnerBooking(
  b: PartnerBooking,
  byDate: Map<string, DayOperations>,
) {
  const departure = addDays(b.arrival_date, b.nights);
  const name = b.partner?.name ?? "Partner";
  const ref: GuestRef = {
    id: b.id,
    name,
    people: b.number_of_people,
    kind: "partner",
  };

  const arr = byDate.get(b.arrival_date);
  if (arr) arr.arrivals.push(ref);
  const dep = byDate.get(departure);
  if (dep) dep.departures.push(ref);

  const stayDays = eachDayInRange(b.arrival_date, departure);
  stayDays.forEach((iso, idx) => {
    const dayOps = byDate.get(iso);
    if (!dayOps) return;
    dayOps.inCampPeople += b.number_of_people;
    if (idx === 0) {
      dayOps.meals.dinner += b.number_of_people;
    } else {
      dayOps.meals.breakfast += b.number_of_people;
      dayOps.meals.lunch += b.number_of_people;
      dayOps.meals.dinner += b.number_of_people;
    }
  });
  const depDay = byDate.get(departure);
  if (depDay) depDay.meals.breakfast += b.number_of_people;
}

export async function getWeekOperations(
  startIso: string,
  days = 7,
): Promise<WeekOperations> {
  const endExclusive = addDays(startIso, days);
  const supabase = createServiceClient();

  const [resResult, partnerResult, packagesResult] = await Promise.all([
    supabase
      .from("reservations")
      .select("*")
      .in("status", ["approved", "modified", "paid"] as const)
      .lt("arrival_date", endExclusive),
    supabase
      .from("partner_bookings")
      .select(
        "id, partner_id, cabin_id, floor, arrival_date, nights, number_of_people, price_per_person, notes, paid_at, paid_by, created_by, created_at, partner:partners(name)",
      )
      .lt("arrival_date", endExclusive),
    supabase.from("packages").select("*"),
  ]);

  if (resResult.error) throw new Error(resResult.error.message);
  if (partnerResult.error) throw new Error(partnerResult.error.message);
  if (packagesResult.error) throw new Error(packagesResult.error.message);

  const reservations = (resResult.data ?? []) as Reservation[];
  const partners = (partnerResult.data ?? []) as unknown as PartnerBooking[];
  const packages = (packagesResult.data ?? []) as Package[];
  const pkgById = new Map(packages.map((p) => [p.id, p]));
  const pkgByName = new Map(packages.map((p) => [p.name, p]));

  const dayList: DayOperations[] = eachDayInRange(startIso, endExclusive).map(
    (iso) => ({
      date: iso,
      dayLabel: dayLabel(iso),
      arrivals: [],
      departures: [],
      inCampPeople: 0,
      meals: emptyMeals(),
      activities: {},
    }),
  );
  const byDate = new Map(dayList.map((d) => [d.date, d]));

  for (const r of reservations) {
    const dep = deriveDeparture(
      r.arrival_date,
      r.departure_date,
      r.package_type,
    );
    if (!rangesOverlap(r.arrival_date, dep, startIso, endExclusive)) continue;
    const pkg =
      (r.package_id ? pkgById.get(r.package_id) : undefined) ??
      (r.package_type ? pkgByName.get(r.package_type) : undefined);
    applyReservation(r, pkg, byDate);
  }

  for (const b of partners) {
    const dep = addDays(b.arrival_date, b.nights);
    if (!rangesOverlap(b.arrival_date, dep, startIso, endExclusive)) continue;
    applyPartnerBooking(b, byDate);
  }

  return {
    startIso,
    endIsoExclusive: endExclusive,
    days: dayList,
  };
}
