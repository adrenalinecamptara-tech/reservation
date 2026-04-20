"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Reservation, Cabin, Package } from "@/lib/db/types";
import { calcTotal, calcRemaining } from "@/lib/utils/pricing";

interface Props {
  reservation: Reservation;
  cabins: Cabin[];
}

interface AvailableUnit {
  cabin_id: string;
  cabin_name: string;
  floor: "ground" | "upper";
  available: boolean;
  conflict?: { id: string; first_name: string; last_name: string; arrival: string; departure: string };
}

function addDaysClient(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function deriveDepartureClient(arrival: string, departure: string | null, packageType: string | null): string {
  if (departure && departure > arrival) return departure;
  const pkg = (packageType ?? "").toLowerCase();
  const fourDay =
    pkg.includes("4") ||
    pkg.includes("balans") ||
    pkg.includes("adrenalin") ||
    pkg.includes("rafting plus") ||
    pkg.includes("cetiri") ||
    pkg.includes("četiri");
  return addDaysClient(arrival, fourDay ? 3 : 2);
}

export function ReservationActions({ reservation, cabins }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  // ── Cabin & notes ──────────────────────────────────────────
  const [adminNotes, setAdminNotes] = useState(reservation.admin_notes ?? "");
  const [availability, setAvailability] = useState<AvailableUnit[] | null>(null);

  interface UnitRow { cabin_id: string; floor: "ground" | "upper" | ""; people_count: number }
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/reservations/${reservation.id}/units`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Array<{ cabin_id: string; floor: "ground" | "upper"; people_count: number }>) => {
        if (Array.isArray(rows) && rows.length > 0) {
          setUnits(rows.map((r) => ({ cabin_id: r.cabin_id, floor: r.floor, people_count: r.people_count })));
        } else if (reservation.cabin_id && reservation.floor) {
          setUnits([{ cabin_id: reservation.cabin_id, floor: reservation.floor, people_count: reservation.number_of_people }]);
        } else {
          setUnits([{ cabin_id: "", floor: "", people_count: reservation.number_of_people }]);
        }
      })
      .catch(() => {
        setUnits([{ cabin_id: reservation.cabin_id ?? "", floor: reservation.floor ?? "", people_count: reservation.number_of_people }]);
      })
      .finally(() => setUnitsLoaded(true));
  }, [reservation.id, reservation.cabin_id, reservation.floor, reservation.number_of_people]);

  const effectiveDeparture = useMemo(
    () => deriveDepartureClient(reservation.arrival_date, reservation.departure_date, reservation.package_type),
    [reservation.arrival_date, reservation.departure_date, reservation.package_type]
  );

  useEffect(() => {
    const url = `/api/availability?arrival=${reservation.arrival_date}&departure=${effectiveDeparture}&exclude=${reservation.id}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAvailability)
      .catch(() => setAvailability([]));
  }, [reservation.id, reservation.arrival_date, effectiveDeparture]);

  const unitLookup = (cId: string, fl: "ground" | "upper") =>
    availability?.find((u) => u.cabin_id === cId && u.floor === fl);

  const cabinCapacity = (cId: string, fl: "ground" | "upper"): number => {
    const c = cabins.find((x) => x.id === cId);
    if (!c) return 0;
    return fl === "ground" ? c.ground_beds : c.upper_beds;
  };

  const isUnitUsedElsewhere = (idx: number, cId: string, fl: "ground" | "upper") =>
    units.some((u, i) => i !== idx && u.cabin_id === cId && u.floor === fl);

  const totalPeopleInUnits = units.reduce((s, u) => s + (u.people_count || 0), 0);
  const peopleRemaining = reservation.number_of_people - totalPeopleInUnits;

  const updateUnit = (idx: number, patch: Partial<UnitRow>) => {
    setUnits((prev) => prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)));
  };
  const addUnit = () => {
    const defaultPeople = Math.max(1, peopleRemaining);
    setUnits((prev) => [...prev, { cabin_id: "", floor: "", people_count: defaultPeople }]);
  };
  const removeUnit = (idx: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== idx));
  };

  const availabilitySummary = useMemo(() => {
    if (!availability) return "";
    const free = availability.filter((u) => u.available);
    if (free.length === 0) return "Sve jedinice zauzete za ovaj datum.";
    const byCabin = new Map<string, string[]>();
    for (const u of free) {
      const list = byCabin.get(u.cabin_name) ?? [];
      list.push(u.floor === "ground" ? "Prizemlje" : "Sprat");
      byCabin.set(u.cabin_name, list);
    }
    return Array.from(byCabin.entries())
      .map(([n, fs]) => `${n} (${fs.join(", ")})`)
      .join(" · ");
  }, [availability]);

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
    for (const u of units) {
      if (!u.cabin_id || !u.floor) { alert("Sve sobe moraju imati izabran bungalov i sprat."); return; }
      if (!u.people_count || u.people_count < 1) { alert("Svaka soba mora imati bar 1 osobu."); return; }
      const cap = cabinCapacity(u.cabin_id, u.floor);
      if (u.people_count > cap) { alert(`Izabrana soba prima max ${cap} osoba.`); return; }
    }
    if (totalPeopleInUnits !== reservation.number_of_people) {
      alert(`Zbir osoba (${totalPeopleInUnits}) mora biti jednak broju gostiju (${reservation.number_of_people}).`);
      return;
    }
    const keys = new Set<string>();
    for (const u of units) {
      const k = `${u.cabin_id}:${u.floor}`;
      if (keys.has(k)) { alert("Ista soba je izabrana više puta."); return; }
      keys.add(k);
    }
    setLoading("cabin");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/units`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          units: units.map((u) => ({ cabin_id: u.cabin_id, floor: u.floor, people_count: u.people_count })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Greška pri čuvanju smeštaja");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Greška pri čuvanju smeštaja");
    } finally {
      setLoading(null);
    }
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

  const canResend = reservation.status === "approved" || reservation.status === "modified" || reservation.status === "paid";

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

      {/* ── Cabin assignment (multi-unit) ── */}
      <section className="adm-card">
        <h2 className="adm-card-title">Smeštaj</h2>
        <div className="adm-units-hdr">
          <span>Ukupno gostiju: <strong>{reservation.number_of_people}</strong></span>
          <span>
            Raspoređeno: <strong style={{ color: totalPeopleInUnits === reservation.number_of_people ? "#a7e8c5" : "#ffd89a" }}>
              {totalPeopleInUnits}
            </strong>
            {peopleRemaining > 0 && ` · još ${peopleRemaining} bez sobe`}
            {peopleRemaining < 0 && ` · ${Math.abs(peopleRemaining)} previše`}
          </span>
        </div>

        {unitsLoaded && units.map((u, idx) => {
          const cap = u.cabin_id && u.floor ? cabinCapacity(u.cabin_id, u.floor as "ground" | "upper") : 0;
          const conflict = u.cabin_id && u.floor
            ? unitLookup(u.cabin_id, u.floor as "ground" | "upper")
            : null;
          const blockedByOther = conflict && !conflict.available;
          const duplicated = u.cabin_id && u.floor && isUnitUsedElsewhere(idx, u.cabin_id, u.floor as "ground" | "upper");
          return (
            <div key={idx} className="adm-unit-row">
              <div className="adm-unit-idx">Soba {idx + 1}</div>
              <div className="adm-unit-fields">
                <select
                  className="adm-input"
                  value={u.cabin_id}
                  onChange={(e) => updateUnit(idx, { cabin_id: e.target.value, floor: "" })}
                >
                  <option value="">Bungalov</option>
                  {cabins.map((c) => {
                    const g = unitLookup(c.id, "ground");
                    const up = unitLookup(c.id, "upper");
                    const bothTaken = availability !== null && g && up && !g.available && !up.available;
                    const gUsedHere = units.some((x, i) => i !== idx && x.cabin_id === c.id && x.floor === "ground");
                    const upUsedHere = units.some((x, i) => i !== idx && x.cabin_id === c.id && x.floor === "upper");
                    const disabled = !!bothTaken || (gUsedHere && upUsedHere);
                    const suffix = availability === null
                      ? ""
                      : bothTaken || (gUsedHere && upUsedHere)
                        ? " — zauzet"
                        : (g && !g.available) || (up && !up.available) || gUsedHere || upUsedHere
                          ? " — delimično"
                          : " — slobodno";
                    return (
                      <option key={c.id} value={c.id} disabled={disabled}>
                        {c.name}{suffix}
                      </option>
                    );
                  })}
                </select>
                <select
                  className="adm-input"
                  value={u.floor}
                  onChange={(e) => updateUnit(idx, { floor: e.target.value as "ground" | "upper" })}
                  disabled={!u.cabin_id}
                >
                  <option value="">Sprat</option>
                  {u.cabin_id && (() => {
                    const g = unitLookup(u.cabin_id, "ground");
                    const up = unitLookup(u.cabin_id, "upper");
                    const gBusyElsewhere = units.some((x, i) => i !== idx && x.cabin_id === u.cabin_id && x.floor === "ground");
                    const upBusyElsewhere = units.some((x, i) => i !== idx && x.cabin_id === u.cabin_id && x.floor === "upper");
                    const gBusy = (availability !== null && g && !g.available) || gBusyElsewhere;
                    const upBusy = (availability !== null && up && !up.available) || upBusyElsewhere;
                    const gLabel = gBusy
                      ? ` — ${gBusyElsewhere ? "već izabrano" : g?.conflict ? `${g.conflict.first_name} ${g.conflict.last_name}` : "zauzeto"}`
                      : "";
                    const upLabel = upBusy
                      ? ` — ${upBusyElsewhere ? "već izabrano" : up?.conflict ? `${up.conflict.first_name} ${up.conflict.last_name}` : "zauzeto"}`
                      : "";
                    return (
                      <>
                        <option value="ground" disabled={gBusy}>
                          Prizemlje ({cabinCapacity(u.cabin_id, "ground")} mesta){gLabel}
                        </option>
                        <option value="upper" disabled={upBusy}>
                          Sprat ({cabinCapacity(u.cabin_id, "upper")} mesta){upLabel}
                        </option>
                      </>
                    );
                  })()}
                </select>
                <input
                  className="adm-input adm-unit-people"
                  type="number"
                  min={1}
                  max={cap || undefined}
                  value={u.people_count}
                  onChange={(e) => updateUnit(idx, { people_count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  placeholder="Ljudi"
                />
                {units.length > 1 && (
                  <button type="button" className="adm-unit-remove" onClick={() => removeUnit(idx)} title="Ukloni sobu">
                    ✕
                  </button>
                )}
              </div>
              {(blockedByOther || duplicated || (cap > 0 && u.people_count > cap)) && (
                <div className="adm-unit-warn">
                  {duplicated && "Ista soba već izabrana u drugom redu. "}
                  {blockedByOther && conflict?.conflict && `Zauzeto: ${conflict.conflict.first_name} ${conflict.conflict.last_name}. `}
                  {cap > 0 && u.people_count > cap && `Max ${cap} mesta u ovoj sobi. `}
                </div>
              )}
            </div>
          );
        })}

        {peopleRemaining > 0 && (
          <button type="button" className="adm-btn adm-btn--secondary adm-unit-add" onClick={addUnit}>
            + Dodaj još jednu sobu (još {peopleRemaining})
          </button>
        )}

        {availability && (
          <div className="adm-cabin-hint">
            {availabilitySummary
              ? `Dostupno ${reservation.arrival_date} → ${effectiveDeparture}: ${availabilitySummary}`
              : "Učitavanje dostupnosti..."}
          </div>
        )}
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
        .adm-cabin-hint { font-size: 11px; color: rgba(168,213,213,0.55); margin-top: 8px; line-height: 1.5; }
        .adm-units-hdr { display: flex; justify-content: space-between; gap: 10px; font-size: 12px; color: rgba(168,213,213,0.65); margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(62,140,140,0.12); flex-wrap: wrap; }
        .adm-unit-row { padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(62,140,140,0.12); border-radius: 8px; margin-bottom: 8px; }
        .adm-unit-idx { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(168,213,213,0.5); margin-bottom: 6px; }
        .adm-unit-fields { display: grid; grid-template-columns: 1fr 1fr 80px auto; gap: 6px; align-items: center; }
        .adm-unit-people { text-align: center; }
        .adm-unit-remove { background: rgba(196,30,58,0.15); color: #e87a8a; border: 1px solid rgba(196,30,58,0.3); border-radius: 6px; width: 32px; height: 36px; cursor: pointer; font-size: 14px; }
        .adm-unit-remove:hover { background: rgba(196,30,58,0.25); }
        .adm-unit-warn { margin-top: 6px; font-size: 11px; color: #ffb4c0; }
        .adm-unit-add { margin-bottom: 8px; }
        @media (max-width: 600px) { .adm-unit-fields { grid-template-columns: 1fr 1fr; } .adm-unit-fields .adm-unit-people { grid-column: 1 / 2; } .adm-unit-remove { grid-column: 2 / 3; width: 100%; } }
        .adm-input { width: 100%; padding: 9px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-family: 'DM Sans', sans-serif; font-size: 13px; outline: none; }
        .adm-input:focus { border-color: rgba(58,144,144,0.5); }
        .adm-input option { background: #0f2020; }
        .adm-textarea { resize: vertical; min-height: 70px; }
      `}</style>
    </>
  );
}
