import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/db/supabase";
import type { Reservation } from "@/lib/db/types";

interface Props {
  params: Promise<{ voucherNumber: string }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Na čekanju",
  approved: "Odobreno",
  cancelled: "Otkazano",
  modified: "Izmijenjeno",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "#b45309",
  approved: "#15803d",
  cancelled: "#b91c1c",
  modified: "#1d4ed8",
};

export default async function VerifyPage({ params }: Props) {
  const { voucherNumber } = await params;

  // Must be authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/worker/login?redirectTo=/verify/${voucherNumber}`);
  }

  // Fetch reservation by verify_code (service client to bypass RLS)
  const db = createServiceClient();
  const { data: reservation, error } = await db
    .from("reservations")
    .select("*, cabin:cabins(*)")
    .eq("verify_code", voucherNumber)
    .single<Reservation>();

  const found = !error && !!reservation;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f4", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f2020 0%, #1e4d4d 100%)",
        padding: "20px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{ color: "rgba(168,213,213,0.5)", fontSize: 13, letterSpacing: -2 }}>〰</div>
        <div style={{ color: "#a8d5d5", fontSize: 13, fontWeight: 700, letterSpacing: "0.15em" }}>ACT</div>
        <div style={{ color: "rgba(168,213,213,0.5)", fontSize: 13, letterSpacing: -2 }}>〰</div>
        <div style={{ flex: 1, color: "#e8f5f5", fontSize: 15, fontWeight: 600, marginLeft: 8 }}>
          Provjera vaučera
        </div>
        <div style={{
          fontSize: 12,
          color: "rgba(168,213,213,0.5)",
          letterSpacing: "0.08em",
          textTransform: "uppercase" as const,
        }}>
          Adrenaline Camp Tara
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
        {/* Voucher number badge */}
        <div style={{
          background: "#1e4d4d",
          borderRadius: 12,
          padding: "20px 24px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ color: "rgba(168,213,213,0.6)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 }}>
              Broj vaučera
            </div>
            <div style={{ color: "#e8f5f5", fontSize: 24, fontWeight: 700, letterSpacing: "0.15em" }}>
              {voucherNumber}
            </div>
          </div>
          {found && (
            <div style={{
              background: reservation.status === "approved" ? "rgba(21,128,61,0.2)" : "rgba(180,83,9,0.2)",
              border: `1px solid ${STATUS_COLOR[reservation.status] ?? "#666"}`,
              borderRadius: 8,
              padding: "8px 16px",
              color: STATUS_COLOR[reservation.status] ?? "#666",
              fontSize: 13,
              fontWeight: 700,
            }}>
              {STATUS_LABEL[reservation.status] ?? reservation.status}
            </div>
          )}
        </div>

        {!found ? (
          <div style={{
            background: "#fff",
            borderRadius: 12,
            padding: "40px 24px",
            textAlign: "center" as const,
            border: "1px solid #fee2e2",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✗</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>
              Vaučer nije pronađen
            </div>
            <div style={{ fontSize: 14, color: "#6b7280" }}>
              Broj vaučera <strong>{voucherNumber}</strong> ne postoji u sistemu.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
            {/* Guest info */}
            <Section title="Podaci gosta">
              <Row label="Ime i prezime" value={`${reservation.first_name} ${reservation.last_name}`} />
              <Row label="Email" value={reservation.email} />
              <Row label="Telefon" value={reservation.phone} />
              <Row label="JMBG / Br. lične karte" value={reservation.id_card_number} />
            </Section>

            {/* Booking */}
            <Section title="Rezervacija">
              <Row label="Paket" value={reservation.package_type ?? "—"} />
              <Row label="Datum dolaska" value={formatDate(reservation.arrival_date)} />
              {reservation.departure_date && (
                <Row label="Datum odlaska" value={formatDate(reservation.departure_date)} />
              )}
              <Row label="Broj osoba" value={String(reservation.number_of_people)} />
              {reservation.cabin && (
                <Row label="Bungalov" value={`${reservation.cabin.name}${reservation.floor ? ` — ${reservation.floor === "ground" ? "Prizemlje" : "Sprat"}` : ""}`} />
              )}
            </Section>

            {/* Payment */}
            <Section title="Plaćanje">
              <Row label="Depozit" value={`${reservation.deposit_amount} ${reservation.currency}`} />
              {reservation.total_amount != null && (
                <Row label="Ukupno" value={`${reservation.total_amount} ${reservation.currency}`} />
              )}
              {reservation.remaining_amount != null && (
                <Row label="Ostatak za platiti" value={`${reservation.remaining_amount} ${reservation.currency}`} highlight />
              )}
            </Section>

            {/* Timestamps */}
            {reservation.approved_at && (
              <Section title="Status">
                <Row label="Odobreno" value={formatDateTime(reservation.approved_at)} />
                {reservation.voucher_sent_at && (
                  <Row label="Vaučer poslan" value={formatDateTime(reservation.voucher_sent_at)} />
                )}
              </Section>
            )}

            {reservation.admin_notes && (
              <Section title="Napomene admina">
                <div style={{ fontSize: 14, color: "#374151", padding: "4px 0" }}>
                  {reservation.admin_notes}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "20px 24px",
      border: "1px solid #e5e7eb",
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase" as const,
        color: "#1e4d4d",
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: "1px solid #e5f0f0",
      }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
      <div style={{ fontSize: 13, color: "#6b7280", flexShrink: 0, minWidth: 160 }}>{label}</div>
      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: highlight ? "#b91c1c" : "#111827",
        textAlign: "right" as const,
      }}>
        {value}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sr-Latn-RS", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("sr-Latn-RS", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
