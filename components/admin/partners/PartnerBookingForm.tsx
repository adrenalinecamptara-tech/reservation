"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Partner, Cabin, Floor } from "@/lib/db/types";
import {
  cabinStatusSuffix,
  useUnitAvailability,
} from "@/lib/hooks/useUnitAvailability";

function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Props {
  partners: Partner[];
  cabins: Cabin[];
  packages: Array<{ id: string; name: string; status: string }>;
}

export function PartnerBookingForm({ partners, cabins, packages }: Props) {
  const router = useRouter();

  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const [arrivalDate, setArrivalDate] = useState("");
  const [nights, setNights] = useState(2);
  const [cabinId, setCabinId] = useState(cabins[0]?.id ?? "");
  const [floor, setFloor] = useState<Floor>("ground");
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [pricePerPerson, setPricePerPerson] = useState(
    partners[0]?.default_price_per_person ?? 25
  );
  const [packageId, setPackageId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerPrice, setNewPartnerPrice] = useState(25);

  const total = useMemo(
    () => pricePerPerson * numberOfPeople * nights,
    [pricePerPerson, numberOfPeople, nights],
  );

  const departure = arrivalDate && nights >= 1 ? addDaysISO(arrivalDate, nights) : "";
  const {
    cabinAvail,
    checking: checkingAvail,
    loaded: availabilityLoaded,
  } = useUnitAvailability({ arrival: arrivalDate, departure });

  const selectedUnit = cabinAvail[cabinId]?.[floor];
  const selectedBlocked =
    availabilityLoaded && selectedUnit && !selectedUnit.available;
  const conflictLabel = selectedUnit?.conflict
    ? `${selectedUnit.conflict.first_name} ${selectedUnit.conflict.last_name}`.trim()
    : null;

  // When partner changes, update default price
  const onPartnerChange = (id: string) => {
    setPartnerId(id);
    const p = partners.find((pp) => pp.id === id);
    if (p) setPricePerPerson(Number(p.default_price_per_person));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!partnerId || !cabinId || !arrivalDate || nights < 1 || numberOfPeople < 1) {
      setError("Popuni sva polja.");
      return;
    }
    if (selectedBlocked) {
      setError(`Ova jedinica je zauzeta${conflictLabel ? ` (${conflictLabel})` : ""}. Izaberi drugu.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/partners/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_id: partnerId,
          cabin_id: cabinId,
          floor,
          arrival_date: arrivalDate,
          nights,
          number_of_people: numberOfPeople,
          price_per_person: pricePerPerson,
          package_id: packageId || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setArrivalDate("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setLoading(false);
    }
  };

  const addPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPartnerName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPartnerName.trim(),
          default_price_per_person: newPartnerPrice,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");
      setNewPartnerName("");
      setShowAddPartner(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pbf">
      <form onSubmit={onSubmit} className="pbf-form">
        <div className="pbf-row">
          <label className="pbf-label">
            <span>Partner</span>
            <div className="pbf-inline">
              <select
                value={partnerId}
                onChange={(e) => onPartnerChange(e.target.value)}
                className="pbf-input"
                disabled={partners.length === 0}
              >
                {partners.length === 0 && <option value="">Nema partnera</option>}
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({Number(p.default_price_per_person)} €/os)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddPartner((s) => !s)}
                className="pbf-btn-ghost"
              >
                {showAddPartner ? "Zatvori" : "+ Novi"}
              </button>
            </div>
          </label>
        </div>

        {showAddPartner && (
          <div className="pbf-addpartner">
            <input
              type="text"
              placeholder="Ime partnera"
              value={newPartnerName}
              onChange={(e) => setNewPartnerName(e.target.value)}
              className="pbf-input"
            />
            <input
              type="number"
              min={0}
              step={1}
              placeholder="Cena/os €"
              value={newPartnerPrice}
              onChange={(e) => setNewPartnerPrice(Number(e.target.value))}
              className="pbf-input pbf-input-sm"
            />
            <button type="button" onClick={addPartner} disabled={loading} className="pbf-btn">
              Sačuvaj partnera
            </button>
          </div>
        )}

        <div className="pbf-grid">
          <label className="pbf-label">
            <span>Datum dolaska</span>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="pbf-input"
            />
          </label>
          <label className="pbf-label">
            <span>Datum odlaska</span>
            <input
              type="date"
              value={departure}
              min={arrivalDate ? addDaysISO(arrivalDate, 1) : undefined}
              onChange={(e) => {
                if (!arrivalDate || !e.target.value) return;
                const a = new Date(arrivalDate + "T00:00:00Z").getTime();
                const d = new Date(e.target.value + "T00:00:00Z").getTime();
                const diff = Math.round((d - a) / 86400000);
                if (diff >= 1) setNights(diff);
              }}
              className="pbf-input"
              disabled={!arrivalDate}
            />
          </label>
          <label className="pbf-label">
            <span>Bungalov</span>
            <select value={cabinId} onChange={(e) => setCabinId(e.target.value)} className="pbf-input">
              {cabins.map((c) => {
                const { suffix, bothBusy } = cabinStatusSuffix(
                  c.id,
                  cabinAvail,
                  availabilityLoaded,
                );
                return (
                  <option key={c.id} value={c.id} disabled={bothBusy}>
                    {c.name}{suffix}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="pbf-label">
            <span>Sprat</span>
            <select
              value={floor}
              onChange={(e) => setFloor(e.target.value as Floor)}
              className="pbf-input"
            >
              <option
                value="ground"
                disabled={availabilityLoaded && cabinAvail[cabinId]?.ground?.available === false}
              >
                Prizemlje{cabinAvail[cabinId]?.ground && !cabinAvail[cabinId].ground!.available ? " — zauzeto" : ""}
              </option>
              <option
                value="upper"
                disabled={availabilityLoaded && cabinAvail[cabinId]?.upper?.available === false}
              >
                Sprat{cabinAvail[cabinId]?.upper && !cabinAvail[cabinId].upper!.available ? " — zauzeto" : ""}
              </option>
            </select>
          </label>
          <label className="pbf-label">
            <span>Broj ljudi</span>
            <input
              type="number"
              min={1}
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(Number(e.target.value))}
              className="pbf-input"
            />
          </label>
          <label className="pbf-label">
            <span>Cena / osoba (€)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={pricePerPerson}
              onChange={(e) => setPricePerPerson(Number(e.target.value))}
              className="pbf-input"
            />
          </label>
        </div>

        <label className="pbf-label">
          <span>Paket (opciono — ako jedu / koriste aktivnosti)</span>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="pbf-input"
          >
            <option value="">Bez paketa — samo spavanje</option>
            {packages
              .filter((p) => p.status === "active")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>

        <label className="pbf-label">
          <span>Napomena (opciono)</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="pbf-input"
          />
        </label>

        <div className="pbf-total">
          Ukupno: <strong>{total.toFixed(0)} €</strong> ({numberOfPeople} × {pricePerPerson} € × {nights} {nights === 1 ? "noć" : "noći"})
        </div>

        {arrivalDate && (
          <div className={selectedBlocked ? "pbf-error" : "pbf-hint"}>
            {checkingAvail
              ? "Proveravam dostupnost…"
              : selectedBlocked
                ? `⚠ Jedinica zauzeta${conflictLabel ? ` — ${conflictLabel}` : ""} za ${arrivalDate} → ${addDaysISO(arrivalDate, nights)}`
                : selectedUnit
                  ? `✓ Slobodno: ${selectedUnit.cabin_name} / ${floor === "ground" ? "Prizemlje" : "Sprat"} (${arrivalDate} → ${addDaysISO(arrivalDate, nights)})`
                  : null}
          </div>
        )}

        {error && <div className="pbf-error">{error}</div>}

        <button type="submit" disabled={loading || partners.length === 0 || !!selectedBlocked} className="pbf-btn-primary">
          {loading ? "Čuvam…" : "+ Dodaj rezervaciju partnera"}
        </button>
      </form>

      <style>{`
        .pbf { background: rgba(10,25,25,0.85); border: 1px solid rgba(139,92,246,0.25); border-radius: 12px; padding: 22px; }
        .pbf-form { display: flex; flex-direction: column; gap: 14px; }
        .pbf-row { display: flex; flex-direction: column; gap: 6px; }
        .pbf-label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: rgba(168,213,213,0.6); }
        .pbf-label > span { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; font-size: 10px; }
        .pbf-input { padding: 9px 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-size: 14px; font-family: inherit; }
        .pbf-input:focus { outline: none; border-color: rgba(139,92,246,0.5); }
        .pbf-input-sm { max-width: 120px; }
        .pbf-inline { display: flex; gap: 8px; }
        .pbf-inline .pbf-input { flex: 1; }
        .pbf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 640px) { .pbf-grid { grid-template-columns: 1fr 1fr; } }

        .pbf-addpartner { display: flex; gap: 8px; padding: 12px; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.25); border-radius: 8px; align-items: center; }
        .pbf-addpartner .pbf-input { flex: 1; }

        .pbf-total { padding: 10px 12px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); border-radius: 8px; font-size: 14px; color: #e8f5f5; }

        .pbf-btn-primary { padding: 12px 18px; background: linear-gradient(135deg, #6d28d9, #8b5cf6); border: none; border-radius: 8px; color: #e8f5f5; font-weight: 600; font-size: 14px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
        .pbf-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(139,92,246,0.3); }
        .pbf-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .pbf-btn { padding: 9px 14px; background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.35); border-radius: 8px; color: #e8f5f5; font-weight: 500; font-size: 13px; cursor: pointer; }
        .pbf-btn:hover:not(:disabled) { background: rgba(139,92,246,0.3); }
        .pbf-btn-ghost { padding: 9px 12px; background: transparent; border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: rgba(168,213,213,0.7); font-size: 12px; cursor: pointer; }
        .pbf-btn-ghost:hover { border-color: rgba(139,92,246,0.4); color: #e8f5f5; }

        .pbf-error { padding: 10px 12px; background: rgba(196,74,90,0.1); border: 1px solid rgba(196,74,90,0.3); border-radius: 8px; color: #ffb4c0; font-size: 13px; }
        .pbf-hint { padding: 10px 12px; background: rgba(58,170,112,0.08); border: 1px solid rgba(58,170,112,0.25); border-radius: 8px; color: #a7e8c5; font-size: 13px; }
      `}</style>
    </div>
  );
}
