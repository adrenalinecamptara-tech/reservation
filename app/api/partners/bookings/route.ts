import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { createPartnerBooking } from "@/lib/services/partnerService";
import type { Floor } from "@/lib/db/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const booking = await createPartnerBooking({
      partner_id: String(body.partner_id),
      cabin_id: String(body.cabin_id),
      floor: body.floor as Floor,
      arrival_date: String(body.arrival_date),
      nights: Number(body.nights),
      number_of_people: Number(body.number_of_people),
      price_per_person: Number(body.price_per_person),
      notes: body.notes ?? null,
      package_id: body.package_id ? String(body.package_id) : null,
      created_by: user.email ?? user.id,
    });
    return NextResponse.json(booking);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
