import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import {
  deleteCatalogItem,
  updateCatalogItem,
} from "@/lib/services/catalogService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  try {
    const body = await req.json();
    const item = await updateCatalogItem(code, body);
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Greška" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;
  try {
    await deleteCatalogItem(code);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Greška" },
      { status: 400 },
    );
  }
}
