import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { resendVoucher } from "@/lib/services/reservationService";

/** POST /api/reservations/[id]/resend — Regenerate PDF and resend updated voucher to guest */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const reservation = await resendVoucher(id);
    return NextResponse.json(reservation);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
