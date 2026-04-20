import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import {
  deleteReservationHold,
  getReservationHold,
  setReservationHoldStatus,
  updateReservationHold,
} from "@/lib/services/holdService";
import type { HoldStatus } from "@/lib/db/types";

async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const hold = await getReservationHold(id);
  return NextResponse.json(hold);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    if (body.status && typeof body.status === "string") {
      const updated = await setReservationHoldStatus(
        id,
        body.status as HoldStatus,
      );
      return NextResponse.json(updated);
    }

    const updated = await updateReservationHold(id, body);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await deleteReservationHold(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
