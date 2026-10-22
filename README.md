# Kelo Hub

Kelo Hub is an early-stage workspace prototype for organizing an organization's AT Protocol identities and future content workflows.

## Current status

- Public landing page, login screen, dashboard, and settings page.
- AT Protocol OAuth authorization-code flow using the official `@atproto/oauth-client-node` SDK.
- The account holder is redirected to their AT Protocol authorization service; Kelo Hub does not collect the account password or email verification code.
- OAuth callback and session restoration run server-side. The browser receives an HttpOnly session cookie; OAuth access/refresh tokens are kept in the server-side session store.
- OAuth consent currently requests only the `atproto` scope, which confirms identity. It does **not** grant permission to read or publish posts, access private messages, or manage other accounts.
- Settings preferences are saved in the current browser. Language preference and some future-action toggles are not yet connected to all product behavior.
- Multi-account management, durable session storage, organization membership/roles, content synchronization, publishing, inbox, comments, mentions, and persistent audit logs are not implemented yet.

**Not production-ready:** OAuth state and session stores currently use process memory. A Render restart, redeploy, or instance change may interrupt login or invalidate existing sessions. Do not onboard sensitive accounts until persistent encrypted storage, authorization checks, rate limiting, and end-to-end OAuth tests are in place.

## Stack

- Next.js App Router
- React and TypeScript
- `@atproto/oauth-client-node`
- Responsive CSS
- Render deployment target

## Local development

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Run `npm run dev`.
5. Open `http://127.0.0.1:3000`.

Local OAuth uses the AT Protocol loopback client. In production, configure the exact public base URL and a private signing key in Render.

## Render environment variables

- `APP_BASE_URL=https://kelo-hub-alpha.onrender.com` (or the actual public URL for the service).
- `ATPROTO_OAUTH_PRIVATE_KEY`: generate using `npm run gen-key`, then store the JSON output as a Render secret. Never commit the real key.

The OAuth client metadata endpoint is `/oauth-client-metadata.json`, the callback is `/oauth/callback`, and the public signing keys are exposed at `/.well-known/jwks.json`.

## Security principles

- Never ask users to paste third-party passwords or one-time codes into Kelo Hub.
- Request only the minimum OAuth scopes required for a feature.
- Keep access and refresh tokens server-side, encrypt them at rest in durable storage, and support revocation.
- Enforce organization membership and role checks on every server-side operation.
- Never commit secrets, tokens, production data, or customer credentials.
- Do not claim a provider integration works until it has been tested end to end against the official API.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
