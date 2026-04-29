"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { ServiceCatalogItem } from "@/lib/db/types";

interface Props {
  reservationId: string;
  packageId: string | null;
  arrivalDate: string;
  people: number;
  schedule: PackageDay[] | null;
  initialSelections: Selections | null;
  initialComputedTotal: number | null;
  catalog: ServiceCatalogItem[];
  accommodationType?: "bungalow" | "tent";
}

interface QuoteResp {
  quote: {
    basePackagePrice: number;
    addonsTotal: number;
    total: number;
    errors: string[];
  };
}

function meta(
  code: string,
  catalog: ServiceCatalogItem[],
): { label: string; emoji: string } {
  const c = catalog.find((x) => x.code === code);
  if (c) return { label: c.label, emoji: c.emoji ?? "•" };
  if (code in MEAL_LABELS) return MEAL_LABELS[code as MealType];
  if (code in ACTIVITY_LABELS) return ACTIVITY_LABELS[code as ActivityType];
  return { label: code, emoji: "•" };
}

export function SelectionsEditor({
  reservationId,
  packageId,
  arrivalDate,
  people,
  schedule,
  initialSelections,
  initialComputedTotal,
  catalog,
  accommodationType = "bungalow",
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [sel, setSel] = useState<Selections>(initialSelections ?? {});
  const [quote, setQuote] = useState<QuoteResp | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live quote — uvek (ne samo u edit-u) da bi prikaz reflektovao
  // izmene paketa/datuma/broja osoba odmah, bez ručnog ulaska u edit.
  useEffect(() => {
    if (!packageId) return;
    setQuoting(true);
    const ctrl = new AbortController();
    fetch("/api/pricing/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package_id: packageId,
        people,
        arrival_date: arrivalDate,
        selections: sel,
        schedule_override: schedule,
        accommodation_type: accommodationType,
      }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((q) => setQuote(q))
      .catch(() => {})
      .finally(() => setQuoting(false));
    return () => ctrl.abort();
  }, [packageId, people, arrivalDate, sel, schedule, accommodationType]);

  const occupiedByDay = useMemo(() => {
    if (!schedule) return [];
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
      const k = String(dayIdx);
      const cur = prev.addons?.[k] ?? [];
      const next = cur.includes(code)
        ? cur.filter((x) => x !== code)
        : [...cur, code];
      return { ...prev, addons: { ...(prev.addons ?? {}), [k]: next } };
    });
  };

  const cancel = () => {
    setSel(initialSelections ?? {});
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    if (quote && quote.quote.errors.length > 0) {
      setError(quote.quote.errors.join(" • "));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selections: sel,
          computed_total: quote?.quote.total ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setSaving(false);
    }
  };

  if (!schedule || schedule.length === 0) {
    return (
      <div className="se-empty">
        Nema rasporeda za ovu rezervaciju (paket nema dnevni raspored).
      </div>
    );
  }

  return (
    <div className="se">
      <div className="se-bar">
        <span className="se-mode">
          {editing ? "✎ Izmena izbora" : "Pregled izbora"}
        </span>
        {editing ? (
          <div className="se-bar-actions">
            <button
              onClick={save}
              disabled={saving || !!(quote && quote.quote.errors.length > 0)}
              className="se-btn-save"
            >
              {saving ? "Čuvam…" : "Sačuvaj"}
            </button>
            <button onClick={cancel} disabled={saving} className="se-btn-cancel">
              Otkaži
            </button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="se-btn-edit">
            Uredi izbore
          </button>
        )}
      </div>

      {error && <div className="se-error">{error}</div>}

      {schedule.map((day, dayIdx) => {
        const addons = sel.addons?.[String(dayIdx)] ?? [];
        return (
          <div key={day.day} className="se-day">
            <div className="se-day-head">Dan {day.day}</div>

            {day.meals.length > 0 && (
              <Row title="Obroci">
                {day.meals.map((e, i) => {
                  if (isChoice(e)) {
                    const key = selectionKey(dayIdx, "meals", i);
                    const picked = sel.choices?.[key];
                    if (!editing) {
                      return (
                        <ChoiceView
                          key={`m${i}`}
                          options={e}
                          picked={picked}
                          catalog={catalog}
                        />
                      );
                    }
                    return (
                      <select
                        key={`m${i}`}
                        value={picked ?? ""}
                        onChange={(ev) => setChoice(key, ev.target.value)}
                        className="se-select"
                      >
                        <option value="">Izaberi…</option>
                        {e.map((opt) => {
                          const m = meta(opt, catalog);
                          return (
                            <option key={opt} value={opt}>
                              {m.emoji} {m.label}
                            </option>
                          );
                        })}
                      </select>
                    );
                  }
                  const m = meta(e, catalog);
                  return (
                    <span key={`m${i}`} className="se-chip se-chip-fixed">
                      {m.emoji} {m.label}
                    </span>
                  );
                })}
              </Row>
            )}

            {day.activities.length > 0 && (
              <Row title="Aktivnosti">
                {day.activities.map((e, i) => {
                  if (isChoice(e)) {
                    const key = selectionKey(dayIdx, "activities", i);
                    const picked = sel.choices?.[key];
                    if (!editing) {
                      return (
                        <ChoiceView
                          key={`a${i}`}
                          options={e}
                          picked={picked}
                          catalog={catalog}
                        />
                      );
                    }
                    return (
                      <select
                        key={`a${i}`}
                        value={picked ?? ""}
                        onChange={(ev) => setChoice(key, ev.target.value)}
                        className="se-select"
                      >
                        <option value="">Izaberi…</option>
                        {e.map((opt) => {
                          const a = meta(opt, catalog);
                          return (
                            <option key={opt} value={opt}>
                              {a.emoji} {a.label}
                            </option>
                          );
                        })}
                      </select>
                    );
                  }
                  const a = meta(e, catalog);
                  return (
                    <span key={`a${i}`} className="se-chip se-chip-fixed">
                      {a.emoji} {a.label}
                    </span>
                  );
                })}
              </Row>
            )}

            {/* Addons */}
            {(day.addons ?? []).length > 0 || addons.length > 0 ? (
              <Row title="Dodaci">
                {editing
                  ? (day.addons ?? []).map((code) => {
                      const item = catalog.find((c) => c.code === code);
                      if (!item) return null;
                      const occ = occupiedByDay[dayIdx]?.has(code);
                      const on = addons.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => !occ && toggleAddon(dayIdx, code)}
                          disabled={occ}
                          title={occ ? "Već u rasporedu" : ""}
                          className={`se-chip se-chip-addon ${on ? "se-chip-addon-on" : ""} ${occ ? "se-chip-disabled" : ""}`}
                        >
                          {item.emoji ?? "•"} {item.label} (+
                          {Number(item.price)} €
                          {item.unit === "per_person" ? "/os" : ""})
                        </button>
                      );
                    })
                  : addons.length > 0
                    ? addons.map((code, i) => {
                        const m = meta(code, catalog);
                        return (
                          <span
                            key={`d${i}`}
                            className="se-chip se-chip-addon-on"
                          >
                            {m.emoji} {m.label}
                          </span>
                        );
                      })
                    : null}
              </Row>
            ) : null}
          </div>
        );
      })}

      {/* Total — uvek live quote ako paket postoji */}
      <div className="se-total">
        {quote ? (
          <>
            <div className="se-total-row">
              <span>Paket ({people} {people === 1 ? "osoba" : "osoba"})</span>
              <span>{quote.quote.basePackagePrice} €</span>
            </div>
            {quote.quote.addonsTotal > 0 && (
              <div className="se-total-row">
                <span>Dodaci</span>
                <span>+{quote.quote.addonsTotal} €</span>
              </div>
            )}
            <div className="se-total-row se-total-row-final">
              <span>Ukupno{editing ? " (live)" : ""}</span>
              <span className="se-total-final">
                {quoting ? "…" : `${quote.quote.total} €`}
              </span>
            </div>
            {initialComputedTotal != null &&
              Number(initialComputedTotal) !== quote.quote.total && (
                <div className="se-total-stale">
                  ℹ Sačuvana cena: {Number(initialComputedTotal)} € — liči nakon
                  izmene paketa/datuma. Otvori „Uredi izbore" pa Sačuvaj da
                  upišeš novu vrednost.
                </div>
              )}
            {quote.quote.errors.length > 0 && (
              <ul className="se-errors">
                {quote.quote.errors.map((e, i) => (
                  <li key={i}>⚠ {e}</li>
                ))}
              </ul>
            )}
          </>
        ) : initialComputedTotal != null ? (
          <div className="se-total-row se-total-row-final">
            <span>Izračunata cena</span>
            <span className="se-total-final">{Number(initialComputedTotal)} €</span>
          </div>
        ) : null}
      </div>

      <style>{`
        .se { display: flex; flex-direction: column; gap: 10px; }
        .se-empty { font-size: 13px; color: rgba(168,213,213,0.45); font-style: italic; padding: 8px 0; }
        .se-bar { display: flex; align-items: center; justify-content: space-between; padding-bottom: 8px; border-bottom: 1px solid rgba(62,140,140,0.15); }
        .se-mode { font-size: 12px; color: rgba(168,213,213,0.55); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 600; }
        .se-bar-actions { display: flex; gap: 6px; }
        .se-btn-edit { padding: 6px 12px; background: rgba(58,144,144,0.15); border: 1px solid rgba(58,144,144,0.4); border-radius: 6px; color: #a8d5d5; font-size: 12px; cursor: pointer; }
        .se-btn-edit:hover { background: rgba(58,144,144,0.25); }
        .se-btn-save { padding: 6px 12px; background: linear-gradient(135deg, #1a5c3c, #2a8060); border: none; border-radius: 6px; color: #e8f5f5; font-size: 12px; font-weight: 600; cursor: pointer; }
        .se-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .se-btn-cancel { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.18); border-radius: 6px; color: rgba(168,213,213,0.6); font-size: 12px; cursor: pointer; }
        .se-error { padding: 8px 12px; background: rgba(196,74,90,0.12); border: 1px solid rgba(196,74,90,0.3); border-radius: 6px; color: #ffb4c0; font-size: 12px; }

        .se-day { padding: 12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(62,140,140,0.18); border-radius: 8px; }
        .se-day-head { font-size: 12px; font-weight: 700; color: #e8f5f5; margin-bottom: 8px; letter-spacing: 0.05em; }
        .se-row { display: grid; grid-template-columns: 90px 1fr; gap: 10px; align-items: flex-start; margin-bottom: 6px; }
        .se-row-label { font-size: 10px; color: rgba(168,213,213,0.55); padding-top: 7px; text-transform: uppercase; letter-spacing: 0.06em; }
        .se-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .se-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; border: 1px solid; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; }
        .se-chip-fixed { background: rgba(58,144,144,0.12); border-color: rgba(58,144,144,0.35); color: #a8d5d5; }
        .se-chip-addon { background: rgba(255,255,255,0.04); border-color: rgba(62,140,140,0.25); color: rgba(168,213,213,0.7); cursor: pointer; }
        .se-chip-addon:hover:not(:disabled) { background: rgba(155,107,217,0.14); }
        .se-chip-addon-on { background: rgba(155,107,217,0.2); border-color: rgba(155,107,217,0.55); color: #c8a9f0; font-weight: 600; }
        .se-chip-disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
        .se-chip-choice { background: rgba(232,160,48,0.12); border-color: rgba(232,160,48,0.4); color: #f0c87a; }
        .se-chip-choice strong { color: #ffd89a; }
        .se-chip-choice-missing { color: rgba(255,180,192,0.85); border-color: rgba(196,74,90,0.4); background: rgba(196,74,90,0.1); }
        .se-select { padding: 5px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(232,160,48,0.45); border-radius: 999px; color: #f0c87a; font-family: inherit; font-size: 11px; cursor: pointer; }
        .se-select:focus { outline: none; border-color: rgba(232,160,48,0.7); }
        .se-select option { background: #0f2e2e; color: #e8f5f5; }

        .se-total { padding: 10px 12px; background: rgba(58,144,144,0.08); border: 1px solid rgba(62,140,140,0.25); border-radius: 8px; }
        .se-total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; color: rgba(168,213,213,0.75); }
        .se-total-row-final { margin-top: 4px; padding-top: 6px; border-top: 1px solid rgba(62,140,140,0.18); font-weight: 600; color: #e8f5f5; }
        .se-total-final { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 700; color: #7dcfcf; }
        .se-errors { list-style: none; padding: 8px 0 0; margin-top: 8px; border-top: 1px solid rgba(196,74,90,0.25); color: #ffb4c0; font-size: 11px; display: flex; flex-direction: column; gap: 3px; }
        .se-total-stale { margin-top: 6px; padding: 6px 8px; font-size: 11px; color: rgba(232,160,48,0.85); background: rgba(232,160,48,0.06); border-radius: 4px; }
      `}</style>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="se-row">
      <span className="se-row-label">{title}</span>
      <div className="se-chips">{children}</div>
    </div>
  );
}

function ChoiceView({
  options,
  picked,
  catalog,
}: {
  options: string[];
  picked?: string;
  catalog: ServiceCatalogItem[];
}) {
  if (picked && options.includes(picked)) {
    const m = meta(picked, catalog);
    return (
      <span className="se-chip se-chip-choice">
        Izbor: <strong>{m.emoji} {m.label}</strong>
      </span>
    );
  }
  const opts = options
    .map((o) => {
      const m = meta(o, catalog);
      return `${m.emoji} ${m.label}`;
    })
    .join(" / ");
  return (
    <span className="se-chip se-chip-choice se-chip-choice-missing">
      ⚠ Nije izabrano: {opts}
    </span>
  );
}
