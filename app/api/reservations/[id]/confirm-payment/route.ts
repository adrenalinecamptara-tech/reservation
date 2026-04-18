import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { confirmPayment } from "@/lib/services/reservationService";

/** POST /api/reservations/[id]/confirm-payment — Worker confirms in-person payment */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const reservation = await confirmPayment(id, user.email ?? user.id);
    return NextResponse.json(reservation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška pri potvrdi plaćanja";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
