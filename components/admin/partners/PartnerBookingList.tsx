"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PartnerBooking } from "@/lib/db/types";

interface Props {
  bookings: PartnerBooking[];
}

function addDaysIso(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmt(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}.`;
}

export function PartnerBookingList({ bookings }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    if (!confirm("Obrisati ovu rezervaciju partnera?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/partners/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Greška");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Greška");
    } finally {
      setBusyId(null);
    }
  };

  if (bookings.length === 0) {
    return <div className="pbl-empty">Nema rezervacija partnera.</div>;
  }

  return (
    <div className="pbl">
      {bookings.map((b) => {
        const departure = addDaysIso(b.arrival_date, b.nights);
        const total = Number(b.price_per_person) * b.number_of_people * b.nights;
        return (
          <div key={b.id} className="pbl-row">
            <div className="pbl-main">
              <div className="pbl-top">
                <span className="pbl-name">{b.partner?.name ?? "Partner"}</span>
                <span className="pbl-badge">Partner</span>
              </div>
              <div className="pbl-meta">
                <span>📅 {fmt(b.arrival_date)} → {fmt(departure)} ({b.nights} {b.nights === 1 ? "noć" : "noći"})</span>
                <span>🏠 {b.cabin?.name ?? "—"} · {b.floor === "ground" ? "Prizemlje" : "Sprat"}</span>
                <span>👥 {b.number_of_people} osoba</span>
                <span>
                  📦{" "}
                  {b.package?.name ? (
                    <strong>{b.package.name}</strong>
                  ) : (
                    <em style={{ color: "rgba(168,213,213,0.5)" }}>
                      bez paketa
                    </em>
                  )}
                </span>
                <span>💶 {Number(b.price_per_person)} €/os/noć · <strong>{total} €</strong></span>
              </div>
              {b.notes && <div className="pbl-notes">{b.notes}</div>}
            </div>
            <button
              className="pbl-del"
              onClick={() => onDelete(b.id)}
              disabled={busyId === b.id}
              aria-label="Obriši"
            >
              {busyId === b.id ? "…" : "Obriši"}
            </button>
          </div>
        );
      })}

      <style>{`
        .pbl { display: flex; flex-direction: column; gap: 8px; }
        .pbl-empty { padding: 24px; text-align: center; color: rgba(168,213,213,0.4); font-style: italic; }
        .pbl-row { display: flex; gap: 14px; align-items: flex-start; padding: 14px 16px; background: rgba(76,29,149,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 10px; }
        .pbl-main { flex: 1; min-width: 0; }
        .pbl-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .pbl-name { font-size: 15px; font-weight: 600; color: #e8f5f5; }
        .pbl-badge { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px; background: #4c1d95; color: #e9d5ff; text-transform: uppercase; }
        .pbl-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: rgba(168,213,213,0.65); }
        .pbl-meta strong { color: #e9d5ff; }
        .pbl-notes { margin-top: 6px; font-size: 12px; color: rgba(168,213,213,0.5); font-style: italic; }
        .pbl-del { padding: 8px 12px; background: transparent; border: 1px solid rgba(196,74,90,0.3); border-radius: 6px; color: rgba(255,180,192,0.8); font-size: 12px; cursor: pointer; align-self: center; }
        .pbl-del:hover:not(:disabled) { background: rgba(196,74,90,0.15); }
        .pbl-del:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}
