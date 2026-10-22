import { NextRequest, NextResponse } from "next/server";
import { ATPROTO_SCOPE, getOAuthClient } from "@/lib/auth/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  try {
    const body: unknown = await request.json();
    const handle =
      typeof body === "object" && body !== null && "handle" in body &&
      typeof body.handle === "string"
        ? body.handle.trim()
        : "";

    if (!handle || handle.length > 253 || /\s/.test(handle)) {
      return NextResponse.json(
        { error: "Saisis un identifiant AT Protocol valide (handle ou DID)." },
        { status: 400 },
      );
    }

    const client = await getOAuthClient();
    const authUrl = await client.authorize(handle, { scope: ATPROTO_SCOPE });
    return NextResponse.json({ redirectUrl: authUrl.toString() });
  } catch {
    return NextResponse.json(
      { error: "Impossible de démarrer la connexion. Vérifie ton identifiant AT Protocol et réessaie." },
      { status: 400 },
    );
  }
}
