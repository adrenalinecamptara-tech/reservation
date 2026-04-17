import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { Reservation } from "@/lib/db/types";

interface Props {
  reservation: Reservation;
  isUpdate?: boolean;
}

export function GuestVoucherEmail({ reservation, isUpdate = false }: Props) {
  const firstName = reservation.first_name;

  return (
    <Html>
      <Head />
      <Preview>
        {isUpdate
          ? `Izmjena rezervacije — Adrenaline Camp Tara (${reservation.voucher_number})`
          : `Vaučer potvrđen — Adrenaline Camp Tara čeka te ${reservation.arrival_date}`}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>Adrenaline Camp Tara</Heading>
            <Text style={headerSubtitle}>Vidimo se na reci.</Text>
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Heading as="h2" style={greeting}>
              {isUpdate
                ? `Izmjena potvrđena, ${firstName}!`
                : `Sve je potvrđeno, ${firstName}!`}
            </Heading>
            <Text style={body_text}>
              {isUpdate
                ? "Podaci tvoje rezervacije su izmijenjeni. U prilogu se nalazi ažurirani vaučer — zamijeni ga starim i donesi u kamp."
                : "Tvoja rezervacija je odobrena. U prilogu ovog mejla nalazi se tvoj vaučer — sačuvaj ga i donesi u kamp."}
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Summary */}
          <Section style={section}>
            <Heading as="h2" style={sectionTitle}>
              Rezime rezervacije
            </Heading>
            <Text style={dataRow}>
              <span style={label}>Datum dolaska:</span>{" "}
              <strong>{reservation.arrival_date}</strong>
            </Text>
            <Text style={dataRow}>
              <span style={label}>Broj osoba:</span>{" "}
              <strong>{reservation.number_of_people}</strong>
            </Text>
            <Text style={dataRow}>
              <span style={label}>Broj vaučera:</span>{" "}
              <strong>{reservation.verify_code}</strong>
            </Text>
            <Text style={dataRow}>
              <span style={label}>Ref. broj:</span>{" "}
              <strong>{reservation.voucher_number}</strong>
            </Text>
            <Text style={dataRow}>
              <span style={label}>Depozit plaćen:</span>{" "}
              <strong>
                {reservation.deposit_amount} {reservation.currency}
              </strong>
            </Text>
            {reservation.remaining_amount != null && (
              <Text style={dataRow}>
                <span style={label}>Ostatak za platiti pri dolasku:</span>{" "}
                <strong>
                  {reservation.remaining_amount} {reservation.currency}
                </strong>
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          {/* Schedule */}
          <Section style={section}>
            <Heading as="h2" style={sectionTitle}>
              Šta te čeka
            </Heading>
            <Text style={body_text}>
              <strong>Petak — Dolazak</strong>
              <br />
              Dodji kad možeš, sobe su spremne. Uveče večera, pa DJ i muzika u
              restoranu.
            </Text>
            <Text style={body_text}>
              <strong>Subota — Rafting dan</strong>
              <br />
              Doručak do 10h, polazak na rafting u 11h. Po povratku ručak,
              slobodno vreme, odbojka, bilijar. Uveče večera i živa muzika.
            </Text>
            <Text style={body_text}>
              <strong>Nedelja — Odlazak</strong>
              <br />
              Doručak, i polako se spremi za povratak u realnost prepun utiska i
              energije.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* What to bring */}
          <Section style={section}>
            <Heading as="h2" style={sectionTitle}>
              Šta poneti
            </Heading>
            <Text style={body_text}>
              Kupaći kostim, za muškarce bitno je da nije šorc nego kupaći uz
              telo da bi vam bilo udobnije u odelu.
            </Text>
            <Text style={body_text}>
              Nešto toplo za veče jer noći znaju da budu hladne,
            </Text>
            <Text style={body_text}>
              Ukoliko ne zelis da nosis cizmice za rafting moras poneti svoju
              obucu koja moze da se smoči
            </Text>
            <Text style={body_text}>
              I najvažnije od svega potrebno je poneti dobro raspoloženje :) Sve
              ostalo mi obezbeđujemo.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Contact */}
          <Section style={section}>
            <Text style={body_text}>
              Imaš pitanje? Javi se — tu smo.
              <br />
              📞 +38163315829
              <br />
              📧 info@adrenalinetara.com
              <br />
              📍{" "}
              <Link href="https://maps.app.goo.gl/TgCyfepwZ3zocam88" style={{ color: "#0ea5e9", textDecoration: "underline" }}>
                9R74+WF4, Bastasi, Bosna i Hercegovina
              </Link>
            </Text>
          </Section>

          <Text style={footer}>Adrenaline Camp Tara · Vidimo se na reci.</Text>
        </Container>
      </Body>
    </Html>
  );
}

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
const headerSubtitle = {
  color: "#a8d5d5",
  fontSize: "16px",
  margin: "0",
  fontStyle: "italic",
};
const section = { padding: "24px 40px" };
const greeting = { fontSize: "20px", color: "#1e4d4d", margin: "0 0 12px" };
const sectionTitle = { fontSize: "16px", color: "#1e4d4d", margin: "0 0 12px" };
const hr = { borderColor: "#e8e8e8", margin: "0" };
const body_text = {
  fontSize: "15px",
  color: "#333",
  lineHeight: "1.6",
  margin: "0 0 12px",
};
const label = { color: "#666" };
const dataRow = { fontSize: "15px", color: "#111", margin: "0 0 8px" };
const footer = {
  textAlign: "center" as const,
  fontSize: "12px",
  color: "#999",
  padding: "16px 40px 24px",
};
