import { NextRequest, NextResponse } from "next/server";
import { getSignedUploadUrl } from "@/lib/services/storageService";
import { validateToken } from "@/lib/services/linkService";

/**
 * POST /api/upload — Returns a Supabase signed upload URL.
 * Requires a valid invite token so only guests with active links can upload.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token je obavezan" }, { status: 400 });
  }

  const inviteLink = await validateToken(token);
  if (!inviteLink) {
    return NextResponse.json({ error: "Nevažeći token" }, { status: 410 });
  }

  const body = await req.json();
  const { fileName, mimeType } = body;

  if (!fileName || !mimeType) {
    return NextResponse.json(
      { error: "fileName i mimeType su obavezni" },
      { status: 400 }
    );
  }

  // Allow only images and PDFs
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(mimeType)) {
    return NextResponse.json(
      { error: "Dozvoljeni formati: JPEG, PNG, WebP, PDF" },
      { status: 400 }
    );
  }

  const { signedUrl, storagePath } = await getSignedUploadUrl(fileName, mimeType);
  return NextResponse.json({ signedUrl, storagePath });
}
