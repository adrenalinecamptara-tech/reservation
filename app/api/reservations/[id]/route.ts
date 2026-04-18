import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import {
  getReservation,
  updateReservation,
  cancelReservation,
} from "@/lib/services/reservationService";
import { getAvailableUnits, deriveDeparture } from "@/lib/services/calendarService";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/** GET /api/reservations/[id] */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const reservation = await getReservation(id);
  return NextResponse.json(reservation);
}

/** PATCH /api/reservations/[id] — Update reservation (cabin, notes, etc.) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.cabin_id && body.floor) {
    const current = await getReservation(id);
    const arrival = body.arrival_date ?? current.arrival_date;
    const departureRaw = body.departure_date ?? current.departure_date;
    const pkgType = body.package_type ?? current.package_type;
    const departure = deriveDeparture(arrival, departureRaw, pkgType);
    const units = await getAvailableUnits(arrival, departure, id);
    const target = units.find((u) => u.cabin_id === body.cabin_id && u.floor === body.floor);
    if (target && !target.available && target.conflict) {
      return NextResponse.json(
        {
          error: `Jedinica je zauzeta (${target.conflict.first_name} ${target.conflict.last_name}, ${target.conflict.arrival} → ${target.conflict.departure}). Izaberi drugu.`,
        },
        { status: 409 }
      );
    }
  }

  const reservation = await updateReservation(id, body);
  return NextResponse.json(reservation);
}

/** DELETE /api/reservations/[id] — Cancel reservation */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reservation = await cancelReservation(id, body.reason);
  return NextResponse.json(reservation);
}
