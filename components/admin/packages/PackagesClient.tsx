"use client";

import { useState } from "react";
import type { Package } from "@/lib/db/types";
import { PackageDayScheduleEditor } from "./PackageDayScheduleEditor";

interface Props {
  initialPackages: Package[];
}

export function PackagesClient({ initialPackages }: Props) {
  const [packages, setPackages] = useState<Package[]>(initialPackages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const emptyForm = {
    name: "", includes: "", description: "",
    weekend_price: "", weekday_price: "",
    status: "active" as const, sort_order: "99",
  };
  const [newForm, setNewForm] = useState(emptyForm);

  const [editForms, setEditForms] = useState<Record<string, Record<string, string>>>({});

  const startEdit = (pkg: Package) => {
    setEditForms((prev) => ({
      ...prev,
      [pkg.id]: {
        name: pkg.name,
        includes: pkg.includes,
        description: pkg.description ?? "",
        weekend_price: String(pkg.weekend_price),
        weekday_price: String(pkg.weekday_price),
        status: pkg.status,
        sort_order: String(pkg.sort_order),
      },
    }));
    setEditingId(pkg.id);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    const form = editForms[id];
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          includes: form.includes,
          description: form.description || null,
          weekend_price: parseFloat(form.weekend_price as string),
          weekday_price: parseFloat(form.weekday_price as string),
          status: form.status,
          sort_order: parseInt(form.sort_order as string, 10),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated: Package = await res.json();
      setPackages((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Greška");
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name,
          includes: newForm.includes,
          description: newForm.description || null,
          weekend_price: parseFloat(newForm.weekend_price),
          weekday_price: parseFloat(newForm.weekday_price),
          status: newForm.status,
          sort_order: parseInt(newForm.sort_order, 10),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const created: Package = await res.json();
      setPackages((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setNewForm(emptyForm);
      setShowNewForm(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Greška");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (pkg: Package) => {
    const newStatus = pkg.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) return;
    const updated: Package = await res.json();
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? updated : p)));
  };

  const ef = (id: string) => editForms[id] ?? {};
  const setEf = (id: string, key: string, value: string) =>
    setEditForms((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  return (
    <div className="pkgs">
      <div className="pkgs-header">
        <span className="pkgs-count">{packages.length} paketa</span>
        <button className="pkg-btn pkg-btn--new" onClick={() => setShowNewForm((v) => !v)}>
          {showNewForm ? "Otkaži" : "+ Novi paket"}
        </button>
      </div>

      {showNewForm && (
        <div className="pkg-card pkg-card--new">
          <div className="pkg-form-title">Novi paket</div>
          <PackageForm
            form={newForm}
            onChange={(k, v) => setNewForm((p) => ({ ...p, [k]: v }))}
          />
          <div className="pkg-form-actions">
            <button className="pkg-btn pkg-btn--save" onClick={saveNew} disabled={saving}>
              {saving ? "Čuvam..." : "Sačuvaj paket"}
            </button>
            <button className="pkg-btn pkg-btn--cancel" onClick={() => setShowNewForm(false)}>
              Odustani
            </button>
          </div>
        </div>
      )}

      <div className="pkgs-list">
        {packages.map((pkg) => (
          <div key={pkg.id} className={`pkg-card ${pkg.status === "inactive" ? "pkg-card--inactive" : ""}`}>
            {editingId === pkg.id ? (
              <>
                <PackageForm
                  form={ef(pkg.id) as Record<string, string>}
                  onChange={(k, v) => setEf(pkg.id, k, v)}
                />
                <div className="pkg-form-actions">
                  <button className="pkg-btn pkg-btn--save" onClick={() => saveEdit(pkg.id)} disabled={saving}>
                    {saving ? "Čuvam..." : "Sačuvaj izmjene"}
                  </button>
                  <button className="pkg-btn pkg-btn--cancel" onClick={cancelEdit}>
                    Odustani
                  </button>
                </div>
              </>
            ) : (
              <div className="pkg-view">
                <div className="pkg-view-top">
                  <div>
                    <div className="pkg-name">{pkg.name}</div>
                    <div className="pkg-includes">{pkg.includes}</div>
                  </div>
                  <div className="pkg-prices">
                    <span className="pkg-price">
                      <span className="pkg-price-label">Vikend</span>
                      {pkg.weekend_price} €
                    </span>
                    <span className="pkg-price">
                      <span className="pkg-price-label">Radni dan</span>
                      {pkg.weekday_price} €
                    </span>
                  </div>
                </div>
                {pkg.description && (
                  <div className="pkg-desc">{pkg.description}</div>
                )}
                <div className="pkg-actions">
                  <span
                    className={`pkg-status-badge ${pkg.status === "active" ? "pkg-status-badge--active" : "pkg-status-badge--inactive"}`}
                    onClick={() => toggleStatus(pkg)}
                    title="Klikni za promjenu statusa"
                  >
                    {pkg.status === "active" ? "Aktivan" : "Neaktivan"}
                  </span>
                  <button className="pkg-btn pkg-btn--edit" onClick={() => startEdit(pkg)}>
                    Uredi
                  </button>
                </div>
                <PackageDayScheduleEditor
                  packageId={pkg.id}
                  initial={pkg.day_schedule}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .pkgs { }
        .pkgs-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .pkgs-count { font-size: 13px; color: rgba(168,213,213,0.4); }
        .pkgs-list { display: flex; flex-direction: column; gap: 12px; }

        .pkg-card { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; padding: 20px; }
        .pkg-card--inactive { opacity: 0.55; }
        .pkg-card--new { border-color: rgba(58,144,144,0.3); background: rgba(58,144,144,0.04); margin-bottom: 16px; }
        .pkg-form-title { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(168,213,213,0.5); margin-bottom: 16px; }

        .pkg-view-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 10px; }
        .pkg-name { font-size: 17px; font-weight: 700; color: #e8f5f5; margin-bottom: 4px; }
        .pkg-includes { font-size: 13px; color: rgba(168,213,213,0.55); }
        .pkg-desc { font-size: 13px; color: rgba(168,213,213,0.45); line-height: 1.6; margin-top: 8px; border-top: 1px solid rgba(62,140,140,0.1); padding-top: 10px; white-space: pre-line; }

        .pkg-prices { display: flex; gap: 16px; flex-shrink: 0; }
        .pkg-price { display: flex; flex-direction: column; align-items: flex-end; font-size: 18px; font-weight: 700; color: #a8d5d5; }
        .pkg-price-label { font-size: 10px; font-weight: 400; color: rgba(168,213,213,0.4); letter-spacing: 0.08em; text-transform: uppercase; }

        .pkg-actions { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(62,140,140,0.1); }
        .pkg-status-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 5px; border: 1px solid; cursor: pointer; transition: opacity 0.2s; }
        .pkg-status-badge:hover { opacity: 0.7; }
        .pkg-status-badge--active { color: #3aaa70; border-color: rgba(58,170,112,0.4); background: rgba(58,170,112,0.08); }
        .pkg-status-badge--inactive { color: rgba(168,213,213,0.4); border-color: rgba(62,140,140,0.2); }

        .pkg-btn { padding: 8px 16px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
        .pkg-btn--new { background: rgba(255,255,255,0.05); color: rgba(168,213,213,0.7); border: 1px solid rgba(62,140,140,0.2); }
        .pkg-btn--edit { background: rgba(255,255,255,0.04); color: rgba(168,213,213,0.6); border: 1px solid rgba(62,140,140,0.15); font-size: 12px; padding: 5px 12px; }
        .pkg-btn--save { background: linear-gradient(135deg, #1a5c3c, #2a8060); color: #e8f5f5; }
        .pkg-btn--cancel { background: rgba(255,255,255,0.04); color: rgba(168,213,213,0.5); border: 1px solid rgba(62,140,140,0.15); }
        .pkg-btn--save:hover:not(:disabled) { background: linear-gradient(135deg, #206848, #339070); }
        .pkg-btn--cancel:hover { background: rgba(255,255,255,0.07); }
        .pkg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pkg-form-actions { display: flex; gap: 8px; margin-top: 16px; }

        .pkg-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
        .pkg-field label { font-size: 11px; color: rgba(168,213,213,0.4); font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; }
        .pkg-input { width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; }
        .pkg-input:focus { border-color: rgba(58,144,144,0.5); }
        .pkg-input option { background: #0f2020; }
        .pkg-textarea { resize: vertical; min-height: 80px; }
        .pkg-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .pkg-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      `}</style>
    </div>
  );
}

function PackageForm({
  form,
  onChange,
}: {
  form: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      <div className="pkg-field">
        <label>Naziv</label>
        <input className="pkg-input" value={form.name ?? ""} onChange={(e) => onChange("name", e.target.value)} />
      </div>
      <div className="pkg-field">
        <label>Uključeno (kratko)</label>
        <input className="pkg-input" value={form.includes ?? ""} onChange={(e) => onChange("includes", e.target.value)} placeholder="3 dana, 2 noći, 5 obroka + Rafting" />
      </div>
      <div className="pkg-field">
        <label>Opis</label>
        <textarea className="pkg-input pkg-textarea" value={form.description ?? ""} onChange={(e) => onChange("description", e.target.value)} />
      </div>
      <div className="pkg-row-3">
        <div className="pkg-field">
          <label>Cijena — vikend (€)</label>
          <input className="pkg-input" type="number" step="0.01" value={form.weekend_price ?? ""} onChange={(e) => onChange("weekend_price", e.target.value)} />
        </div>
        <div className="pkg-field">
          <label>Cijena — radni dan (€)</label>
          <input className="pkg-input" type="number" step="0.01" value={form.weekday_price ?? ""} onChange={(e) => onChange("weekday_price", e.target.value)} />
        </div>
        <div className="pkg-field">
          <label>Status</label>
          <select className="pkg-input" value={form.status ?? "active"} onChange={(e) => onChange("status", e.target.value)}>
            <option value="active">Aktivan</option>
            <option value="inactive">Neaktivan</option>
          </select>
        </div>
      </div>
    </>
  );
}
