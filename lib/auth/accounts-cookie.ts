import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const PRIMARY_DID_COOKIE = "kelo_hub_atproto_did";
export const LINK_INTENT_COOKIE = "kelo_hub_atproto_link_intent";
export const ACCOUNTS_COOKIE = "kelo_hub_atproto_accounts";
export const MAX_LINKED_ACCOUNTS = 25;

function signingKey(): Buffer {
  const secret = process.env.ATPROTO_OAUTH_PRIVATE_KEY;
  if (!secret) throw new Error("OAuth signing key is not configured.");
  return createHash("sha256").update(secret).digest();
}

function uniqueDids(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string =>
    typeof value === "string" && /^did:[a-z0-9]+:[A-Za-z0-9._:%-]{3,250}$/.test(value)
  ))].slice(0, MAX_LINKED_ACCOUNTS);
}

export function signAccountsCookie(dids: string[]): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, dids: uniqueDids(dids) })).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readAccountsCookie(value?: string): string[] | null {
  if (!value) return null;
  const [payload, suppliedSignature, extra] = value.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return null;
  try {
    const expected = createHmac("sha256", signingKey()).update(payload).digest();
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { v?: unknown; dids?: unknown };
    if (parsed.v !== 1 || !Array.isArray(parsed.dids)) return null;
    return uniqueDids(parsed.dids);
  } catch {
    return null;
  }
}

export function setAccountsCookie(response: { cookies: { set: (name: string, value: string, options: Record<string, unknown>) => unknown } }, dids: string[]) {
  response.cookies.set(ACCOUNTS_COOKIE, signAccountsCookie(dids), {
    httpOnly: true,
    secure: (process.env.APP_BASE_URL || "").startsWith("https://") || process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}
