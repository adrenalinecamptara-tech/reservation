"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Cabin, Floor } from "@/lib/db/types";

interface AvailabilityUnit {
  cabin_id: string;
  cabin_name: string;
  floor: Floor;
  available: boolean;
  conflict?: { first_name: string; last_name: string };
}

interface Props {
  cabins: Cabin[];
}

interface UnitRow {
  cabin_id: string;
  floor: Floor | "";
  people_count: number;
}

export function HoldBookingForm({ cabins }: Props) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [holdUntilDate, setHoldUntilDate] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [notes, setNotes] = useState("");
  const [units, setUnits] = useState<UnitRow[]>([
    { cabin_id: cabins[0]?.id ?? "", floor: "", people_count: 1 },
  ]);
  const [availability, setAvailability] = useState<AvailabilityUnit[]>([]);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!arrivalDate || !departureDate || arrivalDate >= departureDate) {
      setAvailability([]);
      return;
    }
    const ctrl = new AbortController();
    setCheckingAvail(true);
    fetch(
      `/api/availability?arrival=${arrivalDate}&departure=${departureDate}`,
      { signal: ctrl.signal },
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setAvailability(data);
      })
      .catch(() => {})
      .finally(() => setCheckingAvail(false));

    return () => ctrl.abort();
  }, [arrivalDate, departureDate]);

  const cabinAvail = useMemo(() => {
    const map: Record<
      string,
      { ground?: AvailabilityUnit; upper?: AvailabilityUnit }
    > = {};
    for (const u of availability) {
      map[u.cabin_id] = map[u.cabin_id] ?? {};
      map[u.cabin_id][u.floor] = u;
    }
    return map;
  }, [availability]);

  const cabinCapacity = (cabinId: string, floor: Floor): number => {
    const cabin = cabins.find((c) => c.id === cabinId);
    if (!cabin) return 0;
    return floor === "ground" ? cabin.ground_beds : cabin.upper_beds;
  };

  const isUnitUsedElsewhere = (idx: number, cabinId: string, floor: Floor) =>
    units.some(
      (u, i) => i !== idx && u.cabin_id === cabinId && u.floor === floor,
    );

  const updateUnit = (idx: number, patch: Partial<UnitRow>) => {
    setUnits((prev) =>
      prev.map((u, i) => (i === idx ? { ...u, ...patch } : u)),
    );
  };

  const totalPeopleInUnits = units.reduce(
    (sum, unit) => sum + (unit.people_count || 0),
    0,
  );
  const peopleRemaining = numberOfPeople - totalPeopleInUnits;

  const addUnit = () => {
    setUnits((prev) => [
      ...prev,
      {
        cabin_id: cabins[0]?.id ?? "",
        floor: "",
        people_count: Math.max(1, peopleRemaining),
      },
    ]);
  };

  const removeUnit = (idx: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== idx));
  };

  useEffect(() => {
    setUnits((prev) => {
      if (prev.length === 0)
        return [
          {
            cabin_id: cabins[0]?.id ?? "",
            floor: "",
            people_count: numberOfPeople,
          },
        ];
      const adjusted = [...prev];
      const currentTotal = adjusted.reduce(
        (sum, unit) => sum + (unit.people_count || 0),
        0,
      );
      if (adjusted.length === 1) {
        adjusted[0] = { ...adjusted[0], people_count: numberOfPeople };
        return adjusted;
      }
      if (currentTotal === numberOfPeople) return adjusted;
      const delta = numberOfPeople - currentTotal;
      const last = adjusted[adjusted.length - 1];
      adjusted[adjusted.length - 1] = {
        ...last,
        people_count: Math.max(1, last.people_count + delta),
      };
      return adjusted;
    });
  }, [numberOfPeople, cabins]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !contact.trim()) {
      setError("Ime, prezime i kontakt su obavezni.");
      return;
    }
    if (!arrivalDate || !departureDate || !holdUntilDate) {
      setError("Svi datumi su obavezni.");
      return;
    }
    if (arrivalDate >= departureDate) {
      setError("Datum odlaska mora biti posle datuma dolaska.");
      return;
    }

    for (const unit of units) {
      if (!unit.cabin_id || !unit.floor) {
        setError("Sve sobe moraju imati izabran bungalov i sprat.");
        return;
      }
      if (unit.people_count < 1) {
        setError("Svaka soba mora imati bar 1 osobu.");
        return;
      }
      const cap = cabinCapacity(unit.cabin_id, unit.floor);
      if (unit.people_count > cap) {
        setError(`Izabrana soba prima max ${cap} osoba.`);
        return;
      }
      const match = availability.find(
        (a) => a.cabin_id === unit.cabin_id && a.floor === unit.floor,
      );
      if (match && !match.available) {
        setError("Jedna od izabranih soba je zauzeta za taj period.");
        return;
      }
    }

    if (totalPeopleInUnits !== numberOfPeople) {
      setError(
        `Zbir osoba po sobama (${totalPeopleInUnits}) mora biti jednak ukupnom broju gostiju (${numberOfPeople}).`,
      );
      return;
    }

    setLoading(true);
    try {
      const primary = units[0];
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          contact: contact.trim(),
          cabin_id: primary.cabin_id,
          floor: primary.floor,
          arrival_date: arrivalDate,
          departure_date: departureDate,
          number_of_people: numberOfPeople,
          hold_until_date: holdUntilDate,
          notes: notes.trim() || null,
          units: units.map((unit) => ({
            cabin_id: unit.cabin_id,
            floor: unit.floor,
            people_count: unit.people_count,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Greška");

      setFirstName("");
      setLastName("");
      setContact("");
      setArrivalDate("");
      setDepartureDate("");
      setHoldUntilDate("");
      setNumberOfPeople(1);
      setNotes("");
      setUnits([{ cabin_id: cabins[0]?.id ?? "", floor: "", people_count: 1 }]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hbf">
      <form onSubmit={onSubmit} className="hbf-form">
        <div className="hbf-grid">
          <label className="hbf-label">
            <span>Ime</span>
            <input
              className="hbf-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </label>
          <label className="hbf-label">
            <span>Prezime</span>
            <input
              className="hbf-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </label>
          <label className="hbf-label hbf-label-wide">
            <span>Kontakt (telefon ili link)</span>
            <input
              className="hbf-input"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+387 ... / instagram.com/..."
            />
          </label>

          <label className="hbf-label">
            <span>Datum dolaska</span>
            <input
              type="date"
              className="hbf-input"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </label>
          <label className="hbf-label">
            <span>Datum odlaska</span>
            <input
              type="date"
              className="hbf-input"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </label>
          <label className="hbf-label">
            <span>Rok uplate (hold)</span>
            <input
              type="date"
              className="hbf-input"
              value={holdUntilDate}
              onChange={(e) => setHoldUntilDate(e.target.value)}
            />
          </label>

          <label className="hbf-label">
            <span>Broj ljudi</span>
            <input
              type="number"
              min={1}
              className="hbf-input"
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(Number(e.target.value))}
            />
          </label>

          <label className="hbf-label hbf-label-wide">
            <span>Napomena</span>
            <input
              className="hbf-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div className="hbf-units-card">
          <div className="hbf-units-head">
            <span>Sobe</span>
            <span>
              Raspoređeno{" "}
              <strong
                style={{
                  color:
                    totalPeopleInUnits === numberOfPeople
                      ? "#a7e8c5"
                      : "#ffe1a8",
                }}
              >
                {totalPeopleInUnits}
              </strong>{" "}
              / {numberOfPeople}
              {peopleRemaining > 0 ? ` · još ${peopleRemaining}` : ""}
              {peopleRemaining < 0
                ? ` · ${Math.abs(peopleRemaining)} previše`
                : ""}
            </span>
          </div>

          <div className="hbf-units-list">
            {units.map((unit, idx) => {
              const selected = unit.floor
                ? cabinAvail[unit.cabin_id]?.[unit.floor]
                : null;
              const blocked = !!(selected && !selected.available);
              const duplicated = !!(
                unit.floor &&
                isUnitUsedElsewhere(idx, unit.cabin_id, unit.floor)
              );
              return (
                <div key={idx} className="hbf-unit-row">
                  <div className="hbf-unit-title">Soba {idx + 1}</div>
                  <div className="hbf-unit-fields">
                    <select
                      className="hbf-input"
                      value={unit.cabin_id}
                      onChange={(e) =>
                        updateUnit(idx, { cabin_id: e.target.value, floor: "" })
                      }
                    >
                      {cabins.map((c) => {
                        const a = cabinAvail[c.id];
                        const bothBusy =
                          availability.length > 0 &&
                          a &&
                          !a.ground?.available &&
                          !a.upper?.available;
                        const suffix =
                          availability.length === 0
                            ? ""
                            : bothBusy
                              ? " - zauzeto"
                              : a &&
                                  (!a.ground?.available || !a.upper?.available)
                                ? " - delimicno"
                                : " - slobodno";
                        return (
                          <option key={c.id} value={c.id} disabled={bothBusy}>
                            {c.name}
                            {suffix}
                          </option>
                        );
                      })}
                    </select>

                    <select
                      className="hbf-input"
                      value={unit.floor}
                      onChange={(e) =>
                        updateUnit(idx, { floor: e.target.value as Floor })
                      }
                    >
                      <option value="">Sprat</option>
                      <option
                        value="ground"
                        disabled={
                          (availability.length > 0 &&
                            cabinAvail[unit.cabin_id]?.ground?.available ===
                              false) ||
                          isUnitUsedElsewhere(idx, unit.cabin_id, "ground")
                        }
                      >
                        Prizemlje
                      </option>
                      <option
                        value="upper"
                        disabled={
                          (availability.length > 0 &&
                            cabinAvail[unit.cabin_id]?.upper?.available ===
                              false) ||
                          isUnitUsedElsewhere(idx, unit.cabin_id, "upper")
                        }
                      >
                        Sprat
                      </option>
                    </select>

                    <input
                      type="number"
                      min={1}
                      className="hbf-input"
                      value={unit.people_count}
                      onChange={(e) =>
                        updateUnit(idx, {
                          people_count: Number(e.target.value),
                        })
                      }
                    />

                    {units.length > 1 && (
                      <button
                        type="button"
                        className="hbf-remove"
                        onClick={() => removeUnit(idx)}
                      >
                        Ukloni
                      </button>
                    )}
                  </div>

                  {(blocked ||
                    duplicated ||
                    (unit.floor &&
                      unit.people_count >
                        cabinCapacity(unit.cabin_id, unit.floor))) && (
                    <div className="hbf-error" style={{ marginTop: 8 }}>
                      {duplicated
                        ? "Ista soba je izabrana više puta."
                        : blocked
                          ? "Izabrana soba je zauzeta za taj period."
                          : `Izabrana soba prima max ${cabinCapacity(unit.cabin_id, unit.floor as Floor)} osoba.`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {peopleRemaining > 0 && (
            <button type="button" className="hbf-add-room" onClick={addUnit}>
              + Dodaj još jednu sobu
            </button>
          )}
        </div>

        {arrivalDate && departureDate && (
          <div className="hbf-hint">
            {checkingAvail
              ? "Proveravam dostupnost..."
              : "Dostupnost je učitana. Raspodeli goste po slobodnim sobama za izabrani period."}
          </div>
        )}

        {error && <div className="hbf-error">{error}</div>}

        <button className="hbf-btn" disabled={loading} type="submit">
          {loading ? "Cuvam..." : "+ Dodaj hold"}
        </button>
      </form>

      <style>{`
        .hbf { background: rgba(10,25,25,0.85); border: 1px solid rgba(199,146,47,0.25); border-radius: 12px; padding: 22px; }
        .hbf-form { display: flex; flex-direction: column; gap: 12px; }
        .hbf-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .hbf-label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: rgba(168,213,213,0.6); }
        .hbf-label > span { text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; font-weight: 600; }
        .hbf-label-wide { grid-column: span 3; }
        .hbf-input { padding: 9px 12px; background: rgba(0,0,0,0.28); border: 1px solid rgba(62,140,140,0.2); border-radius: 8px; color: #e8f5f5; font-size: 14px; font-family: inherit; }
        .hbf-input:focus { outline: none; border-color: rgba(199,146,47,0.5); }
        .hbf-input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) brightness(2); opacity: 1; cursor: pointer; }
        .hbf-btn { padding: 12px 18px; background: linear-gradient(135deg, #7a571e, #c7922f); border: none; border-radius: 8px; color: #fff5df; font-weight: 600; font-size: 14px; cursor: pointer; }
        .hbf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .hbf-hint { padding: 10px 12px; background: rgba(58,170,112,0.08); border: 1px solid rgba(58,170,112,0.25); border-radius: 8px; color: #a7e8c5; font-size: 13px; }
        .hbf-error { padding: 10px 12px; background: rgba(196,74,90,0.1); border: 1px solid rgba(196,74,90,0.3); border-radius: 8px; color: #ffb4c0; font-size: 13px; }
        .hbf-units-card { padding: 14px; background: rgba(199,146,47,0.08); border: 1px solid rgba(199,146,47,0.25); border-radius: 10px; }
        .hbf-units-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; font-size: 12px; color: rgba(168,213,213,0.7); }
        .hbf-units-head span:first-child { text-transform: uppercase; letter-spacing: 0.06em; font-size: 10px; font-weight: 600; }
        .hbf-units-list { display: flex; flex-direction: column; gap: 10px; }
        .hbf-unit-row { padding: 12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(62,140,140,0.16); border-radius: 8px; }
        .hbf-unit-title { font-size: 12px; font-weight: 600; color: #ffe1a8; margin-bottom: 8px; }
        .hbf-unit-fields { display: grid; grid-template-columns: 1.6fr 1fr 0.8fr auto; gap: 8px; }
        .hbf-remove, .hbf-add-room { padding: 9px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
        .hbf-remove { border: 1px solid rgba(196,74,90,0.3); background: transparent; color: #ffb4c0; }
        .hbf-add-room { margin-top: 10px; border: 1px solid rgba(199,146,47,0.35); background: rgba(199,146,47,0.16); color: #ffe1a8; }

        @media (max-width: 720px) {
          .hbf-grid { grid-template-columns: 1fr 1fr; }
          .hbf-label-wide { grid-column: span 2; }
          .hbf-unit-fields { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .hbf-grid { grid-template-columns: 1fr; }
          .hbf-label-wide { grid-column: span 1; }
          .hbf-unit-fields { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
