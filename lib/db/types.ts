/**
 * Database types for Adrenaline Camp Tara reservation system.
 * After setting up Supabase project, replace with generated types:
 *   npx supabase gen types typescript --project-id <id> > lib/db/types.ts
 */

export type ReservationStatus =
  | "pending"
  | "approved"
  | "cancelled"
  | "modified"
  | "paid";
export type HoldStatus = "active" | "expired" | "converted" | "cancelled";
export type Floor = "ground" | "upper";

export interface Package {
  id: string;
  name: string;
  includes: string;
  description: string | null;
  weekend_price: number;
  weekday_price: number;
  status: "active" | "inactive";
  sort_order: number;
  created_at: string;
}

export interface Cabin {
  id: string;
  name: string;
  ground_beds: number;
  upper_beds: number;
  notes: string | null;
  active: boolean;
  created_at: string;
}

export interface InviteLink {
  id: string;
  token: string;
  created_by: string | null;
  notes: string | null;
  used: boolean;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  invite_link_id: string | null;
  // Guest personal data
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_card_number: string;
  // Booking
  number_of_people: number;
  arrival_date: string; // ISO date string
  departure_date: string | null;
  package_type: string | null;
  // Financial
  deposit_amount: number;
  total_amount: number | null;
  remaining_amount: number | null;
  currency: string;
  // Payment proof
  payment_proof_path: string | null;
  payment_proof_name: string | null;
  // Package
  package_id: string | null;
  // Cabin
  cabin_id: string | null;
  floor: Floor | null;
  // Status
  status: ReservationStatus;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  // Voucher
  voucher_sent_at: string | null;
  paid_at: string | null;
  paid_by: string | null;
  voucher_number: string | null; // ACT-YYYY-NNNN (sequential, admin reference)
  verify_code: string | null; // random 10-digit, used for QR + /verify URL
  // Timestamps
  created_at: string;
  updated_at: string;
  // Relations (joined)
  cabin?: Cabin;
  // New fields
  date_of_birth?: string | null; // ISO date string
  referral_source?: string | null;
  referral_source_other?: string | null;
}

export interface ReservationInsert {
  invite_link_id?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_card_number: string;
  number_of_people: number;
  arrival_date: string;
  departure_date?: string | null;
  package_type?: string | null;
  deposit_amount: number;
  total_amount?: number | null;
  remaining_amount?: number | null;
  currency?: string;
  payment_proof_path?: string | null;
  payment_proof_name?: string | null;
  package_id?: string | null;
  cabin_id?: string | null;
  floor?: Floor | null;
  // New fields
  date_of_birth?: string | null;
  referral_source?: string | null;
  referral_source_other?: string | null;
}

export interface ReservationUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  id_card_number?: string;
  number_of_people?: number;
  arrival_date?: string;
  departure_date?: string | null;
  package_type?: string | null;
  deposit_amount?: number;
  total_amount?: number | null;
  remaining_amount?: number | null;
  payment_proof_path?: string | null;
  payment_proof_name?: string | null;
  package_id?: string | null;
  cabin_id?: string | null;
  floor?: Floor | null;
  status?: ReservationStatus;
  admin_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  voucher_sent_at?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  // New fields
  date_of_birth?: string | null;
  referral_source?: string | null;
  referral_source_other?: string | null;
}

export interface ReservationUnit {
  id: string;
  reservation_id: string;
  cabin_id: string;
  floor: Floor;
  people_count: number;
  created_at: string;
  cabin?: Cabin;
}

export interface ReservationUnitInput {
  cabin_id: string;
  floor: Floor;
  people_count: number;
}

export interface Partner {
  id: string;
  name: string;
  default_price_per_person: number;
  notes: string | null;
  created_at: string;
}

export interface PartnerBooking {
  id: string;
  partner_id: string;
  cabin_id: string;
  floor: Floor;
  arrival_date: string;
  nights: number;
  number_of_people: number;
  price_per_person: number;
  notes: string | null;
  paid_at: string | null;
  paid_by: string | null;
  created_by: string | null;
  created_at: string;
  partner?: Partner;
  cabin?: Cabin;
}

export interface PartnerBookingInsert {
  partner_id: string;
  cabin_id: string;
  floor: Floor;
  arrival_date: string;
  nights: number;
  number_of_people: number;
  price_per_person: number;
  notes?: string | null;
  created_by?: string | null;
}

export interface ReservationHold {
  id: string;
  first_name: string;
  last_name: string;
  contact: string;
  cabin_id: string;
  floor: Floor;
  arrival_date: string;
  departure_date: string;
  number_of_people: number;
  hold_until_date: string;
  notes: string | null;
  status: HoldStatus;
  converted_reservation_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  cabin?: Cabin;
}

export interface ReservationHoldInsert {
  first_name: string;
  last_name: string;
  contact: string;
  cabin_id: string;
  floor: Floor;
  arrival_date: string;
  departure_date: string;
  number_of_people: number;
  hold_until_date: string;
  notes?: string | null;
  status?: HoldStatus;
  converted_reservation_id?: string | null;
  created_by?: string | null;
}

export interface ReservationHoldUnit {
  id: string;
  reservation_hold_id: string;
  cabin_id: string;
  floor: Floor;
  people_count: number;
  created_at: string;
  cabin?: Cabin;
}

export interface ReservationHoldUnitInput {
  cabin_id: string;
  floor: Floor;
  people_count: number;
}

// Minimal Database type wrapper for Supabase client generics
export type Database = {
  public: {
    Tables: {
      reservations: {
        Row: Reservation;
        Insert: ReservationInsert;
        Update: ReservationUpdate;
      };
      invite_links: {
        Row: InviteLink;
        Insert: Omit<InviteLink, "id" | "created_at">;
        Update: Partial<Omit<InviteLink, "id" | "created_at">>;
      };
      cabins: {
        Row: Cabin;
        Insert: Omit<Cabin, "id" | "created_at">;
        Update: Partial<Omit<Cabin, "id" | "created_at">>;
      };
      packages: {
        Row: Package;
        Insert: Omit<Package, "id" | "created_at">;
        Update: Partial<Omit<Package, "id" | "created_at">>;
      };
      partners: {
        Row: Partner;
        Insert: Omit<Partner, "id" | "created_at">;
        Update: Partial<Omit<Partner, "id" | "created_at">>;
      };
      partner_bookings: {
        Row: PartnerBooking;
        Insert: PartnerBookingInsert;
        Update: Partial<PartnerBookingInsert>;
      };
      reservation_units: {
        Row: ReservationUnit;
        Insert: Omit<ReservationUnit, "id" | "created_at">;
        Update: Partial<Omit<ReservationUnit, "id" | "created_at">>;
      };
      reservation_holds: {
        Row: ReservationHold;
        Insert: ReservationHoldInsert;
        Update: Partial<ReservationHoldInsert>;
      };
      reservation_hold_units: {
        Row: ReservationHoldUnit;
        Insert: Omit<ReservationHoldUnit, "id" | "created_at">;
        Update: Partial<Omit<ReservationHoldUnit, "id" | "created_at">>;
      };
    };
    Enums: {
      reservation_status: ReservationStatus;
      floor: Floor;
    };
  };
};
