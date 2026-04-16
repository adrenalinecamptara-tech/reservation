"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Reservation, Cabin } from "@/lib/db/types";

interface Props {
  reservation: Reservation;
  cabins: Cabin[];
}

export function ReservationActions({ reservation, cabins }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState(reservation.admin_notes ?? "");
  const [cabinId, setCabinId] = useState(reservation.cabin_id ?? "");
  const [floor, setFloor] = useState<"ground" | "upper" | "">(reservation.floor ?? "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelForm, setShowCancelForm] = useState(false);

  const handleApprove = async () => {
    if (!confirm("Odobriti rezervaciju i poslati vaučer gostu?")) return;
    setLoading("approve");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err: any) {
      alert(err.message ?? "Greška pri odobravanju");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    setLoading("notes");
    await fetch(`/api/reservations/${reservation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin_notes: adminNotes }),
    });
    setLoading(null);
    router.refresh();
  };

  const handleAssignCabin = async () => {
    if (!cabinId || !floor) { alert("Odaberi bungalov i sprat"); return; }
    setLoading("cabin");
    await fetch(`/api/reservations/${reservation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cabin_id: cabinId, floor }),
    });
    setLoading(null);
    router.refresh();
  };

  const handleCancel = async () => {
    setLoading("cancel");
    await fetch(`/api/reservations/${reservation.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    setLoading(null);
    router.refresh();
  };

  const handleDownloadVoucher = () => {
    window.open(`/api/voucher/${reservation.id}`, "_blank");
  };

  return (
    <>
      {/* Primary action */}
      {reservation.status === "pending" && (
        <section className="adm-card adm-card--highlight">
          <h2 className="adm-card-title">Akcija</h2>
          <p className="adm-action-desc">
            Pregledi podatke i uplatu, pa odobri rezervaciju. Gost će automatski
            dobiti vaučer na email.
          </p>
          <button
            className="adm-btn adm-btn--approve"
            onClick={handleApprove}
            disabled={loading === "approve"}
          >
            {loading === "approve" ? "Odobravam..." : "✓ Odobri i pošalji vaučer"}
          </button>
        </section>
      )}

      {/* Voucher download */}
      {reservation.status === "approved" && (
        <section className="adm-card">
          <h2 className="adm-card-title">Vaučer</h2>
          <p className="adm-action-desc">
            {reservation.voucher_sent_at
              ? `Vaučer poslat gostu.`
              : "Vaučer nije još poslat."}
          </p>
          <button className="adm-btn adm-btn--secondary" onClick={handleDownloadVoucher}>
            ↓ Preuzmi vaučer PDF
          </button>
        </section>
      )}

      {/* Cabin assignment */}
      <section className="adm-card">
        <h2 className="adm-card-title">Smeštaj</h2>
        <div className="adm-cabin-row">
          <select
            className="adm-input"
            value={cabinId}
            onChange={(e) => setCabinId(e.target.value)}
          >
            <option value="">Odaberi bungalov</option>
            {cabins.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="adm-input"
            value={floor}
            onChange={(e) => setFloor(e.target.value as "ground" | "upper")}
          >
            <option value="">Sprat</option>
            <option value="ground">Prizemlje (6 mesta)</option>
            <option value="upper">Sprat (4 mesta)</option>
          </select>
        </div>
        <button
          className="adm-btn adm-btn--secondary"
          onClick={handleAssignCabin}
          disabled={loading === "cabin"}
          style={{ marginTop: "10px" }}
        >
          {loading === "cabin" ? "Čuvam..." : "Sačuvaj smeštaj"}
        </button>
      </section>

      {/* Admin notes */}
      <section className="adm-card">
        <h2 className="adm-card-title">Beleška (interna)</h2>
        <textarea
          className="adm-input adm-textarea"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Napomene za interni tim..."
          rows={3}
        />
        <button
          className="adm-btn adm-btn--secondary"
          onClick={handleSaveNotes}
          disabled={loading === "notes"}
          style={{ marginTop: "8px" }}
        >
          {loading === "notes" ? "Čuvam..." : "Sačuvaj belešku"}
        </button>
      </section>

      {/* Cancel */}
      {reservation.status !== "cancelled" && (
        <section className="adm-card adm-card--danger">
          <h2 className="adm-card-title">Otkazivanje</h2>
          {!showCancelForm ? (
            <button
              className="adm-btn adm-btn--danger"
              onClick={() => setShowCancelForm(true)}
            >
              Otkaži rezervaciju
            </button>
          ) : (
            <>
              <textarea
                className="adm-input adm-textarea"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Razlog otkazivanja (opciono)"
                rows={2}
                style={{ marginBottom: "8px" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="adm-btn adm-btn--danger"
                  onClick={handleCancel}
                  disabled={loading === "cancel"}
                >
                  {loading === "cancel" ? "Otkazujem..." : "Potvrdi otkazivanje"}
                </button>
                <button
                  className="adm-btn adm-btn--secondary"
                  onClick={() => setShowCancelForm(false)}
                >
                  Odustani
                </button>
              </div>
            </>
          )}
        </section>
      )}

      <style>{`
        .adm-card { background: rgba(10,25,25,0.85); border: 1px solid rgba(62,140,140,0.15); border-radius: 12px; padding: 20px; }
        .adm-card--highlight { border-color: rgba(58,170,112,0.3); background: rgba(58,170,112,0.05); }
        .adm-card--danger { border-color: rgba(196,30,58,0.2); background: rgba(196,30,58,0.03); }
        .adm-card-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(168,213,213,0.4); margin-bottom: 12px; }
        .adm-action-desc { font-size: 13px; color: rgba(168,213,213,0.5); margin-bottom: 14px; line-height: 1.5; }

        .adm-btn { padding: 10px 18px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; width: 100%; }
        .adm-btn--approve { background: linear-gradient(135deg, #1a5c3c, #2a8060); color: #e8f5f5; box-shadow: 0 4px 12px rgba(42,128,96,0.3); }
        .adm-btn--approve:hover:not(:disabled) { background: linear-gradient(135deg, #206848, #339070); }
        .adm-btn--secondary { background: rgba(255,255,255,0.05); color: rgba(168,213,213,0.7); border: 1px solid rgba(62,140,140,0.2); }
        .adm-btn--secondary:hover { background: rgba(255,255,255,0.08); }
        .adm-btn--danger { background: rgba(196,30,58,0.15); color: #e87a8a; border: 1px solid rgba(196,30,58,0.3); }
        .adm-btn--danger:hover:not(:disabled) { background: rgba(196,30,58,0.25); }
        .adm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .adm-cabin-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .adm-input { width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; }
        .adm-input:focus { border-color: rgba(58,144,144,0.5); }
        .adm-input option { background: #0f2020; }
        .adm-textarea { resize: vertical; min-height: 70px; }
      `}</style>
    </>
  );
}
