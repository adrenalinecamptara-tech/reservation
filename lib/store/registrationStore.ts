import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PersonalInfoValues,
  GroupDetailsValues,
  PaymentValues,
} from "@/lib/validations/registrationSchema";

export type RegistrationStep = 1 | 2 | 3;

interface RegistrationState {
  step: RegistrationStep;
  token: string;
  personalInfo: Partial<PersonalInfoValues>;
  groupDetails: Partial<GroupDetailsValues>;
  payment: Partial<PaymentValues>;

  setToken: (token: string) => void;
  setStep: (step: RegistrationStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setPersonalInfo: (data: PersonalInfoValues) => void;
  setGroupDetails: (data: GroupDetailsValues) => void;
  setPayment: (data: Partial<PaymentValues>) => void;
  reset: () => void;
}

const initialState = {
  step: 1 as RegistrationStep,
  token: "",
  personalInfo: {},
  groupDetails: {},
  payment: {},
};

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setToken: (token) => set({ token }),
      setStep: (step) => set({ step }),
      nextStep: () => {
        const next = Math.min(get().step + 1, 3) as RegistrationStep;
        set({ step: next });
      },
      prevStep: () => {
        const prev = Math.max(get().step - 1, 1) as RegistrationStep;
        set({ step: prev });
      },
      setPersonalInfo: (data) => set({ personalInfo: data }),
      setGroupDetails: (data) => set({ groupDetails: data }),
      setPayment: (data) =>
        set((s) => ({ payment: { ...s.payment, ...data } })),
      reset: () => set(initialState),
    }),
    {
      name: "act-registration",
      // Only persist form data, not step — so refresh doesn't confuse the user
      partialize: (s) => ({
        token: s.token,
        personalInfo: s.personalInfo,
        groupDetails: s.groupDetails,
        payment: s.payment,
      }),
    }
  )
);
