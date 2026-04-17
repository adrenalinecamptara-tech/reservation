import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { deleteReservation } from "@/lib/services/reservationService";

/** POST /api/reservations/[id]/delete — Hard delete reservation + storage file */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteReservation(id);
  return NextResponse.json({ ok: true });
}
