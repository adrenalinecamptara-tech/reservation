import type {
  Package,
  ServiceCatalogItem,
} from "@/lib/db/types";
import {
  isChoice,
  selectionKey,
  type PackageDay,
  type Selections,
} from "@/lib/constants/activities";

export interface QuoteLine {
  code: string;
  label: string;
  unit: "per_person" | "flat";
  unitPrice: number;
  qty: number; // people za per_person, 1 za flat
  total: number;
  /** "package" = uracunato u baznu cenu (info), "addon" = dokup */
  kind: "package" | "addon";
  dayIdx?: number;
}

export interface Quote {
  basePackagePrice: number; // weekend/weekday × people
  addonsTotal: number;
  total: number;
  lines: QuoteLine[];
  /** Validacione greske (npr. nije izabran obavezan choice) */
  errors: string[];
}

export interface QuoteInput {
  pkg: Package;
  catalog: ServiceCatalogItem[];
  selections: Selections | null;
  weekend: boolean;
  people: number;
  /** Snapshot/override day_schedule (za custom builder paket) */
  scheduleOverride?: PackageDay[] | null;
  /** "tent" → uvek weekday_price (popust). Default "bungalow". */
  accommodationType?: "bungalow" | "tent";
}

const FREE_KINDS = new Set(["marker"]);

/**
 * Cena za jednu stavku iz kataloga, tip "addon".
 */
function priceFor(
  item: ServiceCatalogItem,
  people: number,
  kind: "package" | "addon",
  dayIdx?: number,
): QuoteLine {
  const qty = item.unit === "per_person" ? people : 1;
  const total = Number(item.price) * qty;
  return {
    code: item.code,
    label: item.label,
    unit: item.unit,
    unitPrice: Number(item.price),
    qty,
    total,
    kind,
    dayIdx,
  };
}

/**
 * Izracunaj quote za paket + selections.
 *
 * Pravila:
 * - basePackagePrice = (weekend ? weekend_price : weekday_price) × people
 *   (cak i ako je 0 — Prilagodjena Ponuda — bazna cena je 0)
 * - addons se pojedinacno dodaju iz catalog-a
 * - choice slot — gost mora da izabere; ako nije, error
 * - addon ne sme biti vec u rasporedu (kao static ili rezolvovan choice)
 */
export function computeQuote(input: QuoteInput): Quote {
  const {
    pkg,
    catalog,
    selections,
    weekend,
    people,
    scheduleOverride,
    accommodationType,
  } = input;
  const byCode = new Map(catalog.map((i) => [i.code, i]));
  const schedule = scheduleOverride ?? pkg.day_schedule ?? [];
  const sel: Selections = selections ?? {};

  // Šator uvek po radnoj ceni, čak i vikendom
  const useWeekend = accommodationType === "tent" ? false : weekend;
  const basePackagePrice =
    Number(useWeekend ? pkg.weekend_price : pkg.weekday_price) * people;

  const lines: QuoteLine[] = [];
  const errors: string[] = [];

  // 1) Validate choice slots — svaki array u meals/activities mora imati izbor
  schedule.forEach((day, dayIdx) => {
    (["meals", "activities"] as const).forEach((kind) => {
      const arr = day[kind] ?? [];
      arr.forEach((entry, entryIdx) => {
        if (!isChoice(entry)) return;
        const key = selectionKey(dayIdx, kind, entryIdx);
        const picked = sel.choices?.[key];
        if (!picked) {
          errors.push(
            `Dan ${day.day}: nedostaje izbor za ${kind === "meals" ? "obrok" : "aktivnost"}.`,
          );
        } else if (!(entry as string[]).includes(picked)) {
          errors.push(
            `Dan ${day.day}: nevažeći izbor "${picked}" (mora biti jedna od: ${entry.join(", ")}).`,
          );
        }
      });
    });
  });

  // 2) Addons — naplati svaki, validiraj da nije duplikat sa rasporedom tog dana
  schedule.forEach((day, dayIdx) => {
    const picks = sel.addons?.[String(dayIdx)] ?? [];
    if (picks.length === 0) return;

    // sve sto vec postoji za taj dan (static + razresen choice)
    const occupied = new Set<string>();
    day.meals.forEach((e, i) => {
      if (isChoice(e)) {
        const k = selectionKey(dayIdx, "meals", i);
        const picked = sel.choices?.[k];
        if (picked) occupied.add(picked);
      } else {
        occupied.add(e);
      }
    });
    day.activities.forEach((e, i) => {
      if (isChoice(e)) {
        const k = selectionKey(dayIdx, "activities", i);
        const picked = sel.choices?.[k];
        if (picked) occupied.add(picked);
      } else {
        occupied.add(e);
      }
    });

    for (const code of picks) {
      if (occupied.has(code)) {
        errors.push(
          `Dan ${day.day}: "${code}" je već u rasporedu, ne može se dodati kao dodatak.`,
        );
        continue;
      }
      const item = byCode.get(code);
      if (!item) {
        errors.push(`Dan ${day.day}: nepoznata stavka "${code}".`);
        continue;
      }
      if (FREE_KINDS.has(item.category)) continue;
      lines.push(priceFor(item, people, "addon", dayIdx));
    }
  });

  const addonsTotal = lines
    .filter((l) => l.kind === "addon")
    .reduce((s, l) => s + l.total, 0);

  return {
    basePackagePrice,
    addonsTotal,
    total: basePackagePrice + addonsTotal,
    lines,
    errors,
  };
}

/**
 * Vikend = subota (6) ili nedelja (0) na arrival_date.
 * Posto je rezervacija obicno preko vikenda, dovoljno je proveriti dan dolaska.
 */
export function isWeekendArrival(arrivalIso: string): boolean {
  const d = new Date(arrivalIso + "T00:00:00Z");
  const dow = d.getUTCDay();
  return dow === 0 || dow === 5 || dow === 6;
}
