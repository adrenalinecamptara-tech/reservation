import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { updatePackage } from "@/lib/services/packageService";

/** PATCH /api/packages/[id] — admin only */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  try {
    const pkg = await updatePackage(id, body);
    return NextResponse.json(pkg);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
