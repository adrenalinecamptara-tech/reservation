"use client";

import { useState } from "react";
import {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  MEAL_LABELS,
  MEAL_TYPES,
  isChoice,
  type ActivityType,
  type MealType,
  type PackageDay,
  type ScheduleEntry,
} from "@/lib/constants/activities";

interface Props {
  packageId: string;
  initial: PackageDay[] | null;
}

function emptyDay(day: number): PackageDay {
  return { day, description: "", meals: [], activities: [], addons: [] };
}

function entryLabel<T extends string>(
  e: ScheduleEntry<T>,
  labels: Record<T, { label: string; emoji: string }>,
): string {
  if (isChoice(e)) {
    return e.map((x) => `${labels[x].emoji} ${labels[x].label}`).join(" | ");
  }
  return `${labels[e].emoji} ${labels[e].label}`;
}

export function PackageDayScheduleEditor({ packageId, initial }: Props) {
  const [days, setDays] = useState<PackageDay[]>(
    initial && initial.length > 0
      ? initial.map((d, i) => ({
          day: i + 1,
          description: d.description ?? "",
          meals: d.meals ?? [],
          activities: d.activities ?? [],
          addons: d.addons ?? [],
        }))
      : [],
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [choiceMode, setChoiceMode] = useState<{
    dayIdx: number;
    kind: "meals" | "activities";
    selected: string[];
  } | null>(null);

  const update = (idx: number, patch: Partial<PackageDay>) =>
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );

  const toggleStaticMeal = (idx: number, m: MealType) => {
    const current = days[idx].meals;
    const has = current.some((e) => !isChoice(e) && e === m);
    update(idx, {
      meals: has
        ? current.filter((e) => isChoice(e) || e !== m)
        : [...current, m],
    });
  };

  const toggleStaticActivity = (idx: number, a: ActivityType) => {
    const current = days[idx].activities;
    const has = current.some((e) => !isChoice(e) && e === a);
    update(idx, {
      activities: has
        ? current.filter((e) => isChoice(e) || e !== a)
        : [...current, a],
    });
  };

  const removeEntry = (
    idx: number,
    kind: "meals" | "activities",
    entryIdx: number,
  ) => {
    const arr = days[idx][kind];
    update(idx, { [kind]: arr.filter((_, i) => i !== entryIdx) });
  };

  const toggleAddon = (idx: number, code: string) => {
    const cur = days[idx].addons ?? [];
    update(idx, {
      addons: cur.includes(code) ? cur.filter((x) => x !== code) : [...cur, code],
    });
  };

  const openChoice = (dayIdx: number, kind: "meals" | "activities") =>
    setChoiceMode({ dayIdx, kind, selected: [] });

  const confirmChoice = () => {
    if (!choiceMode || choiceMode.selected.length < 2) {
      setChoiceMode(null);
      return;
    }
    const { dayIdx, kind, selected } = choiceMode;
    const arr = days[dayIdx][kind];
    update(dayIdx, { [kind]: [...arr, selected] });
    setChoiceMode(null);
  };

  const toggleChoiceOption = (opt: string) => {
    if (!choiceMode) return;
    const has = choiceMode.selected.includes(opt);
    setChoiceMode({
      ...choiceMode,
      selected: has
        ? choiceMode.selected.filter((x) => x !== opt)
        : [...choiceMode.selected, opt],
    });
  };

  const addDay = () => setDays((p) => [...p, emptyDay(p.length + 1)]);
  const removeDay = (idx: number) =>
    setDays((p) =>
      p.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 })),
    );

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/packages/${packageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_schedule: days.length === 0 ? null : days,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Greška");
      setMsg("✓ Sačuvano");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Greška");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pds">
      <div className="pds-head">
        <span className="pds-title">Dnevni raspored</span>
        <button onClick={addDay} className="pds-btn-add">
          + Dan
        </button>
      </div>

      {days.length === 0 && (
        <div className="pds-empty">
          Nema rasporeda. Klikni „+ Dan" da dodaš.
        </div>
      )}

      <div className="pds-days">
        {days.map((d, idx) => (
          <div key={idx} className="pds-day">
            <div className="pds-day-head">
              <span className="pds-day-label">Dan {d.day}</span>
              <button
                onClick={() => removeDay(idx)}
                className="pds-day-del"
                aria-label="Obriši dan"
              >
                ×
              </button>
            </div>

            {/* Opis dana (koristi se u email-u; naslov se racuna runtime) */}
            <div className="pds-row">
              <div className="pds-row-label">Opis</div>
              <textarea
                value={d.description ?? ""}
                onChange={(e) => update(idx, { description: e.target.value })}
                placeholder="Kratak opis dana za email gostu (slobodna forma)"
                rows={2}
                className="pds-text-input"
              />
            </div>

            {/* Obroci */}
            <div className="pds-row">
              <div className="pds-row-label">Obroci</div>
              <div className="pds-chips">
                {MEAL_TYPES.map((m) => {
                  const on = d.meals.some((e) => !isChoice(e) && e === m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleStaticMeal(idx, m)}
                      className={`pds-chip ${on ? "pds-chip-on" : ""}`}
                    >
                      {MEAL_LABELS[m].emoji} {MEAL_LABELS[m].label}
                    </button>
                  );
                })}
                {d.meals
                  .map((e, i) => ({ e, i }))
                  .filter(({ e }) => isChoice(e))
                  .map(({ e, i }) => (
                    <span key={`c${i}`} className="pds-chip pds-chip-choice">
                      Izbor: {entryLabel(e, MEAL_LABELS)}
                      <button
                        onClick={() => removeEntry(idx, "meals", i)}
                        className="pds-chip-x"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            </div>

            {/* Aktivnosti */}
            <div className="pds-row">
              <div className="pds-row-label">Aktivnosti</div>
              <div className="pds-chips">
                {ACTIVITY_TYPES.map((a) => {
                  const on = d.activities.some(
                    (e) => !isChoice(e) && e === a,
                  );
                  return (
                    <button
                      key={a}
                      onClick={() => toggleStaticActivity(idx, a)}
                      className={`pds-chip ${on ? "pds-chip-on" : ""}`}
                    >
                      {ACTIVITY_LABELS[a].emoji} {ACTIVITY_LABELS[a].label}
                    </button>
                  );
                })}
                {d.activities
                  .map((e, i) => ({ e, i }))
                  .filter(({ e }) => isChoice(e))
                  .map(({ e, i }) => (
                    <span key={`c${i}`} className="pds-chip pds-chip-choice">
                      Izbor: {entryLabel(e, ACTIVITY_LABELS)}
                      <button
                        onClick={() => removeEntry(idx, "activities", i)}
                        className="pds-chip-x"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => openChoice(idx, "activities")}
                  className="pds-chip pds-chip-add"
                >
                  + Izbor (gost bira 1)
                </button>
              </div>
            </div>

            {/* Addons */}
            <div className="pds-row">
              <div className="pds-row-label">Dodatno</div>
              <div className="pds-chips">
                {/* Obroci kao addon — disable ako vec u rasporedu za taj dan */}
                {MEAL_TYPES.map((m) => {
                  const inSchedule = d.meals.some((e) =>
                    isChoice(e) ? e.includes(m) : e === m,
                  );
                  const on = (d.addons ?? []).includes(m);
                  return (
                    <button
                      key={`addon-meal-${m}`}
                      onClick={() => toggleAddon(idx, m)}
                      disabled={inSchedule}
                      title={inSchedule ? "Već u rasporedu" : ""}
                      className={`pds-chip ${on ? "pds-chip-addon-on" : ""} ${inSchedule ? "pds-chip-disabled" : ""}`}
                    >
                      {MEAL_LABELS[m].emoji} {MEAL_LABELS[m].label}
                    </button>
                  );
                })}
                {ACTIVITY_TYPES.map((a) => {
                  const inSchedule = d.activities.some((e) =>
                    isChoice(e) ? e.includes(a) : e === a,
                  );
                  const on = (d.addons ?? []).includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleAddon(idx, a)}
                      disabled={inSchedule}
                      title={inSchedule ? "Već u rasporedu" : ""}
                      className={`pds-chip ${on ? "pds-chip-addon-on" : ""} ${inSchedule ? "pds-chip-disabled" : ""}`}
                    >
                      {ACTIVITY_LABELS[a].emoji} {ACTIVITY_LABELS[a].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Choice modal */}
      {choiceMode && (
        <div className="pds-modal-bg" onClick={() => setChoiceMode(null)}>
          <div className="pds-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pds-modal-title">
              Izaberi opcije za choice (gost bira 1 od ovoga):
            </div>
            <div className="pds-chips">
              {(choiceMode.kind === "meals"
                ? (MEAL_TYPES as readonly string[])
                : (ACTIVITY_TYPES as readonly string[])
              ).map((c) => {
                const on = choiceMode.selected.includes(c);
                const labels =
                  choiceMode.kind === "meals" ? MEAL_LABELS : ACTIVITY_LABELS;
                const meta = (labels as Record<string, { label: string; emoji: string }>)[c];
                return (
                  <button
                    key={c}
                    onClick={() => toggleChoiceOption(c)}
                    className={`pds-chip ${on ? "pds-chip-on" : ""}`}
                  >
                    {meta.emoji} {meta.label}
                  </button>
                );
              })}
            </div>
            <div className="pds-modal-foot">
              <button
                onClick={confirmChoice}
                disabled={choiceMode.selected.length < 2}
                className="pds-btn-save"
              >
                Dodaj choice ({choiceMode.selected.length})
              </button>
              <button
                onClick={() => setChoiceMode(null)}
                className="pds-btn-cancel"
              >
                Otkaži
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pds-foot">
        <button onClick={save} disabled={saving} className="pds-btn-save">
          {saving ? "Čuvam…" : "Sačuvaj raspored"}
        </button>
        {msg && <span className="pds-msg">{msg}</span>}
      </div>

      <style>{`
        .pds { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(62,140,140,0.15); }
        .pds-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .pds-title { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.55); }
        .pds-btn-add { padding: 5px 11px; background: rgba(58,144,144,0.12); border: 1px solid rgba(58,144,144,0.3); border-radius: 6px; color: #a8d5d5; font-size: 12px; cursor: pointer; }
        .pds-btn-add:hover { background: rgba(58,144,144,0.2); }
        .pds-empty { font-size: 12px; color: rgba(168,213,213,0.4); font-style: italic; padding: 8px 0; }
        .pds-days { display: flex; flex-direction: column; gap: 10px; }
        .pds-day { padding: 12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(62,140,140,0.15); border-radius: 8px; }
        .pds-day-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .pds-day-label { font-size: 13px; font-weight: 700; color: #e8f5f5; }
        .pds-day-del { background: transparent; border: none; color: rgba(196,74,90,0.7); font-size: 18px; cursor: pointer; line-height: 1; padding: 0 6px; }
        .pds-day-del:hover { color: #ffb4c0; }
        .pds-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
        .pds-row-label { font-size: 11px; color: rgba(168,213,213,0.55); padding-top: 6px; }
        .pds-text-input { width: 100%; padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(62,140,140,0.2); border-radius: 6px; color: #e8f5f5; font-family: inherit; font-size: 12px; resize: vertical; }
        .pds-text-input:focus { outline: none; border-color: rgba(58,144,144,0.5); }
        .pds-chips { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
        .pds-chip { padding: 4px 9px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.18); border-radius: 999px; color: rgba(168,213,213,0.6); font-size: 11px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px; }
        .pds-chip:hover { background: rgba(58,144,144,0.1); }
        .pds-chip-on { background: rgba(58,144,144,0.2); border-color: rgba(58,144,144,0.5); color: #e8f5f5; font-weight: 600; }
        .pds-chip-choice { background: rgba(232,160,48,0.12); border-color: rgba(232,160,48,0.4); color: #f0c87a; font-weight: 600; }
        .pds-chip-addon-on { background: rgba(155,107,217,0.18); border-color: rgba(155,107,217,0.5); color: #c8a9f0; font-weight: 600; }
        .pds-chip-add { background: transparent; border-style: dashed; color: rgba(168,213,213,0.5); }
        .pds-chip-disabled { opacity: 0.35; cursor: not-allowed; text-decoration: line-through; }
        .pds-chip-disabled:hover { background: rgba(255,255,255,0.04); }
        .pds-chip-x { background: transparent; border: none; color: inherit; font-size: 14px; cursor: pointer; line-height: 1; padding: 0; margin-left: 2px; }
        .pds-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .pds-btn-save { padding: 8px 14px; background: linear-gradient(135deg, #1a5c3c, #2a8060); border: none; border-radius: 8px; color: #e8f5f5; font-size: 12px; font-weight: 600; cursor: pointer; }
        .pds-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .pds-btn-cancel { padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.18); border-radius: 8px; color: rgba(168,213,213,0.6); font-size: 12px; cursor: pointer; }
        .pds-msg { font-size: 12px; color: rgba(168,213,213,0.7); }

        .pds-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .pds-modal { max-width: 560px; width: 100%; background: #0f2020; border: 1px solid rgba(62,140,140,0.3); border-radius: 12px; padding: 20px; }
        .pds-modal-title { font-size: 13px; font-weight: 600; color: #e8f5f5; margin-bottom: 12px; }
        .pds-modal-foot { display: flex; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(62,140,140,0.15); }
      `}</style>
    </div>
  );
}
