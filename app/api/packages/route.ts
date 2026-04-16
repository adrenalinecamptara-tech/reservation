import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db/supabase";
import { listPackages, createPackage } from "@/lib/services/packageService";

/** GET /api/packages — public, returns active packages for guest form */
export async function GET() {
  const packages = await listPackages(true);
  return NextResponse.json(packages);
}

/** POST /api/packages — admin only, create new package */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const pkg = await createPackage(body);
  return NextResponse.json(pkg, { status: 201 });
}
