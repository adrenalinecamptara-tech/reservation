import { NextRequest, NextResponse } from "next/server";
import { listCatalog } from "@/lib/services/catalogService";
import {
  computeQuote,
  isWeekendArrival,
} from "@/lib/services/pricingService";
import { createServiceClient } from "@/lib/db/supabase";
import type { Package } from "@/lib/db/types";
import type { Selections, PackageDay } from "@/lib/constants/activities";

interface Body {
  package_id: string;
  people: number;
  arrival_date?: string; // YYYY-MM-DD; ako nije zadato, uzima weekend_price
  weekend?: boolean;
  selections?: Selections;
  schedule_override?: PackageDay[]; // za custom builder
  accommodation_type?: "bungalow" | "tent";
}

/**
 * POST /api/pricing/quote — public (gost koristi tokom registracije)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.package_id || !body.people || body.people < 1) {
      return NextResponse.json(
        { error: "package_id i people su obavezni." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: pkgRow, error: pkgErr } = await supabase
      .from("packages")
      .select("*")
      .eq("id", body.package_id)
      .single();
    if (pkgErr || !pkgRow) {
      return NextResponse.json(
        { error: pkgErr?.message ?? "Paket nije pronađen" },
        { status: 404 },
      );
    }

    const catalog = await listCatalog(true);
    const weekend =
      body.weekend ??
      (body.arrival_date ? isWeekendArrival(body.arrival_date) : true);

    const quote = computeQuote({
      pkg: pkgRow as Package,
      catalog,
      selections: body.selections ?? null,
      weekend,
      people: body.people,
      scheduleOverride: body.schedule_override ?? null,
      accommodationType: body.accommodation_type ?? "bungalow",
    });

    return NextResponse.json({ quote, weekend });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Greška" },
      { status: 400 },
    );
  }
}
