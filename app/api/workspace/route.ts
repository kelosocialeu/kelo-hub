import { Agent } from "@atproto/api";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { APP_BASE_URL, getOAuthClient } from "@/lib/auth/client";
import { ACCOUNTS_COOKIE, PRIMARY_DID_COOKIE, readAccountsCookie } from "@/lib/auth/accounts-cookie";

export const runtime = "nodejs";

type WorkspaceKind = "posts" | "messages" | "notifications";
type JsonRecord = Record<string, unknown>;

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).origin === new URL(APP_BASE_URL).origin;
  } catch {
    return false;
  }
}

async function getConnectedAgents() {
  const cookieStore = await cookies();
  const primaryDid = cookieStore.get(PRIMARY_DID_COOKIE)?.value;
  if (!primaryDid?.startsWith("did:")) throw new Error("Connecte-toi à Kelo Hub.");
  const allowed = readAccountsCookie(cookieStore.get(ACCOUNTS_COOKIE)?.value) ?? [primaryDid];
  const dids = [...new Set([primaryDid, ...allowed])].slice(0, 25);
  const client = await getOAuthClient();
  const connected: Array<{ did: string; agent: Agent }> = [];
  for (const did of dids) {
    try {
      const session = await client.restore(did);
      connected.push({ did, agent: new Agent(session) });
    } catch {
      // Skip expired sessions; never invent a connected account.
    }
  }
  if (!connected.length) throw new Error("Aucune session AT Protocol active. Reconnecte un compte.");
  return connected;
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erreur du service distant.";
  return message.slice(0, 240);
}

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") as WorkspaceKind | null;
  if (!kind || !["posts", "messages", "notifications"].includes(kind)) {
    return NextResponse.json({ error: "Type de synchronisation invalide." }, { status: 400 });
  }
  const markSeen = request.nextUrl.searchParams.get("markSeen") === "true";
  const convoId = request.nextUrl.searchParams.get("convoId");
  try {
    const accounts = await getConnectedAgents();
    const results = await Promise.all(accounts.map(async ({ did, agent }) => {
      try {
        if (kind === "posts") {
          const result = await agent.app.bsky.feed.getAuthorFeed({ actor: did, limit: 30 });
          return { did, items: result.data.feed.map(item => ({ ...item, accountDid: did })) };
        }
        if (kind === "notifications") {
          if (markSeen) await agent.app.bsky.notification.updateSeen({ seenAt: new Date().toISOString() });
          const result = await agent.app.bsky.notification.listNotifications({ limit: 50 });
          return { did, items: result.data.notifications.map(item => ({ ...item, accountDid: did })) };
        }
        if (convoId) {
          const result = await agent.chat.bsky.convo.getMessages({ convoId, limit: 50 });
          return { did, convoId, messages: result.data.messages };
        }
        const result = await agent.chat.bsky.convo.listConvos({ limit: 50 });
        return { did, items: result.data.convos.map(item => ({ ...item, accountDid: did })) };
      } catch (error) {
        return { did, items: [], error: safeError(error) };
      }
    }));
    return NextResponse.json({ kind, syncedAt: new Date().toISOString(), results });
  } catch (error) {
    return NextResponse.json({ error: safeError(error) }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  let body: JsonRecord;
  try {
    body = await request.json() as JsonRecord;
  } catch {
    return NextResponse.json({ error: "Requête JSON invalide." }, { status: 400 });
  }
  const action = body.action;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > 3000) {
    return NextResponse.json({ error: "Le texte doit contenir entre 1 et 3 000 caractères." }, { status: 400 });
  }

  try {
    const accounts = await getConnectedAgents();
    if (action === "publish") {
      const requested = Array.isArray(body.accountDids) ? body.accountDids.filter((did): did is string => typeof did === "string") : [];
      const targets = accounts.filter(account => requested.includes(account.did));
      if (!targets.length) return NextResponse.json({ error: "Sélectionne au moins un compte connecté." }, { status: 400 });
      const outcomes = await Promise.all(targets.map(async ({ did, agent }) => {
        try {
          const result = await agent.com.atproto.repo.createRecord({
            repo: did,
            collection: "app.bsky.feed.post",
            record: { $type: "app.bsky.feed.post", text, createdAt: new Date().toISOString() },
          });
          return { did, success: true, uri: result.data.uri };
        } catch (error) {
          return { did, success: false, error: safeError(error) };
        }
      }));
      return NextResponse.json({ outcomes, success: outcomes.some(outcome => outcome.success) });
    }

    if (action === "message") {
      const did = typeof body.accountDid === "string" ? body.accountDid : "";
      const convoId = typeof body.convoId === "string" ? body.convoId : "";
      const account = accounts.find(candidate => candidate.did === did);
      if (!account || !convoId) return NextResponse.json({ error: "Conversation ou compte invalide." }, { status: 400 });
      const result = await account.agent.chat.bsky.convo.sendMessage({
        convoId,
        message: { text },
      });
      return NextResponse.json({ success: true, message: result.data.message });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: safeError(error) }, { status: 401 });
  }
}
