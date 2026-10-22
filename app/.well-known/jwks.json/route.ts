import { NextResponse } from "next/server";
import { getOAuthPublicJwks } from "@/lib/auth/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const jwks = await getOAuthPublicJwks();
    return NextResponse.json(jwks, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch {
    return NextResponse.json({ keys: [] }, { status: 503 });
  }
}
