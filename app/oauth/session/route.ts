import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/auth/client";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const did = cookieStore.get("kelo_hub_atproto_did")?.value;

  if (!did || !did.startsWith("did:")) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const client = await getOAuthClient();
    const session = await client.restore(did);
    return NextResponse.json({ authenticated: true, did: session.did });
  } catch {
    const response = NextResponse.json({ authenticated: false });
    response.cookies.delete("kelo_hub_atproto_did");
    return response;
  }
}
