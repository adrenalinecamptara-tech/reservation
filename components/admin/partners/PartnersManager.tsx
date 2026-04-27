"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Partner } from "@/lib/db/types";

interface Props {
  partners: Partner[];
}

export function PartnersManager({ partners }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState(25);
  const [newNotes, setNewNotes] = useState("");

  const startEdit = (p: Partner) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(Number(p.default_price_per_person));
    setNotes(p.notes ?? "");
    setError(null);
  };

  const cancel = () => {
    setEditingId(null);
    setError(null);
  };

  const save = async (id: string) => {
    setError(null);
    if (!name.trim()) {
      setError("Ime je obavezno.");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          default_price_per_person: price,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (p: Partner) => {
    if (!confirm(`Obrisati partnera "${p.name}"?`)) return;
    setBusy(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/partners/${p.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Greška");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setBusy(null);
    }
  };

  const createPartner = async () => {
    setError(null);
    if (!newName.trim()) {
      setError("Ime je obavezno.");
      return;
    }
    setBusy("__new__");
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          default_price_per_person: newPrice,
          notes: newNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setNewName("");
      setNewPrice(25);
      setNewNotes("");
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pm">
      {error && <div className="pm-error">{error}</div>}

      {adding ? (
        <div className="pm-row pm-row-new">
          <div className="pm-edit">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="pm-input"
              placeholder="Ime partnera"
              autoFocus
            />
            <input
              type="number"
              min={0}
              step={1}
              value={newPrice}
              onChange={(e) => setNewPrice(Number(e.target.value))}
              className="pm-input pm-input-sm"
              placeholder="€/os/noć"
            />
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="pm-input"
              placeholder="Napomena (opciono)"
            />
            <button onClick={createPartner} disabled={busy === "__new__"} className="pm-btn-save">
              {busy === "__new__" ? "…" : "Sačuvaj"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              disabled={busy === "__new__"}
              className="pm-btn-ghost"
            >
              Otkaži
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="pm-btn-add">
          + Novi partner
        </button>
      )}

      {partners.length === 0 && !adding && (
        <div className="pm-empty">Nema partnera.</div>
      )}
      {partners.map((p) => {
        const isEditing = editingId === p.id;
        return (
          <div key={p.id} className="pm-row">
            {isEditing ? (
              <div className="pm-edit">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pm-input"
                  placeholder="Ime"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="pm-input pm-input-sm"
                  placeholder="€/os/noć"
                />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="pm-input"
                  placeholder="Napomena"
                />
                <button onClick={() => save(p.id)} disabled={busy === p.id} className="pm-btn-save">
                  {busy === p.id ? "…" : "Sačuvaj"}
                </button>
                <button onClick={cancel} disabled={busy === p.id} className="pm-btn-ghost">
                  Otkaži
                </button>
              </div>
            ) : (
              <div className="pm-view">
                <div className="pm-info">
                  <span className="pm-name">{p.name}</span>
                  <span className="pm-price">{Number(p.default_price_per_person)} €/os/noć</span>
                  {p.notes && <span className="pm-notes">{p.notes}</span>}
                </div>
                <div className="pm-actions">
                  <button onClick={() => startEdit(p)} className="pm-btn">
                    Izmeni
                  </button>
                  <button onClick={() => remove(p)} disabled={busy === p.id} className="pm-btn-del">
                    {busy === p.id ? "…" : "Obriši"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .pm { display: flex; flex-direction: column; gap: 8px; }
        .pm-empty { padding: 16px; text-align: center; color: rgba(168,213,213,0.4); font-style: italic; font-size: 13px; }
        .pm-row { padding: 12px 14px; background: rgba(76,29,149,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 10px; }
        .pm-view { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .pm-info { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; flex: 1; min-width: 0; }
        .pm-name { font-size: 14px; font-weight: 600; color: #e8f5f5; }
        .pm-price { font-size: 12px; color: #e9d5ff; }
        .pm-notes { font-size: 12px; color: rgba(168,213,213,0.5); font-style: italic; }
        .pm-actions { display: flex; gap: 6px; }
        .pm-edit { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .pm-edit .pm-input { flex: 1; min-width: 120px; }
        .pm-input { padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(62,140,140,0.2); border-radius: 6px; color: #e8f5f5; font-size: 13px; font-family: inherit; }
        .pm-input:focus { outline: none; border-color: rgba(139,92,246,0.5); }
        .pm-input-sm { max-width: 110px; }
        .pm-btn { padding: 6px 12px; background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.35); border-radius: 6px; color: #e8f5f5; font-size: 12px; cursor: pointer; }
        .pm-btn:hover { background: rgba(139,92,246,0.3); }
        .pm-btn-save { padding: 7px 12px; background: linear-gradient(135deg,#6d28d9,#8b5cf6); border: none; border-radius: 6px; color: #e8f5f5; font-size: 12px; font-weight: 600; cursor: pointer; }
        .pm-btn-save:disabled { opacity: 0.5; }
        .pm-btn-ghost { padding: 6px 12px; background: transparent; border: 1px solid rgba(62,140,140,0.2); border-radius: 6px; color: rgba(168,213,213,0.7); font-size: 12px; cursor: pointer; }
        .pm-btn-del { padding: 6px 10px; background: transparent; border: 1px solid rgba(196,74,90,0.3); border-radius: 6px; color: rgba(255,180,192,0.8); font-size: 12px; cursor: pointer; }
        .pm-btn-del:hover:not(:disabled) { background: rgba(196,74,90,0.15); }
        .pm-btn-del:disabled { opacity: 0.5; }
        .pm-btn-add { align-self: flex-start; padding: 9px 14px; background: linear-gradient(135deg,#6d28d9,#8b5cf6); border: none; border-radius: 8px; color: #e8f5f5; font-size: 13px; font-weight: 600; cursor: pointer; margin-bottom: 4px; }
        .pm-btn-add:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(139,92,246,0.3); }
        .pm-row-new { background: rgba(139,92,246,0.1); border-color: rgba(139,92,246,0.4); }
        .pm-error { padding: 10px 12px; background: rgba(196,74,90,0.1); border: 1px solid rgba(196,74,90,0.3); border-radius: 8px; color: #ffb4c0; font-size: 13px; margin-bottom: 4px; }
      `}</style>
    </div>
  );
}
