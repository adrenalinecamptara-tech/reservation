import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { approveReservation } from "@/lib/services/reservationService";

/** POST /api/reservations/[id]/approve — Approve reservation, generate PDF, send email */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reservation = await approveReservation(id, user.id);
  return NextResponse.json(reservation);
}
