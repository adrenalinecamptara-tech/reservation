"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Reservation, Cabin, Package } from "@/lib/db/types";
import { calcTotal, calcRemaining } from "@/lib/utils/pricing";

interface Props {
  reservation: Reservation;
  cabins: Cabin[];
}

export function ReservationActions({ reservation, cabins }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // ── Cabin & notes ──────────────────────────────────────────
  const [adminNotes, setAdminNotes] = useState(reservation.admin_notes ?? "");
  const [cabinId, setCabinId] = useState(reservation.cabin_id ?? "");
  const [floor, setFloor] = useState<"ground" | "upper" | "">(reservation.floor ?? "");

  // ── Packages ───────────────────────────────────────────────
  const [packages, setPackages] = useState<Package[]>([]);
  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then(setPackages)
      .catch(() => {});
  }, []);

  // ── Edit form ──────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [edit, setEdit] = useState({
    first_name: reservation.first_name,
    last_name: reservation.last_name,
    email: reservation.email,
    phone: reservation.phone,
    id_card_number: reservation.id_card_number,
    number_of_people: String(reservation.number_of_people),
    arrival_date: reservation.arrival_date,
    departure_date: reservation.departure_date ?? "",
    package_id: reservation.package_id ?? "",
    package_type: reservation.package_type ?? "",
    deposit_amount: String(reservation.deposit_amount),
    total_amount: reservation.total_amount != null ? String(reservation.total_amount) : "",
    remaining_amount: reservation.remaining_amount != null ? String(reservation.remaining_amount) : "",
    currency: reservation.currency,
  });

  // Recalculate total & remaining when package/people/date/deposit change in edit form
  const recalcPrices = (nextEdit: typeof edit) => {
    const pkg = packages.find((p) => p.id === nextEdit.package_id);
    if (!pkg || !nextEdit.arrival_date || !nextEdit.number_of_people) return nextEdit;

    const people = parseInt(nextEdit.number_of_people, 10);
    if (isNaN(people) || people < 1) return nextEdit;

    const total = calcTotal(pkg, people, nextEdit.arrival_date);
    const deposit = parseFloat(nextEdit.deposit_amount) || 0;
    const remaining = calcRemaining(total, deposit);

    return { ...nextEdit, total_amount: String(total), remaining_amount: String(remaining) };
  };

  const setEditField = (key: keyof typeof edit, value: string) => {
    const next = { ...edit, [key]: value };
    const calcKeys = ["package_id", "number_of_people", "arrival_date", "deposit_amount"] as const;
    const shouldRecalc = calcKeys.includes(key as (typeof calcKeys)[number]);
    setEdit(shouldRecalc ? recalcPrices(next) : next);
  };

  // ── Cancel ─────────────────────────────────────────────────
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const patch = (body: Record<string, unknown>) =>
    fetch(`/api/reservations/${reservation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const handleApprove = async () => {
    if (!confirm("Odobriti rezervaciju i poslati vaučer gostu?")) return;
    setLoading("approve");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Greška pri odobravanju");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveEdit = async () => {
    setLoading("edit");
    try {
      const payload: Record<string, unknown> = {
        first_name: edit.first_name.trim(),
        last_name: edit.last_name.trim(),
        email: edit.email.trim(),
        phone: edit.phone.trim(),
        id_card_number: edit.id_card_number.trim(),
        number_of_people: parseInt(edit.number_of_people, 10),
        arrival_date: edit.arrival_date,
        departure_date: edit.departure_date || null,
        package_id: edit.package_id || null,
        package_type: edit.package_type || null,
        deposit_amount: parseFloat(edit.deposit_amount),
        total_amount: edit.total_amount ? parseFloat(edit.total_amount) : null,
        remaining_amount: edit.remaining_amount ? parseFloat(edit.remaining_amount) : null,
        currency: edit.currency,
      };
      const res = await patch(payload);
      if (!res.ok) throw new Error((await res.json()).error);
      setShowEdit(false);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Greška pri čuvanju");
    } finally {
      setLoading(null);
    }
  };

  const handleResend = async () => {
    if (!confirm("Poslati ažurirani vaučer gostu na email?")) return;
    setLoading("resend");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/resend`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Greška pri slanju");
    } finally {
      setLoading(null);
    }
  };

  const handleSaveNotes = async () => {
    setLoading("notes");
    await patch({ admin_notes: adminNotes });
    setLoading(null);
    router.refresh();
  };

  const handleAssignCabin = async () => {
    if (!cabinId || !floor) { alert("Odaberi bungalov i sprat"); return; }
    setLoading("cabin");
    await patch({ cabin_id: cabinId, floor });
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

  const canResend = reservation.status === "approved" || reservation.status === "modified";

  return (
    <>
      {/* ── Approve (pending only) ── */}
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

      {/* ── Edit reservation data ── */}
      {reservation.status !== "cancelled" && (
        <section className="adm-card">
          <div className="adm-card-header">
            <h2 className="adm-card-title">Izmijeni podatke</h2>
            <button
              className="adm-toggle"
              onClick={() => setShowEdit((v) => !v)}
            >
              {showEdit ? "Zatvori" : "Uredi"}
            </button>
          </div>

          {showEdit && (
            <div className="adm-edit-form">
              <div className="adm-edit-section-label">Lični podaci</div>
              <div className="adm-edit-row">
                <div className="adm-edit-field">
                  <label>Ime</label>
                  <input className="adm-input" value={edit.first_name}
                    onChange={(e) => setEditField("first_name", e.target.value)} />
                </div>
                <div className="adm-edit-field">
                  <label>Prezime</label>
                  <input className="adm-input" value={edit.last_name}
                    onChange={(e) => setEditField("last_name", e.target.value)} />
                </div>
              </div>
              <div className="adm-edit-field">
                <label>Email</label>
                <input className="adm-input" type="email" value={edit.email}
                  onChange={(e) => setEditField("email", e.target.value)} />
              </div>
              <div className="adm-edit-row">
                <div className="adm-edit-field">
                  <label>Telefon</label>
                  <input className="adm-input" value={edit.phone}
                    onChange={(e) => setEditField("phone", e.target.value)} />
                </div>
                <div className="adm-edit-field">
                  <label>Br. lične karte / JMBG</label>
                  <input className="adm-input" value={edit.id_card_number}
                    onChange={(e) => setEditField("id_card_number", e.target.value)} />
                </div>
              </div>

              <div className="adm-edit-section-label">Rezervacija</div>
              <div className="adm-edit-row">
                <div className="adm-edit-field">
                  <label>Datum dolaska</label>
                  <input className="adm-input" type="date" value={edit.arrival_date}
                    onChange={(e) => setEditField("arrival_date", e.target.value)} />
                </div>
                <div className="adm-edit-field">
                  <label>Datum odlaska</label>
                  <input className="adm-input" type="date" value={edit.departure_date}
                    onChange={(e) => setEditField("departure_date", e.target.value)} />
                </div>
              </div>
              <div className="adm-edit-row">
                <div className="adm-edit-field">
                  <label>Broj osoba</label>
                  <input className="adm-input" type="number" min="1" value={edit.number_of_people}
                    onChange={(e) => setEditField("number_of_people", e.target.value)} />
                </div>
                <div className="adm-edit-field">
                  <label>Paket</label>
                  <select className="adm-input" value={edit.package_id}
                    onChange={(e) => {
                      const pkg = packages.find((p) => p.id === e.target.value);
                      const next = { ...edit, package_id: e.target.value, package_type: pkg?.name ?? "" };
                      setEdit(recalcPrices(next));
                    }}>
                    <option value="">— bez paketa —</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="adm-edit-section-label">Finansije</div>
              <div className="adm-edit-row">
                <div className="adm-edit-field">
                  <label>Depozit plaćen</label>
                  <input className="adm-input" type="number" step="0.01" value={edit.deposit_amount}
                    onChange={(e) => setEditField("deposit_amount", e.target.value)} />
                </div>
                <div className="adm-edit-field">
                  <label>Valuta</label>
                  <select className="adm-input" value={edit.currency}
                    onChange={(e) => setEditField("currency", e.target.value)}>
                    <option>EUR</option>
                    <option>BAM</option>
                    <option>RSD</option>
                  </select>
                </div>
              </div>
              <div className="adm-edit-row">
                <div className="adm-edit-field">
                  <label>Ukupno {edit.package_id ? "(auto)" : ""}</label>
                  <input className="adm-input" type="number" step="0.01" value={edit.total_amount}
                    readOnly={!!edit.package_id}
                    style={edit.package_id ? { opacity: 0.6 } : {}}
                    onChange={(e) => setEditField("total_amount", e.target.value)} />
                </div>
                <div className="adm-edit-field">
                  <label>Ostatak za platiti {edit.package_id ? "(auto)" : ""}</label>
                  <input className="adm-input" type="number" step="0.01" value={edit.remaining_amount}
                    readOnly={!!edit.package_id}
                    style={edit.package_id ? { opacity: 0.6 } : {}}
                    onChange={(e) => setEditField("remaining_amount", e.target.value)} />
                </div>
              </div>

              <button
                className="adm-btn adm-btn--approve"
                onClick={handleSaveEdit}
                disabled={loading === "edit"}
                style={{ marginTop: 14 }}
              >
                {loading === "edit" ? "Čuvam..." : "Sačuvaj izmjene"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Resend updated voucher (approved / modified) ── */}
      {canResend && (
        <section className="adm-card adm-card--update">
          <h2 className="adm-card-title">Ažurirani vaučer</h2>
          <p className="adm-action-desc">
            Pošalji gostu novi PDF vaučer sa trenutnim podacima (koristiti nakon izmjena).
          </p>
          <button
            className="adm-btn adm-btn--update"
            onClick={handleResend}
            disabled={loading === "resend"}
          >
            {loading === "resend" ? "Šaljem..." : "↻ Pošalji ažurirani vaučer"}
          </button>
          <button
            className="adm-btn adm-btn--secondary"
            onClick={() => window.open(`/api/voucher/${reservation.id}`, "_blank")}
            style={{ marginTop: 8 }}
          >
            ↓ Preuzmi vaučer PDF
          </button>
        </section>
      )}

      {/* ── Voucher download for approved (no resend needed yet) ── */}
      {reservation.status === "approved" && !canResend && (
        <section className="adm-card">
          <h2 className="adm-card-title">Vaučer</h2>
          <button className="adm-btn adm-btn--secondary"
            onClick={() => window.open(`/api/voucher/${reservation.id}`, "_blank")}>
            ↓ Preuzmi vaučer PDF
          </button>
        </section>
      )}

      {/* ── Cabin assignment ── */}
      <section className="adm-card">
        <h2 className="adm-card-title">Smeštaj</h2>
        <div className="adm-cabin-row">
          <select className="adm-input" value={cabinId}
            onChange={(e) => setCabinId(e.target.value)}>
            <option value="">Odaberi bungalov</option>
            {cabins.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="adm-input" value={floor}
            onChange={(e) => setFloor(e.target.value as "ground" | "upper")}>
            <option value="">Sprat</option>
            <option value="ground">Prizemlje (6 mesta)</option>
            <option value="upper">Sprat (4 mesta)</option>
          </select>
        </div>
        <button
          className="adm-btn adm-btn--secondary"
          onClick={handleAssignCabin}
          disabled={loading === "cabin"}
          style={{ marginTop: 10 }}
        >
          {loading === "cabin" ? "Čuvam..." : "Sačuvaj smeštaj"}
        </button>
      </section>

      {/* ── Admin notes ── */}
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
          style={{ marginTop: 8 }}
        >
          {loading === "notes" ? "Čuvam..." : "Sačuvaj belešku"}
        </button>
      </section>

      {/* ── Cancel ── */}
      {reservation.status !== "cancelled" && (
        <section className="adm-card adm-card--danger">
          <h2 className="adm-card-title">Otkazivanje</h2>
          {!showCancelForm ? (
            <button className="adm-btn adm-btn--danger" onClick={() => setShowCancelForm(true)}>
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
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="adm-btn adm-btn--danger" onClick={handleCancel}
                  disabled={loading === "cancel"}>
                  {loading === "cancel" ? "Otkazujem..." : "Potvrdi otkazivanje"}
                </button>
                <button className="adm-btn adm-btn--secondary"
                  onClick={() => setShowCancelForm(false)}>
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
        .adm-card--update { border-color: rgba(58,120,200,0.3); background: rgba(58,120,200,0.04); }
        .adm-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .adm-card-title { font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(168,213,213,0.4); }
        .adm-toggle { font-size: 12px; font-weight: 600; color: rgba(168,213,213,0.5); background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
        .adm-toggle:hover { color: rgba(168,213,213,0.8); }
        .adm-action-desc { font-size: 13px; color: rgba(168,213,213,0.5); margin-bottom: 14px; line-height: 1.5; }

        .adm-edit-form { margin-top: 4px; display: flex; flex-direction: column; gap: 0; }
        .adm-edit-section-label { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(168,213,213,0.3); margin: 14px 0 8px; border-top: 1px solid rgba(62,140,140,0.1); padding-top: 14px; }
        .adm-edit-section-label:first-child { margin-top: 0; border-top: none; padding-top: 0; }
        .adm-edit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .adm-edit-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
        .adm-edit-field label { font-size: 11px; color: rgba(168,213,213,0.4); font-weight: 500; }

        .adm-btn { padding: 10px 18px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; width: 100%; }
        .adm-btn--approve { background: linear-gradient(135deg, #1a5c3c, #2a8060); color: #e8f5f5; box-shadow: 0 4px 12px rgba(42,128,96,0.3); }
        .adm-btn--approve:hover:not(:disabled) { background: linear-gradient(135deg, #206848, #339070); }
        .adm-btn--update { background: linear-gradient(135deg, #1a3c6c, #2a5898); color: #e8f5f5; box-shadow: 0 4px 12px rgba(42,88,152,0.3); }
        .adm-btn--update:hover:not(:disabled) { background: linear-gradient(135deg, #1e4880, #3068b0); }
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
