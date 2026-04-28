import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PersonalInfoValues,
  GroupDetailsValues,
  PaymentValues,
} from "@/lib/validations/registrationSchema";
import type { PackageDay, Selections } from "@/lib/constants/activities";

export type RegistrationStep = 1 | 2 | 3 | 4;

interface RegistrationState {
  step: RegistrationStep;
  token: string;
  personalInfo: Partial<
    PersonalInfoValues & {
      date_of_birth?: string;
      referral_source?: string;
      referral_source_other?: string;
    }
  >;
  groupDetails: Partial<GroupDetailsValues>;
  selections: Selections;
  daySnapshot: PackageDay[] | null;
  computedTotal: number | null;
  payment: Partial<PaymentValues>;

  setToken: (token: string) => void;
  setStep: (step: RegistrationStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPersonalInfo: (data: PersonalInfoValues) => void;
  setGroupDetails: (data: GroupDetailsValues) => void;
  setSelections: (s: Selections) => void;
  setDaySnapshot: (s: PackageDay[] | null) => void;
  setComputedTotal: (total: number | null) => void;
  setCalculatedTotal: (total: number | null) => void; // legacy alias
  setPayment: (data: Partial<PaymentValues>) => void;
  reset: () => void;
}

const initialState = {
  step: 1 as RegistrationStep,
  token: "",
  personalInfo: {},
  groupDetails: {},
  selections: {} as Selections,
  daySnapshot: null,
  computedTotal: null,
  payment: {},
};

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setToken: (token) => set({ token }),
      setStep: (step) => set({ step }),
      nextStep: () => {
        const next = Math.min(get().step + 1, 4) as RegistrationStep;
        set({ step: next });
      },
      prevStep: () => {
        const prev = Math.max(get().step - 1, 1) as RegistrationStep;
        set({ step: prev });
      },
      setPersonalInfo: (data) => set({ personalInfo: data }),
      setGroupDetails: (data) => set({ groupDetails: data }),
      setSelections: (s) => set({ selections: s }),
      setDaySnapshot: (s) => set({ daySnapshot: s }),
      setComputedTotal: (total) =>
        set((s) => ({
          computedTotal: total,
          payment: { ...s.payment, total_amount: total ?? undefined },
        })),
      setCalculatedTotal: (total) =>
        set((s) => ({
          computedTotal: total,
          payment: { ...s.payment, total_amount: total ?? undefined },
        })),
      setPayment: (data) =>
        set((s) => ({ payment: { ...s.payment, ...data } })),
      reset: () => set(initialState),
    }),
    {
      name: "act-registration",
      partialize: (s) => ({
        token: s.token,
        personalInfo: s.personalInfo,
        groupDetails: s.groupDetails,
        selections: s.selections,
        daySnapshot: s.daySnapshot,
        computedTotal: s.computedTotal,
        payment: s.payment,
      }),
    },
  ),
);
