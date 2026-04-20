import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { createPartner } from "@/lib/services/partnerService";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const partner = await createPartner({
      name: String(body.name).trim(),
      default_price_per_person: Number(body.default_price_per_person),
      notes: body.notes ?? null,
    });
    return NextResponse.json(partner);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
