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

interface Props {
  schedule: PackageDay[] | null;
  selections: Selections | null;
  computedTotal: number | null;
  /** Mapa code → label/emoji iz catalog-a (za labelovanje custom kodova). */
  catalog?: Map<string, { label: string; emoji: string | null }>;
}

function meta(
  code: string,
  catalog?: Props["catalog"],
): { label: string; emoji: string } {
  if (catalog) {
    const c = catalog.get(code);
    if (c) return { label: c.label, emoji: c.emoji ?? "•" };
  }
  if (code in MEAL_LABELS) return MEAL_LABELS[code as MealType];
  if (code in ACTIVITY_LABELS) return ACTIVITY_LABELS[code as ActivityType];
  return { label: code, emoji: "•" };
}

export function ReservationSchedule({
  schedule,
  selections,
  computedTotal,
  catalog,
}: Props) {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="rs-empty">
        Nema rasporeda za ovu rezervaciju (paket nema dnevni raspored).
      </div>
    );
  }

  const sel: Selections = selections ?? {};

  return (
    <div className="rs">
      {schedule.map((day, dayIdx) => {
        const addons = sel.addons?.[String(dayIdx)] ?? [];
        return (
          <div key={day.day} className="rs-day">
            <div className="rs-day-head">Dan {day.day}</div>

            {day.meals.length > 0 && (
              <Row title="Obroci">
                {day.meals.map((e, i) => {
                  if (isChoice(e)) {
                    const k = selectionKey(dayIdx, "meals", i);
                    const picked = sel.choices?.[k];
                    return (
                      <ChoiceItem
                        key={`m${i}`}
                        options={e}
                        picked={picked}
                        catalog={catalog}
                      />
                    );
                  }
                  const m = meta(e, catalog);
                  return (
                    <span key={`m${i}`} className="rs-chip rs-chip-fixed">
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
                    const k = selectionKey(dayIdx, "activities", i);
                    const picked = sel.choices?.[k];
                    return (
                      <ChoiceItem
                        key={`a${i}`}
                        options={e}
                        picked={picked}
                        catalog={catalog}
                      />
                    );
                  }
                  const a = meta(e, catalog);
                  return (
                    <span key={`a${i}`} className="rs-chip rs-chip-fixed">
                      {a.emoji} {a.label}
                    </span>
                  );
                })}
              </Row>
            )}

            {addons.length > 0 && (
              <Row title="Dokupljeno">
                {addons.map((code, i) => {
                  const m = meta(code, catalog);
                  return (
                    <span key={`d${i}`} className="rs-chip rs-chip-addon">
                      {m.emoji} {m.label}
                    </span>
                  );
                })}
              </Row>
            )}
          </div>
        );
      })}

      {computedTotal != null && (
        <div className="rs-total">
          Izračunata cena: <strong>{Number(computedTotal)} €</strong>{" "}
          <span className="rs-total-note">
            (paket + dokupljene stavke, server-side)
          </span>
        </div>
      )}

      <style>{`
        .rs { display: flex; flex-direction: column; gap: 10px; }
        .rs-empty { font-size: 13px; color: rgba(168,213,213,0.45); font-style: italic; padding: 8px 0; }
        .rs-day { padding: 12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(62,140,140,0.18); border-radius: 8px; }
        .rs-day-head { font-size: 12px; font-weight: 700; color: #e8f5f5; margin-bottom: 8px; letter-spacing: 0.05em; }
        .rs-row { display: grid; grid-template-columns: 90px 1fr; gap: 10px; align-items: flex-start; margin-bottom: 6px; }
        .rs-row-label { font-size: 10px; color: rgba(168,213,213,0.55); padding-top: 5px; text-transform: uppercase; letter-spacing: 0.06em; }
        .rs-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .rs-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; border: 1px solid; display: inline-flex; align-items: center; gap: 4px; }
        .rs-chip-fixed { background: rgba(58,144,144,0.12); border-color: rgba(58,144,144,0.35); color: #a8d5d5; }
        .rs-chip-addon { background: rgba(155,107,217,0.18); border-color: rgba(155,107,217,0.45); color: #c8a9f0; font-weight: 600; }
        .rs-chip-choice { background: rgba(232,160,48,0.12); border-color: rgba(232,160,48,0.4); color: #f0c87a; }
        .rs-chip-choice strong { color: #ffd89a; }
        .rs-chip-choice-missing { color: rgba(255,180,192,0.85); border-color: rgba(196,74,90,0.4); background: rgba(196,74,90,0.1); }
        .rs-total { padding: 10px 12px; background: rgba(58,144,144,0.08); border: 1px solid rgba(62,140,140,0.25); border-radius: 8px; font-size: 13px; color: #e8f5f5; }
        .rs-total strong { color: #7dcfcf; font-size: 15px; }
        .rs-total-note { color: rgba(168,213,213,0.5); font-size: 11px; margin-left: 6px; }
      `}</style>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rs-row">
      <span className="rs-row-label">{title}</span>
      <div className="rs-chips">{children}</div>
    </div>
  );
}

function ChoiceItem({
  options,
  picked,
  catalog,
}: {
  options: string[];
  picked?: string;
  catalog?: Props["catalog"];
}) {
  if (picked && options.includes(picked)) {
    const m = meta(picked, catalog);
    return (
      <span className="rs-chip rs-chip-choice">
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
    <span className="rs-chip rs-chip-choice rs-chip-choice-missing">
      ⚠ Nije izabrano: {opts}
    </span>
  );
}
