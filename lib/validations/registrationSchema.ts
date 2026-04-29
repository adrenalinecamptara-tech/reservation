import { z } from "zod";

const referralSourceOtherRefine = (
  data: { referral_source?: string; referral_source_other?: string },
  ctx: z.RefinementCtx,
) => {
  if (
    data.referral_source === "Drugo" &&
    (!data.referral_source_other ||
      data.referral_source_other.trim().length <= 2)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Molimo upišite kako ste čuli za nas",
      path: ["referral_source_other"],
    });
  }
};

/**
 * Step 1 — Personal info
 */
const personalInfoBase = z.object({
  first_name: z.string().min(2, "Ime mora imati najmanje 2 karaktera"),
  last_name: z.string().min(2, "Prezime mora imati najmanje 2 karaktera"),
  email: z.string().email("Unesite ispravnu email adresu"),
  phone: z.string().min(9, "Unesite ispravan broj telefona"),
  id_card_number: z.string().min(6, "Unesite broj lične karte"),
  date_of_birth: z.string().min(1, "Unesite datum rođenja"),
  referral_source: z.string().min(1, "Odaberite kako ste čuli za nas"),
  referral_source_other: z.string().optional(),
});

export const personalInfoSchema = personalInfoBase.superRefine(
  referralSourceOtherRefine,
);

/**
 * Step 2 — Group & booking details
 */
export const groupDetailsSchema = z.object({
  number_of_people: z
    .number({ error: "Unesite broj osoba" })
    .int()
    .min(1, "Minimum 1 osoba")
    .max(60, "Maksimum 60 osoba"),
  arrival_date: z.string().min(1, "Odaberite datum dolaska"),
  package_type: z.string().optional(),
  package_id: z.string().uuid({ message: "Odaberite paket" }),
  accommodation_type: z.enum(["bungalow", "tent"]),
});

/**
 * Step 3 — Payment
 */
export const paymentSchema = z.object({
  deposit_amount: z
    .number({ error: "Unesite iznos depozita" })
    .positive("Depozit mora biti pozitivan"),
  total_amount: z.number().min(0).optional(),
  remaining_amount: z.number().min(0).optional(),
  payment_proof_path: z.string().min(1, "Molimo uploadujte dokaz o uplati"),
  payment_proof_name: z.string().optional(),
});

/**
 * Step 3 (between group details and payment) — Selections
 * Posto su izbori opcioni za stari paket flow, validacija je permisivna.
 * Server-side `computeQuote` daje detaljnu validaciju choice slot-ova.
 */
export const selectionsValueSchema = z
  .object({
    choices: z.record(z.string(), z.string()).optional(),
    addons: z.record(z.string(), z.array(z.string())).optional(),
  })
  .optional()
  .nullable();

export const daySnapshotSchema = z
  .array(
    z.object({
      day: z.number(),
      meals: z.array(z.union([z.string(), z.array(z.string())])),
      activities: z.array(z.union([z.string(), z.array(z.string())])),
      addons: z.array(z.string()).optional(),
    }),
  )
  .optional()
  .nullable();

/**
 * Full registration schema (all 3 steps combined).
 * .merge() skida .refine/.superRefine sa ZodEffects, pa kombinujemo base objekte pa
 * ponovo dodajemo refinement nad spojenom šemom.
 */
export const registrationSchema = personalInfoBase
  .merge(groupDetailsSchema)
  .merge(paymentSchema)
  .extend({
    selections: selectionsValueSchema,
    day_schedule_snapshot: daySnapshotSchema,
    computed_total: z.number().nullable().optional(),
  })
  .superRefine(referralSourceOtherRefine);

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type GroupDetailsValues = z.infer<typeof groupDetailsSchema>;
export type PaymentValues = z.infer<typeof paymentSchema>;
export type RegistrationValues = z.infer<typeof registrationSchema>;
