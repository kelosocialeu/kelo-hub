import { AtpAgent } from "@atproto/api";

export type KeloHubAtpSession = {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
  pdsUrl: string;
};

const STORAGE_KEY = "kelo_hub_atproto_session";
const BLUESKY_ENTRYWAY = "https://bsky.social";
const LOGIN_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), LOGIN_TIMEOUT_MS);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

function saveSession(session: KeloHubAtpSession) {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getStoredAtprotoSession(): KeloHubAtpSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as KeloHubAtpSession;
    return session?.did && session?.handle && session?.pdsUrl && session?.accessJwt && session?.refreshJwt ? session : null;
  } catch { return null; }
}

export function logoutAtproto() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}

function normalizeIdentifier(value: string) {
  return value.trim().replace(/^@/, "").toLowerCase();
}

async function resolveDid(identifier: string): Promise<string> {
  if (identifier.startsWith("did:plc:") || identifier.startsWith("did:web:")) return identifier;
  const url = new URL("https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle");
  url.searchParams.set("handle", identifier);
  const response = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Identifiant AT Protocol introuvable. Vérifie le handle ou le DID.");
  const data = await response.json() as { did?: unknown };
  if (typeof data.did !== "string" || !(data.did.startsWith("did:plc:") || data.did.startsWith("did:web:"))) {
    throw new Error("Le résolveur AT Protocol a retourné un DID invalide.");
  }
  return data.did;
}

async function resolvePds(did: string): Promise<string> {
  let url: string;
  if (did.startsWith("did:plc:")) url = `https://plc.directory/${encodeURIComponent(did)}`;
  else {
    const parts = did.slice("did:web:".length).split(":").map(part => decodeURIComponent(part));
    const host = parts.shift();
    if (!host) throw new Error("Le DID Web est invalide.");
    url = parts.length ? `https://${host}/${parts.map(encodeURIComponent).join("/")}/did.json` : `https://${host}/.well-known/did.json`;
  }
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Impossible de récupérer le document DID du compte.");
  const document = await response.json() as { id?: string; service?: Array<{ id?: string; type?: string | string[]; serviceEndpoint?: unknown }> };
  if (document.id !== did) throw new Error("Le document DID ne correspond pas à l'identité demandée.");
  const service = document.service?.find(item => {
    const types = Array.isArray(item.type) ? item.type : [item.type];
    return (item.id === "#atproto_pds" || item.id?.endsWith("#atproto_pds")) && types.includes("AtprotoPersonalDataServer") && typeof item.serviceEndpoint === "string";
  });
  if (typeof service?.serviceEndpoint !== "string") throw new Error("Aucun PDS AT Protocol valide n'est déclaré pour ce compte.");
  const pds = new URL(service.serviceEndpoint);
  if (pds.protocol !== "https:" || pds.username || pds.password || pds.pathname !== "/" && pds.pathname !== "") throw new Error("L'adresse du PDS n'est pas une origine HTTPS valide.");
  return pds.origin;
}

function loginServiceForPds(pdsUrl: string) {
  const hostname = new URL(pdsUrl).hostname.toLowerCase();
  return hostname === "bsky.social" || hostname.endsWith(".host.bsky.network") ? BLUESKY_ENTRYWAY : pdsUrl.replace(/\/$/, "");
}

function isEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }

export async function loginAtproto(identifierInput: string, password: string, authFactorToken = ""): Promise<KeloHubAtpSession> {
  const identifier = normalizeIdentifier(identifierInput);
  if (!identifier || !password) throw new Error("Saisis ton identifiant et ton mot de passe.");
  const discoveredPds = isEmail(identifier) ? null : await resolvePds(await resolveDid(identifier));
  const services = isEmail(identifier)
    ? Array.from(new Set([process.env.NEXT_PUBLIC_KELO_PDS_URL, "https://eurosky.social", BLUESKY_ENTRYWAY].filter(Boolean) as string[]))
    : [loginServiceForPds(discoveredPds!)];

  let lastError: unknown;
  for (const service of services) {
    const agent = new AtpAgent({
      service,
      persistSession: (_event, session) => {
        if (session?.accessJwt && session.refreshJwt && session.handle && session.did) {
          const pdsUrl = discoveredPds || getStoredAtprotoSession()?.pdsUrl || service;
          saveSession({ accessJwt: session.accessJwt, refreshJwt: session.refreshJwt, handle: session.handle, did: session.did, pdsUrl });
        }
      },
    });
    try {
      await withTimeout(agent.login({ identifier, password, ...(authFactorToken.trim() ? { authFactorToken: authFactorToken.trim() } : {}) } as Parameters<typeof agent.login>[0]), "Le serveur PDS met trop de temps à répondre. Réessaie.");
      if (!agent.session) throw new Error("Le PDS n'a pas retourné de session.");
      const pdsUrl = discoveredPds || await resolvePds(agent.session.did);
      const session: KeloHubAtpSession = {
        accessJwt: agent.session.accessJwt,
        refreshJwt: agent.session.refreshJwt,
        handle: agent.session.handle,
        did: agent.session.did,
        pdsUrl,
      };
      saveSession(session);
      return session;
    } catch (error) {
      lastError = error;
      const details = error as { message?: string; error?: string; response?: { data?: { error?: string } } };
      const message = String(details?.message || "");
      const errorCode = String(details?.error || details?.response?.data?.error || "");
      if (/AuthFactorTokenRequired|auth.?factor|verification code|login code/i.test(message + " " + errorCode)) {
        throw new Error("Un code de connexion a été envoyé par e-mail. Saisis-le puis réessaie.");
      }
    }
  }
  const message = String((lastError as { message?: string })?.message || "");
  if (/invalid.*(password|identifier)|authentication required|invalid login/i.test(message)) throw new Error("Identifiant ou mot de passe incorrect.");
  throw new Error(message || "Connexion AT Protocol impossible. Vérifie l'identifiant et le PDS associé.");
}
