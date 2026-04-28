"use client";

import { useEffect, useMemo, useState } from "react";
import { useRegistrationStore } from "@/lib/store/registrationStore";
import {
  ACTIVITY_LABELS,
  MEAL_LABELS,
  isChoice,
  selectionKey,
  type ActivityType,
  type MealType,
  type PackageDay,
  type Selections,
} from "@/lib/constants/activities";
import type { Package, ServiceCatalogItem } from "@/lib/db/types";

interface QuoteResponse {
  quote: {
    basePackagePrice: number;
    addonsTotal: number;
    total: number;
    lines: Array<{
      code: string;
      label: string;
      total: number;
      kind: "package" | "addon";
      dayIdx?: number;
    }>;
    errors: string[];
  };
  weekend: boolean;
}

function labelOf(
  code: string,
  catalog: ServiceCatalogItem[],
): { label: string; emoji: string } {
  const found = catalog.find((c) => c.code === code);
  if (found) return { label: found.label, emoji: found.emoji ?? "•" };
  if (code in MEAL_LABELS) return MEAL_LABELS[code as MealType];
  if (code in ACTIVITY_LABELS) return ACTIVITY_LABELS[code as ActivityType];
  return { label: code, emoji: "•" };
}

export function ActivitiesStep() {
  const {
    groupDetails,
    selections: storedSel,
    setSelections,
    setDaySnapshot,
    setComputedTotal,
    nextStep,
    prevStep,
  } = useRegistrationStore();

  const [pkg, setPkg] = useState<Package | null>(null);
  const [catalog, setCatalog] = useState<ServiceCatalogItem[]>([]);
  const [sel, setSel] = useState<Selections>(storedSel ?? {});
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState(false);

  const packageId = groupDetails.package_id ?? "";
  const arrivalDate = groupDetails.arrival_date ?? "";
  const people = groupDetails.number_of_people ?? 1;

  // Load package + catalog
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/packages`).then((r) => r.json()),
      fetch(`/api/services?active=1`).then((r) => r.json()),
    ])
      .then(([pkgs, cat]) => {
        if (!alive) return;
        const found = (pkgs as Package[]).find((p) => p.id === packageId);
        setPkg(found ?? null);
        setCatalog((cat as ServiceCatalogItem[]) ?? []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [packageId]);

  const schedule: PackageDay[] = pkg?.day_schedule ?? [];
  const isCustomBuilder =
    pkg && pkg.day_schedule == null; // Prilagođena Ponuda

  // Live quote
  useEffect(() => {
    if (!pkg || !arrivalDate || !people) return;
    setQuoting(true);
    const ctrl = new AbortController();
    fetch("/api/pricing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: pkg.id,
        people,
        arrival_date: arrivalDate,
        selections: sel,
      }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((q) => setQuote(q))
      .catch(() => {})
      .finally(() => setQuoting(false));
    return () => ctrl.abort();
  }, [pkg, people, arrivalDate, sel]);

  // Build occupied set per day for addon disabling
  const occupiedByDay = useMemo(() => {
    return schedule.map((day, dayIdx) => {
      const occ = new Set<string>();
      day.meals.forEach((e, i) => {
        if (isChoice(e)) {
          const k = selectionKey(dayIdx, "meals", i);
          const picked = sel.choices?.[k];
          if (picked) occ.add(picked);
        } else occ.add(e);
      });
      day.activities.forEach((e, i) => {
        if (isChoice(e)) {
          const k = selectionKey(dayIdx, "activities", i);
          const picked = sel.choices?.[k];
          if (picked) occ.add(picked);
        } else occ.add(e);
      });
      return occ;
    });
  }, [schedule, sel]);

  const setChoice = (key: string, code: string) => {
    setSel((prev) => ({
      ...prev,
      choices: { ...(prev.choices ?? {}), [key]: code },
    }));
  };

  const toggleAddon = (dayIdx: number, code: string) => {
    setSel((prev) => {
      const key = String(dayIdx);
      const existing = prev.addons?.[key] ?? [];
      const next = existing.includes(code)
        ? existing.filter((x) => x !== code)
        : [...existing, code];
      return { ...prev, addons: { ...(prev.addons ?? {}), [key]: next } };
    });
  };

  const onNext = () => {
    if (!pkg) return;
    if (quote && quote.quote.errors.length > 0) {
      alert(quote.quote.errors.join("\n"));
      return;
    }
    setSelections(sel);
    setDaySnapshot(schedule.length > 0 ? schedule : null);
    setComputedTotal(quote?.quote.total ?? null);
    nextStep();
  };

  if (loading) {
    return <div className="act-hint">Učitavam paket…</div>;
  }
  if (!pkg) {
    return (
      <div className="act-hint">
        Paket nije pronađen. Vrati se nazad i izaberi paket.
        <div className="act-btn-row">
          <button onClick={prevStep} className="act-btn act-btn--secondary">
            ← Nazad
          </button>
        </div>
      </div>
    );
  }

  if (isCustomBuilder) {
    return (
      <CustomBuilder
        pkg={pkg}
        catalog={catalog}
        people={people}
        sel={sel}
        setSel={setSel}
        quote={quote}
        quoting={quoting}
        onNext={(snapshot) => {
          setSelections(sel);
          setDaySnapshot(snapshot);
          setComputedTotal(quote?.quote.total ?? null);
          nextStep();
        }}
        onBack={prevStep}
      />
    );
  }

  return (
    <div>
      <p className="act-hint">
        <strong>{pkg.name}</strong> — {pkg.includes}. Dole je raspored po
        danima. Za stavke gde piše „Izaberi" — biraj jedno. Možeš dokupiti
        dodatke ako želiš više od onoga što paket pokriva.
      </p>

      {schedule.map((day, dayIdx) => (
        <div key={day.day} className="as-day">
          <div className="as-day-head">Dan {day.day}</div>

          {/* Meals */}
          <div className="as-row">
            <span className="as-row-label">Obroci</span>
            <div className="as-chips">
              {day.meals.map((entry, i) => {
                if (isChoice(entry)) {
                  const key = selectionKey(dayIdx, "meals", i);
                  const picked = sel.choices?.[key] ?? "";
                  return (
                    <select
                      key={`m-${i}`}
                      value={picked}
                      onChange={(e) => setChoice(key, e.target.value)}
                      className="as-select"
                    >
                      <option value="">Izaberi…</option>
                      {entry.map((opt) => {
                        const m = labelOf(opt, catalog);
                        return (
                          <option key={opt} value={opt}>
                            {m.emoji} {m.label}
                          </option>
                        );
                      })}
                    </select>
                  );
                }
                const m = labelOf(entry, catalog);
                return (
                  <span key={`m-${i}`} className="as-chip as-chip-fixed">
                    {m.emoji} {m.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Activities */}
          {day.activities.length > 0 && (
            <div className="as-row">
              <span className="as-row-label">Aktivnosti</span>
              <div className="as-chips">
                {day.activities.map((entry, i) => {
                  if (isChoice(entry)) {
                    const key = selectionKey(dayIdx, "activities", i);
                    const picked = sel.choices?.[key] ?? "";
                    return (
                      <select
                        key={`a-${i}`}
                        value={picked}
                        onChange={(e) => setChoice(key, e.target.value)}
                        className="as-select"
                      >
                        <option value="">Izaberi…</option>
                        {entry.map((opt) => {
                          const a = labelOf(opt, catalog);
                          return (
                            <option key={opt} value={opt}>
                              {a.emoji} {a.label}
                            </option>
                          );
                        })}
                      </select>
                    );
                  }
                  const a = labelOf(entry, catalog);
                  return (
                    <span key={`a-${i}`} className="as-chip as-chip-fixed">
                      {a.emoji} {a.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Addons */}
          {(day.addons ?? []).length > 0 && (
            <div className="as-row">
              <span className="as-row-label">Dodatno</span>
              <div className="as-chips">
                {(day.addons ?? []).map((code) => {
                  const item = catalog.find((c) => c.code === code);
                  if (!item) return null;
                  const occupied = occupiedByDay[dayIdx]?.has(code);
                  const on = sel.addons?.[String(dayIdx)]?.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => !occupied && toggleAddon(dayIdx, code)}
                      disabled={occupied}
                      title={occupied ? "Već u rasporedu" : ""}
                      className={`as-chip as-chip-addon ${on ? "as-chip-addon-on" : ""} ${occupied ? "as-chip-disabled" : ""}`}
                    >
                      {item.emoji ?? "•"} {item.label} (+{Number(item.price)} €
                      {item.unit === "per_person" ? "/os" : ""})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Total */}
      <div className="as-total">
        <div className="as-total-row">
          <span>Paket ({people} {people === 1 ? "osoba" : "osoba"})</span>
          <span>{quote?.quote.basePackagePrice ?? 0} €</span>
        </div>
        {quote && quote.quote.addonsTotal > 0 && (
          <div className="as-total-row">
            <span>Dodaci</span>
            <span>+{quote.quote.addonsTotal} €</span>
          </div>
        )}
        <div className="as-total-row as-total-row-final">
          <span>Ukupno</span>
          <span className="as-total-final">
            {quoting ? "…" : `${quote?.quote.total ?? 0} €`}
          </span>
        </div>
        {quote && quote.quote.errors.length > 0 && (
          <ul className="as-errors">
            {quote.quote.errors.map((e, i) => (
              <li key={i}>⚠ {e}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="act-btn-row">
        <button
          type="button"
          onClick={prevStep}
          className="act-btn act-btn--secondary"
          style={{ flex: "0 0 auto", width: "100px" }}
        >
          ← Nazad
        </button>
        <button
          type="button"
          onClick={onNext}
          className="act-btn act-btn--primary"
          disabled={!!(quote && quote.quote.errors.length > 0)}
        >
          Sledeći korak →
        </button>
      </div>

      <Styles />
    </div>
  );
}

// ── Custom builder za "Prilagodjena Ponuda" ──────────────────────

function CustomBuilder({
  pkg,
  catalog,
  people,
  sel,
  setSel,
  quote,
  quoting,
  onNext,
  onBack,
}: {
  pkg: Package;
  catalog: ServiceCatalogItem[];
  people: number;
  sel: Selections;
  setSel: (s: Selections) => void;
  quote: QuoteResponse | null;
  quoting: boolean;
  onNext: (snapshot: PackageDay[]) => void;
  onBack: () => void;
}) {
  const [days, setDays] = useState<number>(3);

  // Build a synthetic day_schedule so the quote endpoint can validate addons
  const snapshot = useMemo<PackageDay[]>(() => {
    const arr: PackageDay[] = [];
    for (let i = 0; i < days; i++) {
      arr.push({
        day: i + 1,
        meals: [],
        activities: [],
        addons: catalog.filter((c) => c.is_addon_eligible).map((c) => c.code),
      });
    }
    return arr;
  }, [days, catalog]);

  const toggle = (dayIdx: number, code: string) => {
    const key = String(dayIdx);
    const cur = sel.addons?.[key] ?? [];
    const next = cur.includes(code)
      ? cur.filter((x) => x !== code)
      : [...cur, code];
    setSel({ ...sel, addons: { ...(sel.addons ?? {}), [key]: next } });
  };

  const meals = catalog.filter((c) => c.category === "meal");
  const activities = catalog.filter(
    (c) => c.category === "activity" && c.is_addon_eligible,
  );

  return (
    <div>
      <p className="act-hint">
        <strong>{pkg.name}</strong> — sastavi svoj paket. Izaberi broj dana i
        za svaki dan dodaj obroke i aktivnosti koje želiš.
      </p>

      <div className="act-field">
        <label className="act-label">Broj dana</label>
        <input
          type="number"
          min={1}
          max={14}
          value={days}
          onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
          className="act-input"
        />
      </div>

      {Array.from({ length: days }).map((_, dayIdx) => {
        const picked = sel.addons?.[String(dayIdx)] ?? [];
        return (
          <div key={dayIdx} className="as-day">
            <div className="as-day-head">Dan {dayIdx + 1}</div>

            <div className="as-row">
              <span className="as-row-label">Obroci</span>
              <div className="as-chips">
                {meals.map((m) => {
                  const on = picked.includes(m.code);
                  return (
                    <button
                      key={m.code}
                      type="button"
                      onClick={() => toggle(dayIdx, m.code)}
                      className={`as-chip as-chip-addon ${on ? "as-chip-addon-on" : ""}`}
                    >
                      {m.emoji} {m.label} (+{Number(m.price)} €/os)
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="as-row">
              <span className="as-row-label">Aktivnosti</span>
              <div className="as-chips">
                {activities.map((a) => {
                  const on = picked.includes(a.code);
                  return (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => toggle(dayIdx, a.code)}
                      className={`as-chip as-chip-addon ${on ? "as-chip-addon-on" : ""}`}
                    >
                      {a.emoji} {a.label} (+{Number(a.price)} €/os)
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      <div className="as-total">
        <div className="as-total-row">
          <span>Bazna cena</span>
          <span>{quote?.quote.basePackagePrice ?? 0} €</span>
        </div>
        <div className="as-total-row">
          <span>Dodaci</span>
          <span>+{quote?.quote.addonsTotal ?? 0} €</span>
        </div>
        <div className="as-total-row as-total-row-final">
          <span>Ukupno ({people} {people === 1 ? "osoba" : "osoba"})</span>
          <span className="as-total-final">
            {quoting ? "…" : `${quote?.quote.total ?? 0} €`}
          </span>
        </div>
      </div>

      <div className="act-btn-row">
        <button
          type="button"
          onClick={onBack}
          className="act-btn act-btn--secondary"
          style={{ flex: "0 0 auto", width: "100px" }}
        >
          ← Nazad
        </button>
        <button
          type="button"
          onClick={() => onNext(snapshot)}
          className="act-btn act-btn--primary"
        >
          Sledeći korak →
        </button>
      </div>

      <Styles />
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .as-day { padding: 14px; background: rgba(0,0,0,0.18); border: 1px solid rgba(62,140,140,0.18); border-radius: 10px; margin-bottom: 12px; }
      .as-day-head { font-size: 13px; font-weight: 700; color: #e8f5f5; margin-bottom: 10px; letter-spacing: 0.05em; }
      .as-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
      .as-row-label { font-size: 11px; color: rgba(168,213,213,0.55); padding-top: 8px; text-transform: uppercase; letter-spacing: 0.06em; }
      .as-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .as-chip { padding: 6px 11px; border-radius: 999px; font-size: 12px; border: 1px solid; font-family: inherit; cursor: pointer; }
      .as-chip-fixed { background: rgba(58,144,144,0.12); border-color: rgba(58,144,144,0.35); color: #a8d5d5; cursor: default; }
      .as-chip-addon { background: rgba(255,255,255,0.04); border-color: rgba(62,140,140,0.25); color: rgba(168,213,213,0.7); }
      .as-chip-addon:hover:not(:disabled) { background: rgba(155,107,217,0.12); border-color: rgba(155,107,217,0.4); }
      .as-chip-addon-on { background: rgba(155,107,217,0.2); border-color: rgba(155,107,217,0.55); color: #c8a9f0; font-weight: 600; }
      .as-chip-disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
      .as-select { padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(232,160,48,0.4); border-radius: 999px; color: #f0c87a; font-family: inherit; font-size: 12px; cursor: pointer; }
      .as-select:focus { outline: none; border-color: rgba(232,160,48,0.7); }
      .as-select option { background: #0f2e2e; color: #e8f5f5; }

      .as-total { padding: 14px 16px; background: rgba(58,144,144,0.08); border: 1px solid rgba(62,140,140,0.25); border-radius: 10px; margin-top: 16px; }
      .as-total-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; font-size: 14px; color: rgba(168,213,213,0.75); }
      .as-total-row-final { margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(62,140,140,0.18); font-size: 16px; color: #e8f5f5; font-weight: 600; }
      .as-total-final { font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 700; color: #7dcfcf; }
      .as-errors { list-style: none; padding: 8px 0 0; margin-top: 8px; border-top: 1px solid rgba(196,74,90,0.25); color: #ffb4c0; font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
    `}</style>
  );
}
