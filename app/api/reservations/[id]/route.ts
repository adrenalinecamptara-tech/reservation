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

  // Auto-recompute computed_total ako se menja paket/datum/broj osoba/selections
  // a klijent nije eksplicitno poslao novi computed_total
  const triggersRecompute =
    body.computed_total === undefined &&
    (body.package_id !== undefined ||
      body.arrival_date !== undefined ||
      body.number_of_people !== undefined ||
      body.selections !== undefined);
  if (triggersRecompute) {
    try {
      const current = await getReservation(id);
      const pkgId = body.package_id ?? current.package_id;
      const arrival = body.arrival_date ?? current.arrival_date;
      const people = body.number_of_people ?? current.number_of_people;

      // Ako se menja paket — resetuj day_schedule_snapshot i selections
      // (stare adrese su nevalidne za novi paket).
      const packageChanged =
        body.package_id !== undefined && body.package_id !== current.package_id;

      const { createServiceClient } = await import("@/lib/db/supabase");
      const { data: pkg } = pkgId
        ? await createServiceClient()
            .from("packages")
            .select("*")
            .eq("id", pkgId)
            .single()
        : { data: null };

      let selections = body.selections ?? current.selections ?? null;
      let snapshot =
        body.day_schedule_snapshot ?? current.day_schedule_snapshot ?? null;
      if (packageChanged && pkg) {
        snapshot = pkg.day_schedule ?? null;
        selections = {};
        body.selections = selections;
        body.day_schedule_snapshot = snapshot;
        body.package_type = pkg.name;
      }

      if (pkg && arrival && people) {
        const { listCatalog } = await import("@/lib/services/catalogService");
        const { computeQuote, isWeekendArrival } = await import(
          "@/lib/services/pricingService"
        );
        const catalog = await listCatalog(true);
        const accommodationType =
          body.accommodation_type ?? current.accommodation_type ?? "bungalow";
        const quote = computeQuote({
          pkg,
          catalog,
          selections,
          weekend: isWeekendArrival(arrival),
          people,
          scheduleOverride: snapshot,
          accommodationType,
        });
        body.computed_total = quote.total;
      }
    } catch (err) {
      console.error("[PATCH reservations] recompute failed:", err);
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
