import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { deletePartnerBooking } from "@/lib/services/partnerService";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await deletePartnerBooking(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Greška";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
