import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { Reservation } from "@/lib/db/types";

interface Props {
  reservation: Reservation;
  adminUrl: string;
}

export function AdminNotificationEmail({ reservation, adminUrl }: Props) {
  const fullName = `${reservation.first_name} ${reservation.last_name}`;

  return (
    <Html>
      <Head />
      <Preview>
        {`Nova rezervacija — ${fullName}, ${reservation.arrival_date}, ${reservation.number_of_people} osoba`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>Adrenaline Camp Tara</Heading>
            <Text style={headerSubtitle}>Nova rezervacija</Text>
          </Section>

          {/* Guest data */}
          <Section style={section}>
            <Heading as="h2" style={sectionTitle}>
              Podaci gosta
            </Heading>
            <Row>
              <DataRow label="Ime i prezime" value={fullName} />
              <DataRow label="Email" value={reservation.email} />
              <DataRow label="Telefon" value={reservation.phone} />
              <DataRow label="Broj lične karte" value={reservation.id_card_number} />
            </Row>
          </Section>

          <Hr style={hr} />

          {/* Booking */}
          <Section style={section}>
            <Heading as="h2" style={sectionTitle}>
              Detalji rezervacije
            </Heading>
            <DataRow label="Datum dolaska" value={reservation.arrival_date} />
            <DataRow
              label="Broj osoba"
              value={String(reservation.number_of_people)}
            />
            {reservation.package_type && (
              <DataRow label="Paket" value={reservation.package_type} />
            )}
            <DataRow
              label="Broj vaučera"
              value={reservation.voucher_number ?? "—"}
            />
          </Section>

          <Hr style={hr} />

          {/* Financial */}
          <Section style={section}>
            <Heading as="h2" style={sectionTitle}>
              Finansije
            </Heading>
            <DataRow
              label="Depozit plaćen"
              value={`${reservation.deposit_amount} ${reservation.currency}`}
            />
            {reservation.remaining_amount != null && (
              <DataRow
                label="Ostatak za platiti"
                value={`${reservation.remaining_amount} ${reservation.currency}`}
              />
            )}
            {reservation.payment_proof_path && (
              <DataRow label="Dokaz o uplati" value="✓ Uploadovan" />
            )}
          </Section>

          <Hr style={hr} />

          {/* CTA */}
          <Section style={{ textAlign: "center", padding: "24px 0" }}>
            <Button href={adminUrl} style={button}>
              Pregledaj rezervaciju
            </Button>
          </Section>

          <Text style={footer}>
            Adrenaline Camp Tara · info@adrenalinetara.com · +38163315829
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <Row>
      <Text style={dataLabel}>{label}:</Text>
      <Text style={dataValue}>{value}</Text>
    </Row>
  );
}

// Styles
const body = { backgroundColor: "#f4f4f4", fontFamily: "Arial, sans-serif" };
const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
};
const header = {
  backgroundColor: "#1e4d4d",
  padding: "32px 40px",
  textAlign: "center" as const,
};
const headerTitle = { color: "#ffffff", fontSize: "24px", margin: "0 0 4px" };
const headerSubtitle = { color: "#a8d5d5", fontSize: "14px", margin: "0" };
const section = { padding: "24px 40px" };
const sectionTitle = { fontSize: "16px", color: "#1e4d4d", margin: "0 0 12px" };
const hr = { borderColor: "#e8e8e8", margin: "0" };
const dataLabel = {
  fontSize: "13px",
  color: "#666",
  margin: "0 0 2px",
  fontWeight: "600",
};
const dataValue = { fontSize: "15px", color: "#111", margin: "0 0 12px" };
const button = {
  backgroundColor: "#1e4d4d",
  color: "#ffffff",
  padding: "14px 32px",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "15px",
  textDecoration: "none",
  display: "inline-block",
};
const footer = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#999",
  padding: "16px 40px 24px",
};
