# Kelo Hub — architecture and security baseline

## Product boundaries

Kelo Hub is a multi-tenant workspace for an organization and its subsidiaries. Each provider connection must be explicitly authorized by an account owner or an administrator with the required permission. Connected services remain governed by their own provider terms and scopes.

## Proposed architecture

- **Web application:** Next.js App Router and TypeScript.
- **Authentication:** secure server-side session management, MFA support, and account recovery.
- **Data store:** PostgreSQL with explicit tenant ownership and migrations.
- **Provider integrations:** isolated connector modules implementing authorization, callback validation, scope tracking, token refresh where supported, webhook verification, and disconnect/revoke.
- **Background work:** bounded jobs for webhook processing and provider synchronization, with retry limits and idempotency.
- **Audit:** append-only security events for sign-ins, membership changes, provider connections, permission changes, and message sends.
- **Hosting:** Render web service; database provider to be chosen after checking current price, backups, region, and retention requirements.

## Tenant model (planned)

- organizations
- organization_memberships
- subsidiaries
- teams
- role_permissions
- provider_connections
- encrypted_provider_credentials
- webhook_subscriptions
- messages and notification metadata
- audit_events

Every tenant-owned row must include an organization identifier. All reads and writes must authorize the active organization server-side; hiding a UI control is not authorization. Add automated tests for cross-tenant access before onboarding external users.

## OAuth rules

1. Use the provider's documented authorization-code flow; use PKCE when supported and appropriate.
2. Validate state, callback URL, issuer, and redirect URI.
3. Request the minimum scopes needed for the selected feature.
4. Store tokens only on the server, encrypted at rest with managed secrets/keys.
5. Never expose provider access or refresh tokens to the browser.
6. Support disconnect, revocation, expiry, and reauthorization.
7. Verify webhook signatures and protect against replay.
8. Do not simulate integrations or claim success without an end-to-end provider test.

## AT Protocol sign-in

- Uses the official `@atproto/oauth-client-node` SDK and the AT Protocol OAuth authorization-code flow.
- The client metadata is served at `/oauth-client-metadata.json`; the callback is `/oauth/callback`; the public signing key set is served at `/.well-known/jwks.json`.
- Production uses the confidential-client profile with ES256 signing. Generate a private JWK with `npm run gen-key` and set it as the Render secret `ATPROTO_OAUTH_PRIVATE_KEY`. Never commit the value.
- Only the `atproto` scope is requested for this first milestone. It confirms the account identity; it does not authorize reading posts, messages, or private account data.
- The current prototype stores OAuth state and sessions in process memory. A Render restart, redeploy, or instance change can invalidate the session or interrupt login. Before broader testing, replace these stores with durable, protected storage and add rate limiting and automated OAuth flow tests.
- The UI must not describe an account as connected until the server restores a valid OAuth session.

## Credentials and one-time codes

Kelo Hub must not collect third-party account passwords or OTP codes. For sign-in to connected services, redirect users to the provider. Password management, if ever considered, must be a separately reviewed feature and must not be implemented as a way to bypass provider authentication.

## Initial security headers

The app sets baseline headers in `next.config.ts`. Before production, review a strict Content Security Policy, secure cookies, CSRF protection, rate limiting, abuse monitoring, dependency updates, and deployment secrets. Avoid unsafe inline script allowances.

## Deployment notes

- Build command: `npm ci && npm run build` when a lockfile is committed; otherwise `npm install && npm run build`.
- Start command: `npm start`.
- Runtime: Node.js 22.
- Do not add credentials to GitHub. Store production values in Render environment settings.
- For deployed AT Protocol OAuth, set `APP_BASE_URL` to the exact public URL configured for this Kelo Hub Render service and `ATPROTO_OAUTH_PRIVATE_KEY` in Render. The app refuses to initialize the production OAuth client if the private signing key is missing.
- The dashboard uses server-side AT Protocol OAuth session restoration, but the state/session stores are in-memory and therefore not durable across restarts or multiple instances.

## Milestones

1. Bootstrap and responsive UI.
2. AT Protocol OAuth sign-in for controlled testing (in-memory session store; not production-ready).
3. Authentication persistence and organization model.
4. Tenant isolation and roles.
5. OAuth connector framework and provider permission screens.
6. One provider integration selected based on official API access.
7. Unified inbox and notifications.
8. Security review, backup/restore test, and private pilot.


## Organization login and multiple AT Protocol accounts

The intended user flow is:
1. A person signs in using the AT Protocol identity of their organization/entity.
2. The server resolves that identity to an organization membership and role.
3. Only an authorized member is shown that organization's private admin workspace.
4. From that workspace, an authorized administrator can connect multiple AT Protocol accounts one by one through each account's own OAuth authorization.
5. Each connected account has its own DID, granted scopes, token/session state, connection status, and disconnect/revoke action. The post composer can target any subset of authorized accounts, e.g. accounts 1, 2 and 4 while excluding account 3.

Important: AT Protocol OAuth sign-in currently establishes a single identity only. It does **not** yet prove that the DID owns a company or that the person is authorized to administer an organization. Organization onboarding, membership verification, authorization checks, and multi-account OAuth storage must be implemented before treating this as a secure multi-tenant admin product. The current account selector and inbox/posting screens are UI prototypes with fictional data; reply and post buttons do not send network requests.

## Credential storage decision

Do not store OAuth access tokens, refresh tokens, private signing keys, or session credentials in AT Protocol records. AT Protocol is the identity/content network, not Kelo Hub's private credential vault; writing secrets to user-visible records would be unsafe and the protocol does not provide Kelo Hub with a private application-owned secret store.

Recommended approach:
- Use PostgreSQL for organization memberships, connected-account metadata, post drafts, scheduled jobs, inbox references, and audit events. Supabase Postgres is a reasonable choice for the prototype if its current pricing and region suit the project.
- Store OAuth credentials server-side only. Encrypt sensitive credential payloads before database persistence using authenticated encryption (for example AES-256-GCM) with the encryption key held only in Render environment secrets or a managed KMS—not in the same database row or repository.
- Use Supabase Row Level Security as defense in depth, but never rely on RLS alone: server routes must validate the authenticated session, organization membership, role, account ownership, and requested scopes for every operation. Keep the service-role key server-only.
- Prefer durable database-backed OAuth state/session storage with expiry and one-time state consumption. Add CSRF protection, rate limiting, audit logs, backup/restore testing, and revocation/disconnect handling.
- Never log tokens or return them to client-side JavaScript. Never ask for third-party account passwords or one-time codes; each account must authorize via its own official OAuth flow.
- For publishing, require the provider's actual write scope and confirm the AT Protocol API supports the requested operation. For DMs, replies, and mention processing, confirm the specific API and scope are available before promising full support; not all services expose every inbox feature through a standard public API.
- Store content and interaction data only to the extent needed, with a clear retention policy and user-initiated deletion/disconnect.

## UI prototype status (2026-10-22)

The dashboard includes an authentication gate, post-target selection UI, a draft list, and separate message/comment/mention workspaces. The AT Protocol account page now supports real additional-account OAuth consent and lists sessions that the server can restore. The signed account DID list is held in an HttpOnly cookie (currently limited to 25 accounts); OAuth state and session objects remain in process memory, so a Render restart may invalidate sessions. Inbox and publishing controls remain design scaffolding and do not send content.


## Current UI and OAuth milestone (2026-10-22)

The login form now redirects to the official AT Protocol OAuth authorization flow; Kelo Hub does not collect third-party passwords or one-time codes. The callback sets an HttpOnly cookie containing the active DID, and the server restores the OAuth session on dashboard load. OAuth requests currently use only the `atproto` scope for identity confirmation.

The settings screen stores user preferences in browser localStorage and displays the active OAuth identity. The “Comptes AT Protocol” admin section supports linking additional identities through their own OAuth consent and validates that the server can restore each linked session. It does not yet provide organization roles, durable database-backed account metadata, granular content scopes, or content synchronization. The dashboard does not yet synchronize or publish posts, messages, comments, or mentions.

Before production use, replace the in-memory OAuth state/session maps with durable protected storage and test the full flow against multiple PDS implementations.
