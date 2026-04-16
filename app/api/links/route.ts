import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { generateInviteLink, listLinks } from "@/lib/services/linkService";

/** GET /api/links — List all invite links (admin only) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await listLinks();
  return NextResponse.json(links);
}

/** POST /api/links — Generate a new invite link (admin only) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { notes, expiresInHours } = body;

  const link = await generateInviteLink({
    createdBy: user.id,
    notes,
    expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    ...link,
    url: `${appUrl}/register/${link.token}`,
  });
}
