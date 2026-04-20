import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { setReservationUnits, listReservationUnits } from "@/lib/services/cabinService";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const units = await listReservationUnits(id);
  return NextResponse.json(units);
}

/** PUT /api/reservations/[id]/units — replace all units atomically */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!Array.isArray(body.units)) {
    return NextResponse.json({ error: "units: array required" }, { status: 400 });
  }

  try {
    await setReservationUnits(id, body.units);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Greška pri čuvanju jedinica" },
      { status: 409 }
    );
  }

  const units = await listReservationUnits(id);
  return NextResponse.json({ units });
}
