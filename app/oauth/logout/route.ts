import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOAuthClient } from "@/lib/auth/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const did = cookieStore.get("kelo_hub_atproto_did")?.value;

  if (did?.startsWith("did:")) {
    try {
      const client = await getOAuthClient();
      await client.revoke(did);
    } catch {
      // Clear the local cookie even if the provider session is already expired.
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("kelo_hub_atproto_did", "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
