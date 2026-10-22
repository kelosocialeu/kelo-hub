import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { APP_BASE_URL, getOAuthClient } from "@/lib/auth/client";
import {
  ACCOUNTS_COOKIE,
  LINK_INTENT_COOKIE,
  MAX_LINKED_ACCOUNTS,
  PRIMARY_DID_COOKIE,
  readAccountsCookie,
  setAccountsCookie,
} from "@/lib/auth/accounts-cookie";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const client = await getOAuthClient();
    const { session } = await client.callback(request.nextUrl.searchParams);
    const cookieStore = await cookies();
    const linking = cookieStore.get(LINK_INTENT_COOKIE)?.value === "link";
    const primaryDid = cookieStore.get(PRIMARY_DID_COOKIE)?.value;
    const response = NextResponse.redirect(new URL(linking ? "/?atproto=account_linked" : "/", APP_BASE_URL));

    if (linking) {
      if (!primaryDid?.startsWith("did:")) {
        await client.revoke(session.did).catch(() => undefined);
        const failed = NextResponse.redirect(new URL("/?atproto=link_failed", APP_BASE_URL));
        failed.cookies.set(LINK_INTENT_COOKIE, "", { httpOnly: true, secure: APP_BASE_URL.startsWith("https://"), sameSite: "lax", maxAge: 0, path: "/" });
        return failed;
      }
      await client.restore(primaryDid);
      const previous = readAccountsCookie(cookieStore.get(ACCOUNTS_COOKIE)?.value) ?? [primaryDid];
      const dids = [...new Set([primaryDid, ...previous, session.did])];
      if (dids.length > MAX_LINKED_ACCOUNTS) {
        await client.revoke(session.did).catch(() => undefined);
        const failed = NextResponse.redirect(new URL("/?atproto=link_limit", APP_BASE_URL));
        failed.cookies.set(LINK_INTENT_COOKIE, "", { httpOnly: true, secure: APP_BASE_URL.startsWith("https://"), sameSite: "lax", maxAge: 0, path: "/" });
        return failed;
      }
      setAccountsCookie(response, dids);
    } else {
      response.cookies.set(PRIMARY_DID_COOKIE, session.did, {
        httpOnly: true,
        secure: APP_BASE_URL.startsWith("https://"),
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      setAccountsCookie(response, [session.did]);
    }

    response.cookies.set(LINK_INTENT_COOKIE, "", {
      httpOnly: true,
      secure: APP_BASE_URL.startsWith("https://"),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?atproto=login_failed", APP_BASE_URL));
    response.cookies.set(LINK_INTENT_COOKIE, "", {
      httpOnly: true,
      secure: APP_BASE_URL.startsWith("https://"),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  }
}
