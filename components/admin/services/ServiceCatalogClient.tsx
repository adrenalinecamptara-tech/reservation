"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceCatalogItem, ServiceCategory, ServiceUnit } from "@/lib/db/types";

interface Props {
  initial: ServiceCatalogItem[];
}

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "meal", label: "Obrok" },
  { value: "activity", label: "Aktivnost" },
  { value: "marker", label: "Marker (ne košta)" },
];

const UNITS: { value: ServiceUnit; label: string }[] = [
  { value: "per_person", label: "Po osobi" },
  { value: "flat", label: "Flat (jednom za grupu)" },
];

export function ServiceCatalogClient({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<ServiceCategory | "all">("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState<Record<string, string>>({
    code: "",
    label: "",
    category: "activity",
    emoji: "",
    unit: "per_person",
    price: "0",
    duration_hours: "",
    sort_order: "50",
  });

  const filtered =
    filter === "all" ? items : items.filter((i) => i.category === filter);

  const startEdit = (it: ServiceCatalogItem) => {
    setEditing(it.code);
    setEditForm({
      label: it.label,
      category: it.category,
      emoji: it.emoji ?? "",
      unit: it.unit,
      price: String(it.price),
      duration_hours: it.duration_hours == null ? "" : String(it.duration_hours),
      description: it.description ?? "",
      sort_order: String(it.sort_order),
      active: it.active ? "1" : "0",
      is_addon_eligible: it.is_addon_eligible ? "1" : "0",
    });
    setError(null);
  };

  const save = async (code: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/services/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editForm.label.trim(),
          category: editForm.category,
          emoji: editForm.emoji.trim() || null,
          unit: editForm.unit,
          price: Number(editForm.price),
          duration_hours: editForm.duration_hours
            ? Number(editForm.duration_hours)
            : null,
          description: editForm.description?.trim() || null,
          sort_order: Number(editForm.sort_order),
          active: editForm.active === "1",
          is_addon_eligible: editForm.is_addon_eligible === "1",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setItems((prev) => prev.map((i) => (i.code === code ? json : i)));
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (code: string) => {
    if (!confirm(`Obrisati uslugu "${code}"?`)) return;
    try {
      const res = await fetch(`/api/services/${code}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Greška");
      }
      setItems((prev) => prev.filter((i) => i.code !== code));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    }
  };

  const create = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newForm.code.trim().toLowerCase().replace(/\s+/g, "_"),
          label: newForm.label.trim(),
          category: newForm.category,
          emoji: newForm.emoji.trim() || null,
          unit: newForm.unit,
          price: Number(newForm.price),
          duration_hours: newForm.duration_hours
            ? Number(newForm.duration_hours)
            : null,
          sort_order: Number(newForm.sort_order),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setItems((prev) =>
        [...prev, json].sort((a, b) => a.sort_order - b.sort_order),
      );
      setNewForm({
        code: "",
        label: "",
        category: "activity",
        emoji: "",
        unit: "per_person",
        price: "0",
        duration_hours: "",
        sort_order: "50",
      });
      setShowNew(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sc">
      <div className="sc-bar">
        <div className="sc-filters">
          {(["all", "meal", "activity", "marker"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`sc-filter ${filter === f ? "sc-filter-on" : ""}`}
            >
              {f === "all"
                ? `Sve (${items.length})`
                : `${CATEGORIES.find((c) => c.value === f)?.label} (${items.filter((i) => i.category === f).length})`}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew((s) => !s)} className="sc-btn-add">
          {showNew ? "Otkaži" : "+ Nova usluga"}
        </button>
      </div>

      {error && <div className="sc-error">{error}</div>}

      {showNew && (
        <div className="sc-card sc-card-new">
          <div className="sc-form-title">Nova usluga</div>
          <div className="sc-grid">
            <Field label="Šifra (lowercase)">
              <input
                className="sc-input"
                value={newForm.code}
                onChange={(e) =>
                  setNewForm({ ...newForm, code: e.target.value })
                }
                placeholder="npr. ziplajn"
              />
            </Field>
            <Field label="Naziv">
              <input
                className="sc-input"
                value={newForm.label}
                onChange={(e) =>
                  setNewForm({ ...newForm, label: e.target.value })
                }
                placeholder="Zip Line"
              />
            </Field>
            <Field label="Emoji">
              <input
                className="sc-input"
                value={newForm.emoji}
                onChange={(e) =>
                  setNewForm({ ...newForm, emoji: e.target.value })
                }
                placeholder="🪂"
              />
            </Field>
            <Field label="Kategorija">
              <select
                className="sc-input"
                value={newForm.category}
                onChange={(e) =>
                  setNewForm({ ...newForm, category: e.target.value })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jedinica">
              <select
                className="sc-input"
                value={newForm.unit}
                onChange={(e) =>
                  setNewForm({ ...newForm, unit: e.target.value })
                }
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cena (€)">
              <input
                className="sc-input"
                type="number"
                step="0.01"
                value={newForm.price}
                onChange={(e) =>
                  setNewForm({ ...newForm, price: e.target.value })
                }
              />
            </Field>
            <Field label="Trajanje (h)">
              <input
                className="sc-input"
                type="number"
                step="0.5"
                value={newForm.duration_hours}
                onChange={(e) =>
                  setNewForm({ ...newForm, duration_hours: e.target.value })
                }
              />
            </Field>
            <Field label="Sort">
              <input
                className="sc-input"
                type="number"
                value={newForm.sort_order}
                onChange={(e) =>
                  setNewForm({ ...newForm, sort_order: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="sc-form-foot">
            <button onClick={create} disabled={saving} className="sc-btn-save">
              {saving ? "Čuvam…" : "Sačuvaj"}
            </button>
          </div>
        </div>
      )}

      <div className="sc-list">
        {filtered.map((it) => (
          <div key={it.code} className="sc-card">
            {editing === it.code ? (
              <>
                <div className="sc-form-title">
                  <span className="sc-emoji">{it.emoji}</span>
                  <code>{it.code}</code>
                </div>
                <div className="sc-grid">
                  <Field label="Naziv">
                    <input
                      className="sc-input"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm({ ...editForm, label: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Emoji">
                    <input
                      className="sc-input"
                      value={editForm.emoji}
                      onChange={(e) =>
                        setEditForm({ ...editForm, emoji: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Kategorija">
                    <select
                      className="sc-input"
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Jedinica">
                    <select
                      className="sc-input"
                      value={editForm.unit}
                      onChange={(e) =>
                        setEditForm({ ...editForm, unit: e.target.value })
                      }
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cena (€)">
                    <input
                      className="sc-input"
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Trajanje (h)">
                    <input
                      className="sc-input"
                      type="number"
                      step="0.5"
                      value={editForm.duration_hours}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          duration_hours: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Sort">
                    <input
                      className="sc-input"
                      type="number"
                      value={editForm.sort_order}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          sort_order: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Aktivan">
                    <select
                      className="sc-input"
                      value={editForm.active}
                      onChange={(e) =>
                        setEditForm({ ...editForm, active: e.target.value })
                      }
                    >
                      <option value="1">Da</option>
                      <option value="0">Ne</option>
                    </select>
                  </Field>
                  <Field label="Može biti addon">
                    <select
                      className="sc-input"
                      value={editForm.is_addon_eligible}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          is_addon_eligible: e.target.value,
                        })
                      }
                    >
                      <option value="1">Da</option>
                      <option value="0">Ne</option>
                    </select>
                  </Field>
                </div>
                <Field label="Opis">
                  <textarea
                    className="sc-input"
                    rows={2}
                    value={editForm.description ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                  />
                </Field>
                <div className="sc-form-foot">
                  <button
                    onClick={() => save(it.code)}
                    disabled={saving}
                    className="sc-btn-save"
                  >
                    {saving ? "Čuvam…" : "Sačuvaj"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="sc-btn-cancel"
                  >
                    Otkaži
                  </button>
                </div>
              </>
            ) : (
              <div className="sc-view">
                <div className="sc-view-main">
                  <div className="sc-view-head">
                    <span className="sc-emoji">{it.emoji ?? "•"}</span>
                    <span className="sc-label">{it.label}</span>
                    <code className="sc-code">{it.code}</code>
                    <span className={`sc-cat sc-cat-${it.category}`}>
                      {CATEGORIES.find((c) => c.value === it.category)?.label}
                    </span>
                    {!it.active && <span className="sc-off">neaktivno</span>}
                  </div>
                  <div className="sc-view-meta">
                    <span className="sc-price">
                      {Number(it.price)} €{" "}
                      {it.unit === "per_person" ? "/os" : "(flat)"}
                    </span>
                    {it.duration_hours != null && (
                      <span>⏱ {Number(it.duration_hours)}h</span>
                    )}
                    {!it.is_addon_eligible && <span>nije addon</span>}
                  </div>
                  {it.description && (
                    <div className="sc-desc">{it.description}</div>
                  )}
                </div>
                <div className="sc-view-actions">
                  <button onClick={() => startEdit(it)} className="sc-btn">
                    Uredi
                  </button>
                  <button
                    onClick={() => remove(it.code)}
                    className="sc-btn-del"
                  >
                    Obriši
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .sc { display: flex; flex-direction: column; gap: 12px; }
        .sc-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .sc-filters { display: flex; gap: 6px; flex-wrap: wrap; }
        .sc-filter { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.18); border-radius: 999px; color: rgba(168,213,213,0.65); font-size: 12px; cursor: pointer; }
        .sc-filter:hover { background: rgba(58,144,144,0.12); }
        .sc-filter-on { background: rgba(58,144,144,0.2); border-color: rgba(58,144,144,0.5); color: #e8f5f5; font-weight: 600; }

        .sc-btn-add { padding: 9px 14px; background: linear-gradient(135deg, #1e5c5c, #2a8080); border: none; border-radius: 8px; color: #e8f5f5; font-size: 13px; font-weight: 600; cursor: pointer; }
        .sc-btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(30,92,92,0.4); }

        .sc-error { padding: 10px 14px; background: rgba(196,74,90,0.12); border: 1px solid rgba(196,74,90,0.3); border-radius: 8px; color: #ffb4c0; font-size: 13px; }
        .sc-list { display: flex; flex-direction: column; gap: 8px; }
        .sc-card { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.18); border-radius: 10px; padding: 14px 16px; }
        .sc-card-new { border-color: rgba(58,144,144,0.35); background: rgba(58,144,144,0.05); margin-bottom: 8px; }
        .sc-form-title { font-size: 13px; font-weight: 600; color: rgba(168,213,213,0.7); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }

        .sc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
        @media (max-width: 700px) { .sc-grid { grid-template-columns: 1fr 1fr; } }
        .sc-field { display: flex; flex-direction: column; gap: 4px; }
        .sc-field-label { font-size: 10px; color: rgba(168,213,213,0.5); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
        .sc-input { padding: 8px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(62,140,140,0.2); border-radius: 6px; color: #e8f5f5; font-family: inherit; font-size: 13px; outline: none; }
        .sc-input:focus { border-color: rgba(58,144,144,0.5); }
        .sc-input option { background: #0f2020; }

        .sc-form-foot { display: flex; gap: 8px; margin-top: 12px; }
        .sc-btn-save { padding: 8px 14px; background: linear-gradient(135deg, #1a5c3c, #2a8060); border: none; border-radius: 8px; color: #e8f5f5; font-size: 12px; font-weight: 600; cursor: pointer; }
        .sc-btn-save:disabled { opacity: 0.5; }
        .sc-btn-cancel { padding: 8px 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.18); border-radius: 8px; color: rgba(168,213,213,0.6); font-size: 12px; cursor: pointer; }

        .sc-view { display: flex; gap: 12px; align-items: center; }
        .sc-view-main { flex: 1; min-width: 0; }
        .sc-view-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .sc-emoji { font-size: 18px; }
        .sc-label { font-size: 14px; font-weight: 600; color: #e8f5f5; }
        .sc-code { font-family: ui-monospace, monospace; font-size: 11px; padding: 2px 6px; background: rgba(0,0,0,0.3); border-radius: 4px; color: rgba(168,213,213,0.5); }
        .sc-cat { font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
        .sc-cat-meal { background: rgba(232,160,48,0.15); color: #f0c87a; }
        .sc-cat-activity { background: rgba(58,170,112,0.15); color: #a7e8c5; }
        .sc-cat-marker { background: rgba(168,213,213,0.1); color: rgba(168,213,213,0.55); }
        .sc-off { font-size: 10px; padding: 2px 7px; border-radius: 4px; background: rgba(196,74,90,0.15); color: #ffb4c0; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .sc-view-meta { display: flex; gap: 12px; font-size: 12px; color: rgba(168,213,213,0.6); }
        .sc-price { color: #a8d5d5; font-weight: 600; }
        .sc-desc { font-size: 12px; color: rgba(168,213,213,0.45); margin-top: 4px; font-style: italic; }
        .sc-view-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .sc-btn { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.18); border-radius: 6px; color: rgba(168,213,213,0.7); font-size: 12px; cursor: pointer; }
        .sc-btn:hover { background: rgba(58,144,144,0.12); color: #e8f5f5; }
        .sc-btn-del { padding: 6px 10px; background: transparent; border: 1px solid rgba(196,74,90,0.3); border-radius: 6px; color: rgba(255,180,192,0.8); font-size: 12px; cursor: pointer; }
        .sc-btn-del:hover { background: rgba(196,74,90,0.12); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="sc-field">
      <span className="sc-field-label">{label}</span>
      {children}
    </div>
  );
}
