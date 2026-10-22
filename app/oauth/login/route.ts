import { NextRequest, NextResponse } from "next/server";
import { ATPROTO_SCOPE, APP_BASE_URL, getOAuthClient } from "@/lib/auth/client";

export const runtime = "nodejs";

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  // Browser requests should include Origin. Compare against the configured public
  // URL rather than request.nextUrl.origin, which can reflect Render's internal
  // proxy scheme/host and incorrectly reject legitimate requests.
  if (!origin) return process.env.NODE_ENV !== "production";

  try {
    const suppliedOrigin = new URL(origin).origin;
    const configuredOrigin = new URL(APP_BASE_URL).origin;
    if (suppliedOrigin === configuredOrigin) return true;

    // Local development may use localhost or the loopback IP.
    if (process.env.NODE_ENV !== "production") {
      return ["http://localhost:3000", "http://127.0.0.1:3000"].includes(suppliedOrigin);
    }
  } catch {
    return false;
  }

  return false;
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée. Vérifie l’URL publique configurée pour Kelo Hub." }, { status: 403 });
  }

  try {
    const body: unknown = await request.json();
    const handle =
      typeof body === "object" && body !== null && "handle" in body &&
      typeof body.handle === "string"
        ? body.handle.trim()
        : "";

    if (!handle || handle.length > 253 || /\\s/.test(handle)) {
      return NextResponse.json(
        { error: "Saisis un handle ou un DID AT Protocol valide." },
        { status: 400 },
      );
    }

    // NodeOAuthClient resolves the handle/DID through AT Protocol discovery.
    // The user does not need to know or manually enter their PDS URL.
    const client = await getOAuthClient();
    const authUrl = await client.authorize(handle, { scope: ATPROTO_SCOPE });
    return NextResponse.json({ redirectUrl: authUrl.toString() });
  } catch {
    return NextResponse.json(
      { error: "Impossible de démarrer OAuth. Vérifie le handle/DID, la découverte du PDS et la configuration OAuth de Kelo Hub." },
      { status: 400 },
    );
  }
}
