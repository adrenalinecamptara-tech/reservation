import { z } from "zod";

/**
 * Step 1 — Personal info
 */
export const personalInfoSchema = z.object({
  first_name: z.string().min(2, "Ime mora imati najmanje 2 karaktera"),
  last_name: z.string().min(2, "Prezime mora imati najmanje 2 karaktera"),
  email: z.string().email("Unesite ispravnu email adresu"),
  phone: z.string().min(9, "Unesite ispravan broj telefona"),
  id_card_number: z.string().min(6, "Unesite broj lične karte"),
});

/**
 * Step 2 — Group & booking details
 */
export const groupDetailsSchema = z.object({
  number_of_people: z
    .number({ error: "Unesite broj osoba" })
    .int()
    .min(1, "Minimum 1 osoba")
    .max(40, "Maksimum 40 osoba"),
  arrival_date: z.string().min(1, "Odaberite datum dolaska"),
  package_type: z.string().optional(),
  package_id: z.string().uuid().nullable().optional(),
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
 * Full registration schema (all 3 steps combined)
 */
export const registrationSchema = personalInfoSchema
  .merge(groupDetailsSchema)
  .merge(paymentSchema);

export type PersonalInfoValues = z.infer<typeof personalInfoSchema>;
export type GroupDetailsValues = z.infer<typeof groupDetailsSchema>;
export type PaymentValues = z.infer<typeof paymentSchema>;
export type RegistrationValues = z.infer<typeof registrationSchema>;
