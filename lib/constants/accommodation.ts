export const TENT_CAPACITY = 2;

export type AccommodationType = "bungalow" | "tent";

export const ACCOMMODATION_LABELS: Record<
  AccommodationType,
  { label: string; emoji: string }
> = {
  bungalow: { label: "Bungalov", emoji: "🏠" },
  tent: { label: "Šator", emoji: "⛺" },
};

export function tentCount(people: number): number {
  return Math.max(1, Math.ceil(people / TENT_CAPACITY));
}
