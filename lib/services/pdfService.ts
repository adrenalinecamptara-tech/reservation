import type { Reservation } from "@/lib/db/types";

/**
 * Generate a PDF voucher buffer for a reservation.
 * Uses @react-pdf/renderer to render server-side.
 */
export async function generateVoucher(reservation: Reservation): Promise<Buffer> {
  // Dynamic import to avoid issues with Next.js SSR/Edge runtime
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { VoucherDocument } = await import("@/lib/pdf/VoucherDocument");
  const React = await import("react");
  const QRCode = await import("qrcode");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify/${reservation.voucher_number}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 160,
    margin: 1,
    color: { dark: "#1e4d4d", light: "#ffffff" },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(VoucherDocument, { reservation, qrCodeDataUrl }) as any
  );

  return Buffer.from(pdfBuffer);
}
