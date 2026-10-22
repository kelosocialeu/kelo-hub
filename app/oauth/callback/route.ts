import { NextRequest, NextResponse } from "next/server";
import { APP_BASE_URL, getOAuthClient } from "@/lib/auth/client";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const client = await getOAuthClient();
    const { session } = await client.callback(request.nextUrl.searchParams);
    const response = NextResponse.redirect(new URL("/", APP_BASE_URL));

    response.cookies.set("kelo_hub_atproto_did", session.did, {
      httpOnly: true,
      secure: APP_BASE_URL.startsWith("https://"),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?atproto=login_failed", APP_BASE_URL));
  }
}
