import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { updatePartner, deletePartner } from "@/lib/services/partnerService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const partner = await updatePartner(id, {
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      default_price_per_person:
        body.default_price_per_person !== undefined
          ? Number(body.default_price_per_person)
          : undefined,
      notes: body.notes !== undefined ? body.notes : undefined,
    });
    return NextResponse.json(partner);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deletePartner(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
