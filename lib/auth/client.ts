import {
  NodeOAuthClient,
  type NodeSavedSession,
  type NodeSavedState,
} from "@atproto/oauth-client-node";

export const ATPROTO_SCOPE = "atproto";
export const APP_BASE_URL = (
  process.env.APP_BASE_URL || "https://kelo-hub-alpha.onrender.com"
).replace(/\/$/, "");

type OAuthGlobal = typeof globalThis & {
  __keloHubOAuthState?: Map<string, NodeSavedState>;
  __keloHubOAuthSessions?: Map<string, NodeSavedSession>;
  __keloHubOAuthClient?: NodeOAuthClient;
};

const runtime = globalThis as OAuthGlobal;
runtime.__keloHubOAuthState ??= new Map<string, NodeSavedState>();
runtime.__keloHubOAuthSessions ??= new Map<string, NodeSavedSession>();

export async function getOAuthClient(): Promise<NodeOAuthClient> {
  if (runtime.__keloHubOAuthClient) return runtime.__keloHubOAuthClient;

  runtime.__keloHubOAuthClient = new NodeOAuthClient({
    clientMetadata: {
      client_id: `${APP_BASE_URL}/oauth-client-metadata.json`,
      client_name: "Kelo Hub Alpha",
      client_uri: APP_BASE_URL,
      redirect_uris: [`${APP_BASE_URL}/oauth/callback`],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: ATPROTO_SCOPE,
      application_type: "web",
      token_endpoint_auth_method: "none",
      dpop_bound_access_tokens: true,
    },
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
