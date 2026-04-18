import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { getAvailableUnits } from "@/lib/services/calendarService";

/** GET /api/availability?arrival=YYYY-MM-DD&departure=YYYY-MM-DD&exclude=<id> */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const arrival = searchParams.get("arrival");
  const departure = searchParams.get("departure");
  const exclude = searchParams.get("exclude") ?? undefined;

  if (!arrival || !departure) {
    return NextResponse.json({ error: "arrival and departure are required" }, { status: 400 });
  }

  const units = await getAvailableUnits(arrival, departure, exclude);
  return NextResponse.json(units);
}
