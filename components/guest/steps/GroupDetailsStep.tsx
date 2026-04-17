"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  groupDetailsSchema,
  type GroupDetailsValues,
} from "@/lib/validations/registrationSchema";
import { useRegistrationStore } from "@/lib/store/registrationStore";
import { calcTotal, isWeekendArrival } from "@/lib/utils/pricing";
import type { Package } from "@/lib/db/types";

export function GroupDetailsStep() {
  const {
    groupDetails,
    setGroupDetails,
    setCalculatedTotal,
    nextStep,
    prevStep,
  } = useRegistrationStore();

  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    fetch("/api/packages")
      .then((r) => r.json())
      .then(setPackages)
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GroupDetailsValues>({
    resolver: zodResolver(groupDetailsSchema),
    defaultValues: {
      ...groupDetails,
      number_of_people: (groupDetails.number_of_people as number) || undefined,
      package_id: groupDetails.package_id ?? null,
      package_type: groupDetails.package_type ?? "",
    },
  });

  const watchedPackageId = watch("package_id");
  const watchedPeople = watch("number_of_people");
  const watchedDate = watch("arrival_date");

  // Resolve selected package object
  const selectedPkg = packages.find((p) => p.id === watchedPackageId) ?? null;

  // Custom package = no fixed price (both prices are 0)
  const isCustomPkg = !!(
    selectedPkg &&
    selectedPkg.weekend_price === 0 &&
    selectedPkg.weekday_price === 0
  );

  // Live price preview (not applicable for custom packages)
  const liveTotal =
    selectedPkg && !isCustomPkg && watchedPeople >= 1 && watchedDate
      ? calcTotal(selectedPkg, watchedPeople, watchedDate)
      : null;

  const isWeekend = watchedDate ? isWeekendArrival(watchedDate) : null;

  const onSubmit = (data: GroupDetailsValues) => {
    // Store package_type (name) for display + historical purposes
    const pkg = packages.find((p) => p.id === data.package_id);
    const enriched = {
      ...data,
      package_type: pkg?.name ?? data.package_type ?? "",
    };
    setGroupDetails(enriched);

    // Pre-calculate total for PaymentStep (skip for custom packages)
    const pkgIsCustom =
      pkg && pkg.weekend_price === 0 && pkg.weekday_price === 0;
    if (pkg && !pkgIsCustom && data.number_of_people && data.arrival_date) {
      setCalculatedTotal(
        calcTotal(pkg, data.number_of_people, data.arrival_date),
      );
    } else {
      setCalculatedTotal(null);
    }

    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="act-hint">
        Datum dolaska je obično <strong>petak ili subota</strong>. Polazak kući
        je u<strong> nedelju ili ponedeljak</strong> nakon doručka.
        Komunicirajte tačan termin sa kamp menadžerom pre ove prijave.
      </p>

      <div className="act-field">
        <label className="act-label" htmlFor="arrival_date">
          Datum dolaska
        </label>
        <input
          id="arrival_date"
          type="date"
          className={`act-input ${errors.arrival_date ? "act-input--error" : ""}`}
          {...register("arrival_date")}
          min={new Date().toISOString().split("T")[0]}
          style={{ colorScheme: "dark" }}
        />
        {errors.arrival_date && (
          <p className="act-error">{errors.arrival_date.message}</p>
        )}
        {isWeekend !== null && (
          <p className="act-price-note">
            {isWeekend
              ? "🟡 Vikend termin - primenjuje se vikend cena"
              : "🟢 Radni dan — primenjuje se cena radnog dana"}
          </p>
        )}
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="number_of_people">
          Broj osoba (uključujući tebe)
        </label>
        <input
          id="number_of_people"
          type="number"
          min={1}
          max={40}
          className={`act-input ${errors.number_of_people ? "act-input--error" : ""}`}
          placeholder="2"
          {...register("number_of_people", { valueAsNumber: true })}
        />
        {errors.number_of_people && (
          <p className="act-error">{errors.number_of_people.message}</p>
        )}
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="package_id">
          Paket
        </label>
        <select
          id="package_id"
          className="act-input act-select"
          {...register("package_id")}
          onChange={(e) => {
            setValue("package_id", e.target.value || null);
            const pkg = packages.find((p) => p.id === e.target.value);
            setValue("package_type", pkg?.name ?? "");
          }}
        >
          <option value="">Odaberi paket (opciono)</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.includes}
            </option>
          ))}
        </select>
      </div>

      {/* Price preview — hidden for custom packages */}
      {selectedPkg && !isCustomPkg && (
        <div className="act-price-card">
          <div className="act-price-row">
            <span className="act-price-label">Cena po osobi</span>
            <span className="act-price-val">
              {isWeekend
                ? selectedPkg.weekend_price
                : selectedPkg.weekday_price}{" "}
              €
              <span className="act-price-type">
                ({isWeekend ? "vikend" : "radni dan"})
              </span>
            </span>
          </div>
          {liveTotal !== null && (
            <div className="act-price-row act-price-row--total">
              <span className="act-price-label">
                Ukupno ({watchedPeople}{" "}
                {watchedPeople === 1 ? "osoba" : "osoba"})
              </span>
              <span className="act-price-total">{liveTotal} €</span>
            </div>
          )}
          {selectedPkg.description && (
            <p className="act-price-desc">{selectedPkg.description}</p>
          )}
        </div>
      )}

      {/* Hidden field to carry package_type */}
      <input type="hidden" {...register("package_type")} />

      <div className="act-btn-row">
        <button
          type="button"
          className="act-btn act-btn--secondary"
          onClick={prevStep}
          style={{ flex: "0 0 auto", width: "100px" }}
        >
          ← Nazad
        </button>
        <button type="submit" className="act-btn act-btn--primary">
          Sledeći korak →
        </button>
      </div>

      <style>{`
        .act-price-note { font-size: 12px; color: rgba(168,213,213,0.5); margin-top: 4px; }
        .act-price-card { background: rgba(30,77,77,0.15); border: 1px solid rgba(62,140,140,0.2); border-radius: 10px; padding: 14px 16px; margin: 4px 0 16px; }
        .act-price-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
        .act-price-row--total { margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(62,140,140,0.15); }
        .act-price-label { font-size: 13px; color: rgba(168,213,213,0.5); }
        .act-price-val { font-size: 15px; color: #a8d5d5; font-weight: 600; }
        .act-price-type { font-size: 11px; color: rgba(168,213,213,0.4); font-weight: 400; margin-left: 4px; }
        .act-price-total { font-size: 20px; color: #7dcfcf; font-weight: 700; }
        .act-price-desc { font-size: 12px; color: rgba(168,213,213,0.4); line-height: 1.5; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(62,140,140,0.1); white-space: pre-line; }
      `}</style>
    </form>
  );
}
