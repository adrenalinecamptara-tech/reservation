"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  personalInfoSchema,
  type PersonalInfoValues,
} from "@/lib/validations/registrationSchema";
import { useRegistrationStore } from "@/lib/store/registrationStore";
import { REFERRAL_SOURCES } from "@/lib/constants/referralSources";

export function PersonalInfoStep() {
  const { personalInfo, setPersonalInfo, nextStep } = useRegistrationStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PersonalInfoValues>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: personalInfo as PersonalInfoValues,
  });

  const referralSource = watch("referral_source");

  const onSubmit = (data: PersonalInfoValues) => {
    setPersonalInfo(data);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="act-hint">
        Ove informacije su potrebne za vaučer i organizaciju boravka. Podaci se
        čuvaju bezbedno.
      </p>

      <div className="act-row-2">
        <div className="act-field">
          <label className="act-label" htmlFor="first_name">
            Ime
          </label>
          <input
            id="first_name"
            className={`act-input ${errors.first_name ? "act-input--error" : ""}`}
            placeholder="Ana"
            autoComplete="given-name"
            {...register("first_name")}
          />
          {errors.first_name && (
            <p className="act-error">{errors.first_name.message}</p>
          )}
        </div>
        <div className="act-field">
          <label className="act-label" htmlFor="last_name">
            Prezime
          </label>
          <input
            id="last_name"
            className={`act-input ${errors.last_name ? "act-input--error" : ""}`}
            placeholder="Petrović"
            autoComplete="family-name"
            {...register("last_name")}
          />
          {errors.last_name && (
            <p className="act-error">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="email">
          Email adresa
        </label>
        <input
          id="email"
          type="email"
          className={`act-input ${errors.email ? "act-input--error" : ""}`}
          placeholder="ana@email.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && <p className="act-error">{errors.email.message}</p>}
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="phone">
          Broj telefona
        </label>
        <input
          id="phone"
          type="tel"
          className={`act-input ${errors.phone ? "act-input--error" : ""}`}
          placeholder="+381 60 123 4567"
          autoComplete="tel"
          {...register("phone")}
        />
        {errors.phone && <p className="act-error">{errors.phone.message}</p>}
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="id_card_number">
          Broj lične karte
        </label>
        <input
          id="id_card_number"
          className={`act-input ${errors.id_card_number ? "act-input--error" : ""}`}
          placeholder="000123456"
          {...register("id_card_number")}
        />
        {errors.id_card_number && (
          <p className="act-error">{errors.id_card_number.message}</p>
        )}
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="date_of_birth">
          Datum rođenja
        </label>
        <input
          id="date_of_birth"
          type="date"
          className={`act-input ${errors.date_of_birth ? "act-input--error" : ""}`}
          {...register("date_of_birth")}
          style={{ colorScheme: "dark" }}
        />
        {errors.date_of_birth && (
          <p className="act-error">{errors.date_of_birth.message}</p>
        )}
      </div>

      <div className="act-field">
        <label className="act-label" htmlFor="referral_source">
          Kako si čuo/la za nas?
        </label>
        <select
          id="referral_source"
          className={`act-input ${errors.referral_source ? "act-input--error" : ""}`}
          {...register("referral_source")}
        >
          <option value="">Odaberi opciju</option>
          {REFERRAL_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.value}
            </option>
          ))}
        </select>
        {errors.referral_source && (
          <p className="act-error">{errors.referral_source.message}</p>
        )}
      </div>

      {referralSource === "Drugo" && (
        <div className="act-field">
          <label className="act-label" htmlFor="referral_source_other">
            Kako?
          </label>
          <input
            id="referral_source_other"
            className={`act-input ${errors.referral_source_other ? "act-input--error" : ""}`}
            placeholder="Napiši kako si čuo/la za nas"
            {...register("referral_source_other")}
          />
          {errors.referral_source_other && (
            <p className="act-error">{errors.referral_source_other.message}</p>
          )}
        </div>
      )}

      <div className="act-btn-row">
        <button type="submit" className="act-btn act-btn--primary">
          Sledeći korak →
        </button>
      </div>
    </form>
  );
}
