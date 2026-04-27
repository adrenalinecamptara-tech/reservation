"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HoldStatus, ReservationHold } from "@/lib/db/types";
import { getEffectiveHoldStatus } from "@/lib/utils/holdStatus";

type Filter = "all" | "active" | "expired" | "converted" | "cancelled";

const effectiveStatus = (h: ReservationHold): HoldStatus =>
  getEffectiveHoldStatus(h);

function fmt(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}.`;
}

export function HoldBookingList({
  holds,
  initialFilter = "all",
}: {
  holds: ReservationHold[];
  initialFilter?: Filter;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return holds;
    return holds.filter((h) => effectiveStatus(h) === filter);
  }, [holds, filter]);

  const setStatus = async (id: string, status: HoldStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/holds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Greška");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Greška");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Obrisati ovaj hold?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/holds/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Greška");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Greška");
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    all: holds.length,
    active: holds.filter((h) => effectiveStatus(h) === "active").length,
    expired: holds.filter((h) => effectiveStatus(h) === "expired").length,
    converted: holds.filter((h) => effectiveStatus(h) === "converted").length,
    cancelled: holds.filter((h) => effectiveStatus(h) === "cancelled").length,
  };

  return (
    <div className="hbl">
      <div className="hbl-filters">
        {(
          [
            ["all", "Svi"],
            ["active", "Aktivni"],
            ["expired", "Istekli"],
            ["converted", "Pretvoreni"],
            ["cancelled", "Otkazani"],
          ] as Array<[Filter, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            className={`hbl-filter ${filter === key ? "hbl-filter--active" : ""}`}
            onClick={() => setFilter(key)}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="hbl-empty">
          Nema hold rezervacija za izabrani filter.
        </div>
      ) : (
        visible.map((h) => {
          const st = effectiveStatus(h);
          const statusLabel =
            st === "active"
              ? "Hold aktivan"
              : st === "expired"
                ? "Hold istekao"
                : st === "converted"
                  ? "Pretvoreno"
                  : "Otkazan";
          const statusClass = `hbl-status hbl-status--${st}`;
          return (
            <div key={h.id} className="hbl-row">
              <div className="hbl-main">
                <div className="hbl-top">
                  <span className="hbl-name">
                    {h.first_name} {h.last_name}
                  </span>
                  <span className={statusClass}>{statusLabel}</span>
                </div>
                <div className="hbl-meta">
                  <span>Kontakt: {h.contact}</span>
                  <span>
                    📅 {fmt(h.arrival_date)} → {fmt(h.departure_date)}
                  </span>
                  {(() => {
                    const units = h.reservation_hold_units ?? [];
                    if (units.length > 0) {
                      return (
                        <span>
                          🏠{" "}
                          {units
                            .map(
                              (u) =>
                                `${u.cabin?.name ?? "-"} · ${u.floor === "ground" ? "Prizemlje" : "Sprat"} (${u.people_count})`,
                            )
                            .join(" + ")}
                        </span>
                      );
                    }
                    return (
                      <span>
                        🏠 {h.cabin?.name ?? "-"} ·{" "}
                        {h.floor === "ground" ? "Prizemlje" : "Sprat"}
                      </span>
                    );
                  })()}
                  <span>👥 {h.number_of_people}</span>
                  <span>⏰ Uplata do: {fmt(h.hold_until_date)}</span>
                </div>
                {h.notes && <div className="hbl-notes">{h.notes}</div>}
              </div>

              <div className="hbl-actions">
                {(st === "active" || st === "expired") && (
                  <button
                    disabled={busyId === h.id}
                    className="hbl-btn hbl-btn--ok"
                    onClick={() => setStatus(h.id, "converted")}
                  >
                    Pretvoreno
                  </button>
                )}
                {(st === "active" || st === "expired") && (
                  <button
                    disabled={busyId === h.id}
                    className="hbl-btn hbl-btn--muted"
                    onClick={() => setStatus(h.id, "cancelled")}
                  >
                    Otkaži
                  </button>
                )}
                {st === "cancelled" && (
                  <button
                    disabled={busyId === h.id}
                    className="hbl-btn hbl-btn--muted"
                    onClick={() => setStatus(h.id, "active")}
                  >
                    Vrati aktivno
                  </button>
                )}
                <button
                  disabled={busyId === h.id}
                  className="hbl-btn hbl-btn--danger"
                  onClick={() => onDelete(h.id)}
                >
                  Obriši
                </button>
              </div>
            </div>
          );
        })
      )}

      <style>{`
        .hbl { display: flex; flex-direction: column; gap: 10px; }
        .hbl-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
        .hbl-filter { padding: 7px 12px; border-radius: 999px; border: 1px solid rgba(62,140,140,0.2); background: rgba(10,25,25,0.8); color: rgba(168,213,213,0.8); font-size: 12px; cursor: pointer; }
        .hbl-filter--active { background: rgba(199,146,47,0.2); border-color: rgba(199,146,47,0.4); color: #ffe1a8; }

        .hbl-row { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 10px; }
        .hbl-main { flex: 1; min-width: 0; }
        .hbl-top { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .hbl-name { font-size: 15px; font-weight: 600; color: #e8f5f5; }
        .hbl-status { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
        .hbl-status--active { background: #5a3d14; color: #ffe1a8; }
        .hbl-status--expired { background: #7a2e1f; color: #ffd2c7; }
        .hbl-status--converted { background: #0f5132; color: #a7f3c4; }
        .hbl-status--cancelled { background: #4b5563; color: #d1d5db; }

        .hbl-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: rgba(168,213,213,0.65); }
        .hbl-notes { margin-top: 6px; font-size: 12px; color: rgba(168,213,213,0.5); font-style: italic; }

        .hbl-actions { display: flex; gap: 8px; flex-wrap: wrap; align-self: center; }
        .hbl-btn { padding: 7px 10px; border-radius: 6px; border: 1px solid; font-size: 12px; cursor: pointer; background: transparent; }
        .hbl-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .hbl-btn--ok { border-color: rgba(22,163,74,0.35); color: #a7f3c4; }
        .hbl-btn--ok:hover:not(:disabled) { background: rgba(22,163,74,0.12); }
        .hbl-btn--muted { border-color: rgba(156,163,175,0.35); color: #cbd5e1; }
        .hbl-btn--muted:hover:not(:disabled) { background: rgba(148,163,184,0.12); }
        .hbl-btn--danger { border-color: rgba(196,74,90,0.35); color: #ffb4c0; }
        .hbl-btn--danger:hover:not(:disabled) { background: rgba(196,74,90,0.12); }

        .hbl-empty { padding: 22px; text-align: center; color: rgba(168,213,213,0.45); font-style: italic; border: 1px dashed rgba(62,140,140,0.2); border-radius: 10px; }

        @media (max-width: 900px) {
          .hbl-row { flex-direction: column; }
          .hbl-actions { align-self: flex-start; }
        }
      `}</style>
    </div>
  );
}
