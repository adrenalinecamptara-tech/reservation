export const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const ACTIVITY_TYPES = [
  "rafting",
  "hiking",
  "jeep_safari",
  "atv",
  "kayak",
  "horse",
  "canyoning",
  "biking",
  "excursion",
  "arrival",
  "departure",
  "party",
  "live_music",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const MEAL_LABELS: Record<MealType, { label: string; emoji: string }> = {
  breakfast: { label: "Doručak", emoji: "🥐" },
  lunch: { label: "Ručak", emoji: "🍝" },
  dinner: { label: "Večera", emoji: "🍖" },
};

export const ACTIVITY_LABELS: Record<
  ActivityType,
  { label: string; emoji: string }
> = {
  rafting: { label: "Rafting", emoji: "🚣" },
  hiking: { label: "Hajking", emoji: "🥾" },
  jeep_safari: { label: "Jeep safari", emoji: "🚙" },
  atv: { label: "ATV / Kvadovi", emoji: "🏍" },
  kayak: { label: "Kajak", emoji: "🛶" },
  horse: { label: "Jahanje", emoji: "🐎" },
  canyoning: { label: "Kanjoning", emoji: "🧗" },
  biking: { label: "Biciklizam", emoji: "🚴" },
  excursion: { label: "Izlet", emoji: "🗺" },
  arrival: { label: "Dolasci", emoji: "⬆" },
  departure: { label: "Odlasci", emoji: "⬇" },
  party: { label: "Žurka", emoji: "🎉" },
  live_music: { label: "Lajv muzika", emoji: "🎸" },
};

/**
 * Element u day_schedule:
 *   - string         → fiksno (uvek se desava)
 *   - string[]       → choice slot (gost bira 1)
 */
export type ScheduleEntry<T extends string> = T | T[];

export interface PackageDay {
  day: number;
  /** Opisni tekst dana za email, slobodna forma. Naslov se računa runtime
   *  iz datuma dolaska + dayIdx ("Petak") i aktivnosti ("Dolazak + Žurka"). */
  description?: string;
  meals: ScheduleEntry<MealType>[];
  activities: ScheduleEntry<ActivityType>[];
  /** Opciono se dokupljuje (obroci ili aktivnosti). Cena iz service_catalog. */
  addons?: string[];
}

export function isChoice<T extends string>(
  e: ScheduleEntry<T>,
): e is T[] {
  return Array.isArray(e);
}

/**
 * Razresenje gostovih izbora po danu.
 *
 * choices: kljuc je "<dayIdx>:<kind>:<entryIdx>" — adresa choice slota u
 *   day_schedule[dayIdx][kind][entryIdx]; vrednost je izabrani code.
 * addons: kljuc je "<dayIdx>" (string), vrednost je niz codes iz catalog-a
 *   koje gost dokupljuje za taj dan.
 */
export interface Selections {
  choices?: Record<string, string>;
  addons?: Record<string, string[]>;
}

export function selectionKey(
  dayIdx: number,
  kind: "meals" | "activities",
  entryIdx: number,
): string {
  return `${dayIdx}:${kind}:${entryIdx}`;
}

export function isMealType(v: unknown): v is MealType {
  return typeof v === "string" && (MEAL_TYPES as readonly string[]).includes(v);
}
export function isActivityType(v: unknown): v is ActivityType {
  return (
    typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v)
  );
}
