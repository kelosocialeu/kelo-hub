import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/auth/client";

export const runtime = "nodejs";

export async function GET() {
  const client = await getOAuthClient();
  return NextResponse.json(client.clientMetadata, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
