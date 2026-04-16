import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { createReservation, listReservations } from "@/lib/services/reservationService";
import { validateToken } from "@/lib/services/linkService";
import { registrationSchema } from "@/lib/validations/registrationSchema";

/** GET /api/reservations — List reservations (admin only) */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const reservations = await listReservations({
    status: searchParams.get("status") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json(reservations);
}

/** POST /api/reservations — Guest submits registration form */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token je obavezan" }, { status: 400 });
  }

  // Validate token
  const inviteLink = await validateToken(token);
  if (!inviteLink) {
    return NextResponse.json(
      { error: "Link nije validan, istekao je ili je već iskorišćen" },
      { status: 410 }
    );
  }

  // Validate body
  const body = await req.json();
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nevažeći podaci", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const reservation = await createReservation(
    {
      ...parsed.data,
      invite_link_id: inviteLink.id,
      currency: "EUR",
    },
    token
  );

  return NextResponse.json(reservation, { status: 201 });
}
