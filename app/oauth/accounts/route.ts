import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/auth/client";
import { ACCOUNTS_COOKIE, PRIMARY_DID_COOKIE, readAccountsCookie, setAccountsCookie } from "@/lib/auth/accounts-cookie";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const primaryDid = cookieStore.get(PRIMARY_DID_COOKIE)?.value;
  if (!primaryDid?.startsWith("did:")) {
    return NextResponse.json({ error: "Connecte-toi d’abord à Kelo Hub." }, { status: 401 });
  }

  try {
    const client = await getOAuthClient();
    await client.restore(primaryDid);

    const saved = readAccountsCookie(cookieStore.get(ACCOUNTS_COOKIE)?.value);
    const dids = [...new Set([primaryDid, ...(saved ?? [])])].slice(0, 25);
    const accounts: Array<{ did: string; primary: boolean }> = [];

    for (const did of dids) {
      try {
        await client.restore(did);
        accounts.push({ did, primary: did === primaryDid });
      } catch {
        // Exclude expired or unavailable OAuth sessions from the visible list.
      }
    }

    const response = NextResponse.json({ accounts });
    setAccountsCookie(response, accounts.map(account => account.did));
    return response;
  } catch {
    return NextResponse.json({ error: "La session AT Protocol a expiré. Reconnecte-toi." }, { status: 401 });
  }
}
