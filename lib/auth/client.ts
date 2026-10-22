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
export const APP_BASE_URL =
  process.env.APP_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://kelo-hub-alpha.onrender.com"
    : "http://127.0.0.1:3000");
const IS_PRODUCTION = process.env.NODE_ENV === "production";

type OAuthGlobal = typeof globalThis & {
  __keloHubOAuthState?: Map<string, NodeSavedState>;
  __keloHubOAuthSessions?: Map<string, NodeSavedSession>;
  __keloHubOAuthClient?: NodeOAuthClient;
};

const runtime = globalThis as OAuthGlobal;
runtime.__keloHubOAuthState ??= new Map<string, NodeSavedState>();
runtime.__keloHubOAuthSessions ??= new Map<string, NodeSavedSession>();

function getClientMetadata(): OAuthClientMetadataInput {
  if (IS_PRODUCTION) {
    return {
      client_id: `${APP_BASE_URL}/oauth-client-metadata.json`,
      client_name: "Kelo Hub Alpha",
      client_uri: APP_BASE_URL,
      redirect_uris: [`${APP_BASE_URL}/oauth/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: ATPROTO_SCOPE,
      application_type: "web",
      token_endpoint_auth_method: "private_key_jwt",
      token_endpoint_auth_signing_alg: "ES256",
      jwks_uri: `${APP_BASE_URL}/.well-known/jwks.json`,
      dpop_bound_access_tokens: true,
    };
  }

  return buildAtprotoLoopbackClientMetadata({
    scope: ATPROTO_SCOPE,
    redirect_uris: ["http://127.0.0.1:3000/oauth/callback"],
  });
}

async function getKeyset(): Promise<Keyset | undefined> {
  if (!IS_PRODUCTION) return undefined;

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
