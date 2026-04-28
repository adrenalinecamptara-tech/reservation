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
  const verifyUrl = `${appUrl}/verify/${reservation.verify_code ?? reservation.voucher_number}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 160,
    margin: 1,
    color: { dark: "#1e4d4d", light: "#ffffff" },
  });

  // Fetch package + day_schedule, plus catalog (za labelovanje selections-a)
  let packageIncludes: string | undefined;
  let pkgSchedule: Awaited<
    ReturnType<typeof import("@/lib/services/packageService").listPackages>
  >[number]["day_schedule"] = null;

  if (reservation.package_id) {
    const { createServiceClient } = await import("@/lib/db/supabase");
    const { data: pkg } = await createServiceClient()
      .from("packages")
      .select("includes, day_schedule")
      .eq("id", reservation.package_id)
      .single();
    packageIncludes = pkg?.includes ?? undefined;
    pkgSchedule = pkg?.day_schedule ?? null;
  }

  const { listCatalog } = await import("@/lib/services/catalogService");
  const catalog = await listCatalog(false).catch(() => []);

  // Merge: snapshot (struktura + choice pozicije) + description iz paketa
  // (paket pobeđuje da admin može da menja tekst i to se odmah vidi u PDF-u)
  const snapshot = reservation.day_schedule_snapshot ?? null;
  let effectiveSchedule = snapshot ?? pkgSchedule ?? null;
  if (snapshot && pkgSchedule) {
    effectiveSchedule = snapshot.map((d, i) => ({
      ...d,
      description: pkgSchedule![i]?.description ?? d.description,
    }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(
    React.createElement(VoucherDocument, {
      reservation,
      qrCodeDataUrl,
      packageIncludes,
      schedule: effectiveSchedule,
      catalog,
    }) as any
  );

  return Buffer.from(pdfBuffer);
}
