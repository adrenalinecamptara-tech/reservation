/**
 * Jedinstveni izvor istine za referral source opcije.
 * Koristi se u PersonalInfoStep (forma), ReferralWheel (legenda i boje)
 * i reservationService (fallback "Nepoznato" kad polje nije postavljeno).
 */

export interface ReferralSource {
  value: string;
  color: string;
}

export const REFERRAL_SOURCES: readonly ReferralSource[] = [
  { value: "Instagram", color: "#e1306c" },
  { value: "YouTube", color: "#e8503a" },
  { value: "TikTok", color: "#a78bfa" },
  { value: "Facebook", color: "#3b82f6" },
  { value: "Google pretraga", color: "#16a34a" },
  { value: "Naš sajt", color: "#38bdf8" },
  { value: "Booking.com / Airbnb", color: "#0ea5e9" },
  { value: "Preporuka prijatelja", color: "#f472b6" },
  { value: "AI pretraga (ChatGPT, Gemini...)", color: "#94a3b8" },
  { value: "Ponovo dolazim", color: "#3aaa70" },
  { value: "Drugo", color: "#e8a030" },
] as const;

export const UNKNOWN_REFERRAL_SOURCE = "Nepoznato";
export const UNKNOWN_REFERRAL_COLOR = "#4a5568";

const SOURCE_COLOR_MAP: Record<string, string> = {
  ...Object.fromEntries(REFERRAL_SOURCES.map((s) => [s.value, s.color])),
  [UNKNOWN_REFERRAL_SOURCE]: UNKNOWN_REFERRAL_COLOR,
};

const FALLBACK_COLORS = ["#4f9bbf", "#9b6bd9", "#c44a5a", "#3a9090", "#d4a017"];

export function getReferralSourceColor(source: string, idx = 0): string {
  return SOURCE_COLOR_MAP[source] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}
