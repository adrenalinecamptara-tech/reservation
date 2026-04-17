import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "path";
import type { Reservation } from "@/lib/db/types";

// Background image path (server-side absolute path)
const BG_PATH = path.join(
  process.cwd(),
  "public/voucher-assets/voucher-background.png",
);

Font.register({
  family: "NotoSans",
  fonts: [
    {
      src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"),
      fontWeight: "normal",
    },
    {
      src: path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"),
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    width: "210mm",
    height: "310mm",
    position: "relative",
    fontFamily: "NotoSans",
  },
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Title — VAUČER
  title: {
    position: "absolute",
    top: 205,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 78,
    fontWeight: "bold",
    color: "#1e4d4d",
    letterSpacing: 2,
  },
  // Subtitle — PROMOCIJA MAJ 2026
  subtitle: {
    position: "absolute",
    top: 295,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 30,
    fontWeight: "bold",
    color: "#1e4d4d",
    letterSpacing: 5,
  },
  // Activity
  activity: {
    position: "absolute",
    top: 350,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "bold",
    color: "#1e4d4d",
  },
  // Deposit paid
  presale: {
    position: "absolute",
    top: 383,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#c41e3a",
  },
  // Remaining at arrival
  remaining: {
    position: "absolute",
    top: 407,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e4d4d",
  },
  // Included
  included: {
    position: "absolute",
    top: 433,
    left: 80,
    right: 80,
    textAlign: "center",
    fontSize: 13,
    color: "#1e4d4d",
  },
  // Form fields container
  fields: {
    position: "absolute",
    top: 467,
    left: 60,
    right: 60,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e4d4d",
    width: 175,
  },
  fieldValueContainer: {
    flex: 1,
    marginLeft: 8,
    borderBottom: "1.5pt solid #1e4d4d",
    paddingBottom: 2,
  },
  fieldValue: {
    fontSize: 13,
    color: "#1e4d4d",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 16,
    left: 60,
    right: 60,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  footerLeft: {
    flex: 1,
  },
  footerText: {
    fontSize: 11,
    color: "#1e4d4d",
    marginBottom: 2,
  },
  footerRow: {
    flexDirection: "row",
    gap: 8,
  },
  footerBold: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e4d4d",
  },
  qrCode: {
    width: 70,
    height: 70,
  },
});

interface Props {
  reservation: Reservation;
  qrCodeDataUrl: string;
  packageIncludes?: string;
}

// NFC normalization ensures precomposed glyphs (Č, Š, Ž...) are used
// instead of decomposed form (C + combining caron), which fixes rendering
// and copy-paste in @react-pdf/renderer / fontkit / pdfkit.
const n = (s: string) => s.normalize("NFC");

export function VoucherDocument({
  reservation,
  qrCodeDataUrl,
  packageIncludes,
}: Props) {
  const fullName = n(`${reservation.first_name} ${reservation.last_name}`);

  // Format date nicely
  const arrivalDate = reservation.arrival_date
    ? new Date(reservation.arrival_date).toLocaleDateString("sr-Latn-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  // Validity: arrival date + 1 day (can be adjusted)
  const validUntil = reservation.arrival_date
    ? new Date(
        new Date(reservation.arrival_date).getTime() + 3 * 24 * 60 * 60 * 1000,
      ).toLocaleDateString("sr-Latn-RS", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const packageLabel =
    reservation.package_type ?? "Aktivni Rafting Vikend na Tari";

  return (
    <Document>
      <Page size={[595, 878]} style={styles.page}>
        {/* Background image */}
        <Image src={BG_PATH} style={styles.bg} />

        {/* Title */}
        <Text style={styles.title}>{n("VAUČER")}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{n("REZERVACIJA 2026")}</Text>

        {/* Activity */}
        <Text style={styles.activity}>{n(packageLabel)}</Text>

        {/* Deposit paid */}
        <Text style={styles.presale}>
          {n(
            `Depozit plaćen: ${reservation.deposit_amount} ${reservation.currency}`,
          )}
        </Text>

        {/* Remaining at arrival */}
        {reservation.remaining_amount != null && (
          <Text style={styles.remaining}>
            {n(
              `Plaćanje pri dolasku: ${reservation.remaining_amount} ${reservation.currency}`,
            )}
          </Text>
        )}

        {/* Included */}
        <Text style={styles.included}>
          {n(
            `Uključeno: ${packageIncludes ?? "Rafting, 2 noćenja, 2 doručka, 1 ručak, žurka i bend"}`,
          )}
        </Text>

        {/* Form fields */}
        <View style={styles.fields}>
          <FieldRow label="Email:" value={reservation.email} />
          <FieldRow label={n("Broj telefona:")} value={reservation.phone} />
          <FieldRow label={n("Ime i prezime:")} value={fullName} />
          <FieldRow
            label={n("Br. lične karte/pasoša:")}
            value={reservation.id_card_number}
          />
          <FieldRow
            label={n("Broj vaučera:")}
            value={n(reservation.verify_code ?? "")}
          />
          <FieldRow
            label={n("Ref. broj:")}
            value={n(reservation.voucher_number ?? "")}
          />
          <FieldRow label={n("Datum dolaska:")} value={arrivalDate} />
          <FieldRow label={n("Važi do:")} value={validUntil} />
          <FieldRow
            label={n("Broj ljudi:")}
            value={String(reservation.number_of_people)}
          />
          <FieldRow label={n("Kamp menadžer:")} value={n("Milan Popović")} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>
                {n("Adresa:")}{" "}
                <Text style={styles.footerBold}>
                  {n("9R74+WF4, Bastasi, Bosna i Hercegovina")}
                </Text>
              </Text>
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Email: </Text>
                <Text style={styles.footerBold}>info@adrenalinetara.com</Text>
                <Text style={styles.footerText}> | </Text>
                <Text style={styles.footerBold}>+38163315829</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>SWIFT: </Text>
                <Text style={styles.footerBold}>NOBIBA22</Text>
                <Text style={styles.footerText}> | IBAN: </Text>
                <Text style={styles.footerBold}>BA395500005617164</Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Banka: </Text>
                <Text style={styles.footerBold}>
                  NOVA BANKA A.D. BANJA LUKA
                </Text>
              </View>
            </View>
            <Image src={qrCodeDataUrl} style={styles.qrCode} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

// Helper component
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueContainer}>
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
    </View>
  );
}
