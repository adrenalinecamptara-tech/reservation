import { createServiceClient } from "@/lib/db/supabase";
import type {
  Cabin,
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
import { tentCount } from "@/lib/constants/accommodation";
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

export interface ExtraBedNeeded {
  cabinName: string;
  floor: "ground" | "upper";
  occupancy: number;
  capacity: number;
  guestName: string;
}

export interface TentInfo {
  count: number; // ukupan broj šatora svih grupa tog dana
  people: number; // ukupno ljudi u šatorima
  groups: Array<{ guestName: string; people: number; tents: number }>;
}

export interface DayOperations {
  date: string;
  dayLabel: string;
  arrivals: GuestRef[];
  departures: GuestRef[];
  inCampPeople: number;
  meals: Record<MealType, number>;
  activities: Partial<Record<ActivityType, GuestRef[]>>;
  extraBeds: ExtraBedNeeded[];
  tents: TentInfo;
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
interface ReservationWithUnits extends Reservation {
  reservation_units?: Array<{
    cabin_id: string;
    floor: "ground" | "upper";
    people_count: number;
  }>;
}

function pushExtraBed(
  dayOps: DayOperations,
  cabin: Cabin | undefined,
  floor: "ground" | "upper",
  peopleCount: number,
  guestName: string,
) {
  if (!cabin) return;
  const cap = floor === "ground" ? cabin.ground_beds : cabin.upper_beds;
  if (peopleCount > cap) {
    dayOps.extraBeds.push({
      cabinName: cabin.name,
      floor,
      occupancy: peopleCount,
      capacity: cap,
      guestName,
    });
  }
}

function applyReservation(
  res: ReservationWithUnits,
  pkg: Package | undefined,
  cabinMap: Map<string, Cabin>,
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

  const stayNights = eachDayInRange(res.arrival_date, departure);
  // Iteriramo i dan odlaska (zadnji dan iz day_schedule-a) jer i taj dan
  // ima obroke/aktivnosti (npr. doručak ujutru pre odlaska).
  const totalDays = Math.max(stayNights.length, schedule?.length ?? 0);

  // Jedinice po sobama (multi-unit) ili fallback na pojedinacni cabin/floor
  const units =
    res.reservation_units && res.reservation_units.length > 0
      ? res.reservation_units
      : res.cabin_id && res.floor
        ? [
            {
              cabin_id: res.cabin_id,
              floor: res.floor,
              people_count: res.number_of_people,
            },
          ]
        : [];

  for (let idx = 0; idx < totalDays; idx++) {
    const iso = addDays(res.arrival_date, idx);
    const dayOps = byDate.get(iso);
    if (!dayOps) continue;

    // inCamp i extraBeds/tents samo za noći boravka (ne za dan odlaska)
    if (idx < stayNights.length) {
      dayOps.inCampPeople += res.number_of_people;
      if (res.accommodation_type === "tent") {
        const tents = tentCount(res.number_of_people);
        dayOps.tents.count += tents;
        dayOps.tents.people += res.number_of_people;
        dayOps.tents.groups.push({
          guestName: ref.name,
          people: res.number_of_people,
          tents,
        });
      } else {
        for (const u of units) {
          pushExtraBed(
            dayOps,
            cabinMap.get(u.cabin_id),
            u.floor,
            u.people_count,
            ref.name,
          );
        }
      }
    }

    if (!schedule || schedule.length === 0) continue;
    const entry =
      schedule.find((s) => s.day === idx + 1) ?? schedule[schedule.length - 1];
    if (!entry) continue;

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
  }
}

/**
 * Partneri:
 *  - Ako imaju izabran paket (package_id) → tretiramo ih kao goste tog paketa
 *    (sve iz day_schedule: obroci + aktivnosti). Choice slot → prva opcija
 *    (partneri ne biraju kroz formu).
 *  - Bez paketa → samo dolazak/odlazak, NIŠTA drugo (samo spavanje).
 */
function applyPartnerBooking(
  b: PartnerBooking,
  pkg: Package | undefined,
  cabinMap: Map<string, Cabin>,
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

  const schedule = pkg?.day_schedule ?? null;
  const stayNights = eachDayInRange(b.arrival_date, departure);
  // Iteriramo i dan odlaska zbog obroka iz day_schedule-a
  const totalDays = Math.max(stayNights.length, schedule?.length ?? 0);

  for (let idx = 0; idx < totalDays; idx++) {
    const iso = addDays(b.arrival_date, idx);
    const dayOps = byDate.get(iso);
    if (!dayOps) continue;

    // inCamp i extraBeds samo za noći boravka
    if (idx < stayNights.length) {
      dayOps.inCampPeople += b.number_of_people;
      pushExtraBed(
        dayOps,
        cabinMap.get(b.cabin_id),
        b.floor,
        b.number_of_people,
        name,
      );
    }

    if (!schedule || schedule.length === 0) continue; // bez paketa: ništa drugo
    const entry =
      schedule.find((s) => s.day === idx + 1) ?? schedule[schedule.length - 1];
    if (!entry) continue;

    // Partneri nemaju selections — choice slot uzima prvu opciju
    entry.meals.forEach((e) => {
      const code = isChoice(e) ? e[0] : e;
      if (code && isMeal(code)) dayOps.meals[code] += b.number_of_people;
    });
    entry.activities.forEach((e) => {
      const code = isChoice(e) ? e[0] : e;
      if (code && isActivity(code)) pushActivity(dayOps, code, ref);
    });
  }
}

export async function getWeekOperations(
  startIso: string,
  days = 7,
): Promise<WeekOperations> {
  const endExclusive = addDays(startIso, days);
  const supabase = createServiceClient();

  const [resResult, partnerResult, packagesResult, cabinsResult] =
    await Promise.all([
      supabase
        .from("reservations")
        .select("*, reservation_units(cabin_id, floor, people_count)")
        .in("status", ["approved", "modified", "paid"] as const)
        .lt("arrival_date", endExclusive),
      supabase
        .from("partner_bookings")
        .select(
          "id, partner_id, cabin_id, floor, arrival_date, nights, number_of_people, price_per_person, notes, paid_at, paid_by, created_by, created_at, package_id, partner:partners(name)",
        )
        .lt("arrival_date", endExclusive),
      supabase.from("packages").select("*"),
      supabase.from("cabins").select("*"),
    ]);

  if (resResult.error) throw new Error(resResult.error.message);
  if (partnerResult.error) throw new Error(partnerResult.error.message);
  if (packagesResult.error) throw new Error(packagesResult.error.message);
  if (cabinsResult.error) throw new Error(cabinsResult.error.message);

  const reservations = (resResult.data ?? []) as ReservationWithUnits[];
  const partners = (partnerResult.data ?? []) as unknown as PartnerBooking[];
  const packages = (packagesResult.data ?? []) as Package[];
  const cabins = (cabinsResult.data ?? []) as Cabin[];
  const cabinMap = new Map(cabins.map((c) => [c.id, c]));
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
      extraBeds: [],
      tents: { count: 0, people: 0, groups: [] },
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
    applyReservation(r, pkg, cabinMap, byDate);
  }

  for (const b of partners) {
    const dep = addDays(b.arrival_date, b.nights);
    if (!rangesOverlap(b.arrival_date, dep, startIso, endExclusive)) continue;
    const pkg = b.package_id ? pkgById.get(b.package_id) : undefined;
    applyPartnerBooking(b, pkg, cabinMap, byDate);
  }

  return {
    startIso,
    endIsoExclusive: endExclusive,
    days: dayList,
  };
}
