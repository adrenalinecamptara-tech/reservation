import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import {
  listCatalog,
  upsertCatalogItem,
} from "@/lib/services/catalogService";

export async function GET(req: NextRequest) {
  const onlyActive = req.nextUrl.searchParams.get("active") === "1";
  const items = await listCatalog(onlyActive);
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const item = await upsertCatalogItem({
      code: String(body.code).trim(),
      label: String(body.label).trim(),
      category: body.category,
      emoji: body.emoji ?? null,
      unit: body.unit ?? "per_person",
      price: Number(body.price ?? 0),
      duration_hours:
        body.duration_hours == null ? null : Number(body.duration_hours),
      description: body.description ?? null,
      active: body.active ?? true,
      is_addon_eligible: body.is_addon_eligible ?? true,
      sort_order: Number(body.sort_order ?? 0),
    });
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Greška" },
      { status: 400 },
    );
  }
}
