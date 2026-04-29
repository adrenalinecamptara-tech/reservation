import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import {
  createReservation,
  listReservations,
} from "@/lib/services/reservationService";
import { validateToken } from "@/lib/services/linkService";
import { registrationSchema } from "@/lib/validations/registrationSchema";
import type { ReservationInsert } from "@/lib/db/types";

/** GET /api/reservations — List reservations (admin only) */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      { status: 410 },
    );
  }

  // Validate body
  const body = await req.json();
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nevažeći podaci", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Server-side recompute computed_total — ne oslanjamo se na klijenta
  // (kasniji bug fixovi/akomodacioni tip moraju da se odraze u DB).
  const accommodationType = parsed.data.accommodation_type ?? "bungalow";
  let computedTotal = parsed.data.computed_total ?? null;
  if (parsed.data.package_id && parsed.data.arrival_date) {
    try {
      const { createServiceClient } = await import("@/lib/db/supabase");
      const { data: pkg } = await createServiceClient()
        .from("packages")
        .select("*")
        .eq("id", parsed.data.package_id)
        .single();
      if (pkg) {
        const { listCatalog } = await import("@/lib/services/catalogService");
        const { computeQuote, isWeekendArrival } = await import(
          "@/lib/services/pricingService"
        );
        const catalog = await listCatalog(true);
        const quote = computeQuote({
          pkg,
          catalog,
          selections: parsed.data.selections ?? null,
          weekend: isWeekendArrival(parsed.data.arrival_date),
          people: parsed.data.number_of_people,
          scheduleOverride:
            (parsed.data.day_schedule_snapshot as
              | ReservationInsert["day_schedule_snapshot"]
              | null) ?? null,
          accommodationType,
        });
        computedTotal = quote.total;
      }
    } catch (err) {
      console.error("[POST reservations] server-side recompute failed:", err);
    }
  }

  const reservation = await createReservation(
    {
      ...parsed.data,
      invite_link_id: inviteLink.id,
      currency: "EUR",
      date_of_birth: parsed.data.date_of_birth,
      referral_source: parsed.data.referral_source,
      referral_source_other: parsed.data.referral_source_other,
      selections: parsed.data.selections ?? null,
      accommodation_type: accommodationType,
      day_schedule_snapshot:
        (parsed.data.day_schedule_snapshot as ReservationInsert["day_schedule_snapshot"]) ??
        null,
      computed_total: computedTotal,
    },
    token,
  );

  return NextResponse.json(reservation, { status: 201 });
}
