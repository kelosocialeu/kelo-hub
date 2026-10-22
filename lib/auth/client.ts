import {
  JoseKey,
  Keyset,
  NodeOAuthClient,
  buildAtprotoLoopbackClientMetadata,
  type NodeSavedSession,
  type NodeSavedState,
  type OAuthClientMetadataInput,
} from "@atproto/oauth-client-node";

export const ATPROTO_SCOPE = "atproto";
const FALLBACK_PUBLIC_URL = "https://kelo-hub-alpha.onrender.com";
const PUBLIC_URL =
  process.env.APP_BASE_URL ||
  (process.env.NODE_ENV === "production" ? FALLBACK_PUBLIC_URL : undefined);

type OAuthGlobal = typeof globalThis & {
  __keloHubOAuthState?: Map<string, NodeSavedState>;
  __keloHubOAuthSessions?: Map<string, NodeSavedSession>;
  __keloHubOAuthClient?: NodeOAuthClient;
};

const runtime = globalThis as OAuthGlobal;
runtime.__keloHubOAuthState ??= new Map<string, NodeSavedState>();
runtime.__keloHubOAuthSessions ??= new Map<string, NodeSavedSession>();

function getClientMetadata(): OAuthClientMetadataInput {
  if (PUBLIC_URL) {
    return {
      client_id: `${PUBLIC_URL}/oauth-client-metadata.json`,
      client_name: "Kelo Hub Alpha",
      client_uri: PUBLIC_URL,
      redirect_uris: [`${PUBLIC_URL}/oauth/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: ATPROTO_SCOPE,
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      jwks_uri: `${PUBLIC_URL}/.well-known/jwks.json`,
      dpop_bound_access_tokens: true,
    };
  }

  return buildAtprotoLoopbackClientMetadata({
    scope: ATPROTO_SCOPE,
    redirect_uris: ["http://127.0.0.1:3000/oauth/callback"],
  });
}

async function getKeyset(): Promise<Keyset | undefined> {
  if (!PUBLIC_URL) return undefined;

  const privateKey = process.env.ATPROTO_OAUTH_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ATPROTO_OAUTH_PRIVATE_KEY must be configured for the deployed AT Protocol OAuth client.");
  }

  let jwk: unknown;
  try {
    jwk = JSON.parse(privateKey);
  } catch {
    throw new Error("ATPROTO_OAUTH_PRIVATE_KEY must contain a valid JSON JWK.");
  }

  return new Keyset([await JoseKey.fromJWK(jwk as Parameters<typeof JoseKey.fromJWK>[0])]);
}

export async function getOAuthClient(): Promise<NodeOAuthClient> {
  if (runtime.__keloHubOAuthClient) return runtime.__keloHubOAuthClient;

  runtime.__keloHubOAuthClient = new NodeOAuthClient({
    clientMetadata: getClientMetadata(),
    keyset: await getKeyset(),
    stateStore: {
      async get(key) {
        return runtime.__keloHubOAuthState?.get(key);
      },
      async set(key, value) {
        runtime.__keloHubOAuthState?.set(key, value);
      },
      async del(key) {
        runtime.__keloHubOAuthState?.delete(key);
      },
    },
    sessionStore: {
      async get(key) {
        return runtime.__keloHubOAuthSessions?.get(key);
      },
      async set(key, value) {
        runtime.__keloHubOAuthSessions?.set(key, value);
      },
      async del(key) {
        runtime.__keloHubOAuthSessions?.delete(key);
      },
    },
  });

  return runtime.__keloHubOAuthClient;
}

export async function getOAuthPublicJwks() {
  const privateKey = process.env.ATPROTO_OAUTH_PRIVATE_KEY;
  if (!privateKey) return { keys: [] };

  const jwk = JSON.parse(privateKey);
  const key = await JoseKey.fromJWK(jwk as Parameters<typeof JoseKey.fromJWK>[0]);
  return { keys: [key.publicJwk] };
}
