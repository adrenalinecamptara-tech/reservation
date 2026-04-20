import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import {
  createReservationHold,
  listReservationHolds,
} from "@/lib/services/holdService";
import type { Floor, HoldStatus } from "@/lib/db/types";

async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await listReservationHolds();
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getAdmin();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const hold = await createReservationHold({
      first_name: String(body.first_name ?? "").trim(),
      last_name: String(body.last_name ?? "").trim(),
      contact: String(body.contact ?? "").trim(),
      cabin_id: String(body.cabin_id),
      floor: body.floor as Floor,
      arrival_date: String(body.arrival_date),
      departure_date: String(body.departure_date),
      number_of_people: Number(body.number_of_people),
      hold_until_date: String(body.hold_until_date),
      notes: body.notes ?? null,
      status: (body.status as HoldStatus | undefined) ?? "active",
      created_by: user.email ?? user.id,
      units: Array.isArray(body.units)
        ? body.units.map(
            (unit: {
              cabin_id: string;
              floor: Floor;
              people_count: number;
            }) => ({
              cabin_id: String(unit.cabin_id),
              floor: unit.floor as Floor,
              people_count: Number(unit.people_count),
            }),
          )
        : undefined,
    });

    return NextResponse.json(hold);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
