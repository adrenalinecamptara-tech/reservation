import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { getReservation } from "@/lib/services/reservationService";
import { generateVoucher } from "@/lib/services/pdfService";

/** GET /api/voucher/[id] — Stream PDF voucher for admin download. Regenerated on demand. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reservation = await getReservation(id);
  const pdfBuffer = await generateVoucher(reservation);

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vaucer-${reservation.voucher_number ?? reservation.id}.pdf"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
