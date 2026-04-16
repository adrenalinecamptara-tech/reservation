"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupDetailsSchema, type GroupDetailsValues } from "@/lib/validations/registrationSchema";
import { useRegistrationStore } from "@/lib/store/registrationStore";

const PACKAGES = [
  { value: "", label: "Odaberi paket (opciono)" },
  { value: "savršen-vikend", label: "Savršen vikend — Rafting + 5 obroka" },
  { value: "balans", label: "Balans — Rafting + Hiking + Jeep safari" },
  { value: "adrenalin", label: "Adrenalin — 2× Rafting + ATV" },
  { value: "rafting-plus", label: "Rafting Plus — Rafting + izbor aktivnosti" },
  { value: "tim-bilding", label: "Tim bilding" },
  { value: "porodični-kombo", label: "Porodični kombo" },
];

export function GroupDetailsStep() {
  const { groupDetails, setGroupDetails, nextStep, prevStep } = useRegistrationStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupDetailsValues>({
    resolver: zodResolver(groupDetailsSchema),
    defaultValues: {
      ...groupDetails,
      number_of_people: (groupDetails.number_of_people as number) || undefined,
    },
  });

  const onSubmit = (data: GroupDetailsValues) => {
    setGroupDetails(data);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="act-hint">
        Datum dolaska je <strong>petak</strong>. Polazak kući je u
        <strong> nedelju</strong> nakon doručka. Komunicirajte tačan termin sa
        kamp menadžerom pre ove prijave.
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
        <label className="act-label" htmlFor="package_type">
          Paket (opciono)
        </label>
        <select
          id="package_type"
          className="act-input act-select"
          {...register("package_type")}
        >
          {PACKAGES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

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
    </form>
  );
}
