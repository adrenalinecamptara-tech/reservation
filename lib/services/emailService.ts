import { Resend } from "resend";
import type { Reservation } from "@/lib/db/types";

// Lazily instantiated so the module can be imported without RESEND_API_KEY during build
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "rezervacije@adrenalinetara.com";
const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL ?? "milan@adrenalinetara.com";
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

  const { AdminNotificationEmail } = await import(
    "@/lib/email/templates/AdminNotificationEmail"
  );
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
  pdfBuffer: Buffer
): Promise<void> {
  console.log("[emailService] sendVoucherToGuest start", {
    from: FROM,
    to: reservation.email,
    reservationId: reservation.id,
    voucherNumber: reservation.voucher_number,
    pdfBufferSize: pdfBuffer.length,
    resendKeySet: !!process.env.RESEND_API_KEY,
  });

  const { GuestVoucherEmail } = await import(
    "@/lib/email/templates/GuestVoucherEmail"
  );
  const React = await import("react");

  const result = await getResend().emails.send({
    from: FROM,
    to: reservation.email,
    subject: `Vaš vaučer — Adrenaline Camp Tara (${reservation.voucher_number})`,
    react: React.createElement(GuestVoucherEmail, { reservation }),
    attachments: [
      {
        filename: `vaucer-${reservation.voucher_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  console.log("[emailService] sendVoucherToGuest result", JSON.stringify(result));
}

/**
 * Send updated voucher email to guest after admin edits a reservation.
 */
export async function sendUpdatedVoucherToGuest(
  reservation: Reservation,
  pdfBuffer: Buffer
): Promise<void> {
  console.log("[emailService] sendUpdatedVoucherToGuest start", {
    from: FROM,
    to: reservation.email,
    reservationId: reservation.id,
    voucherNumber: reservation.voucher_number,
    resendKeySet: !!process.env.RESEND_API_KEY,
  });

  const { GuestVoucherEmail } = await import(
    "@/lib/email/templates/GuestVoucherEmail"
  );
  const React = await import("react");

  const result = await getResend().emails.send({
    from: FROM,
    to: reservation.email,
    subject: `Izmjena rezervacije — Adrenaline Camp Tara (${reservation.voucher_number})`,
    react: React.createElement(GuestVoucherEmail, { reservation, isUpdate: true }),
    attachments: [
      {
        filename: `vaucer-${reservation.voucher_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  console.log("[emailService] sendUpdatedVoucherToGuest result", JSON.stringify(result));
}
