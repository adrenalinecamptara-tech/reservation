import { Resend } from "resend";
import type { Reservation, ServiceCatalogItem } from "@/lib/db/types";
import type { PackageDay } from "@/lib/constants/activities";

/**
 * Učitaj day_schedule (snapshot + paket merge) + ceo catalog za render emaila.
 *
 * Snapshot čuvamo da bismo imali stabilnu poziciju choice slot-ova u trenutku
 * rezervacije, ali tekstualni opisi (description) idu iz aktuelnog paketa
 * — admin ih može menjati naknadno i to se reflektuje u svim email-ovima.
 */
async function loadScheduleContext(reservation: Reservation): Promise<{
  schedule: PackageDay[] | null;
  catalog: ServiceCatalogItem[];
}> {
  const { listCatalog } = await import("@/lib/services/catalogService");
  const catalog = await listCatalog(false).catch(() => []);

  let pkgSchedule: PackageDay[] | null = null;
  if (reservation.package_id) {
    const { createServiceClient } = await import("@/lib/db/supabase");
    const { data: pkg } = await createServiceClient()
      .from("packages")
      .select("day_schedule")
      .eq("id", reservation.package_id)
      .single();
    pkgSchedule = pkg?.day_schedule ?? null;
  }

  const snapshot = reservation.day_schedule_snapshot ?? null;

  // Merge: snapshot daje strukturu (meals/activities/choice slot pozicije),
  // paket daje description (admin može menjati naknadno → reflektuje se u
  // svakom novom email-u). Paket pobeđuje description; ako nema paketa
  // padamo na snapshot description-e.
  let schedule: PackageDay[] | null = snapshot ?? pkgSchedule;
  if (snapshot && pkgSchedule) {
    schedule = snapshot.map((d, i) => ({
      ...d,
      description: pkgSchedule![i]?.description ?? d.description,
    }));
  }
  return { schedule, catalog };
}

// Lazily instantiated so the module can be imported without RESEND_API_KEY during build
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "rezervacije@adrenalinetara.com";
const ADMIN_EMAIL =
  process.env.RESEND_ADMIN_EMAIL ?? "milan@adrenalinetara.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Send admin notification email when a guest submits the registration form.
 */
export async function notifyAdmin(reservation: Reservation): Promise<void> {
  console.log("[emailService] notifyAdmin start", {
    from: FROM,
    to: ADMIN_EMAIL,
    reservationId: reservation.id,
    resendKeySet: !!process.env.RESEND_API_KEY,
  });

  const { AdminNotificationEmail } =
    await import("@/lib/email/templates/AdminNotificationEmail");
  const React = await import("react");

  const result = await getResend().emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nova rezervacija — ${reservation.first_name} ${reservation.last_name}, ${reservation.arrival_date}, ${reservation.number_of_people} osoba`,
    react: React.createElement(AdminNotificationEmail, {
      reservation,
      adminUrl: `${APP_URL}/admin/reservations/${reservation.id}`,
    }),
  });

  console.log("[emailService] notifyAdmin result", JSON.stringify(result));
}

/**
 * Send voucher email to guest with PDF attachment.
 */
export async function sendVoucherToGuest(
  reservation: Reservation,
  pdfBuffer: Buffer,
): Promise<void> {
  console.log("[emailService] sendVoucherToGuest start", {
    from: FROM,
    to: reservation.email,
    reservationId: reservation.id,
    voucherNumber: reservation.voucher_number,
    pdfBufferSize: pdfBuffer.length,
    resendKeySet: !!process.env.RESEND_API_KEY,
  });

  const { GuestVoucherEmail } =
    await import("@/lib/email/templates/GuestVoucherEmail");
  const React = await import("react");
  const { schedule, catalog } = await loadScheduleContext(reservation);

  const result = await getResend().emails.send({
    from: FROM,
    to: reservation.email,
    subject: `Vaš vaučer - Adrenaline Camp Tara (${reservation.voucher_number})`,
    react: React.createElement(GuestVoucherEmail, {
      reservation,
      schedule,
      catalog,
    }),
    attachments: [
      {
        filename: `vaucer-${reservation.voucher_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  console.log(
    "[emailService] sendVoucherToGuest result",
    JSON.stringify(result),
  );
}

/**
 * Send updated voucher email to guest after admin edits a reservation.
 */
export async function sendUpdatedVoucherToGuest(
  reservation: Reservation,
  pdfBuffer: Buffer,
): Promise<void> {
  console.log("[emailService] sendUpdatedVoucherToGuest start", {
    from: FROM,
    to: reservation.email,
    reservationId: reservation.id,
    voucherNumber: reservation.voucher_number,
    resendKeySet: !!process.env.RESEND_API_KEY,
  });

  const { GuestVoucherEmail } =
    await import("@/lib/email/templates/GuestVoucherEmail");
  const React = await import("react");

  const { schedule, catalog } = await loadScheduleContext(reservation);
  const result = await getResend().emails.send({
    from: FROM,
    to: reservation.email,
    subject: `Izmjena rezervacije — Adrenaline Camp Tara (${reservation.voucher_number})`,
    react: React.createElement(GuestVoucherEmail, {
      reservation,
      isUpdate: true,
      schedule,
      catalog,
    }),
    attachments: [
      {
        filename: `vaucer-${reservation.voucher_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  console.log(
    "[emailService] sendUpdatedVoucherToGuest result",
    JSON.stringify(result),
  );
}
