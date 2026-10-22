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

## AT Protocol sign-in (Alpha)

- Uses the official `@atproto/oauth-client-node` SDK and the AT Protocol OAuth authorization-code flow.
- The public client metadata is served at `/oauth-client-metadata.json`; the callback is `/oauth/callback`.
- Only the `atproto` scope is requested for this first milestone. It confirms the account identity; it does not authorize reading posts, messages, or private account data.
- The current Alpha stores OAuth state and sessions in process memory. A Render restart, redeploy, or instance change can invalidate the session or interrupt login. Before broader testing, replace these stores with durable, protected storage and add rate limiting and automated OAuth flow tests.
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
- The current dashboard is only a static/client-side prototype; no authentication or persistence is implemented yet.

## Milestones

1. Bootstrap and responsive UI.
2. AT Protocol OAuth sign-in for Alpha testing (in-memory session store; not production-ready).
3. Authentication persistence and organization model.
4. Tenant isolation and roles.
5. OAuth connector framework and provider permission screens.
6. One provider integration selected based on official API access.
7. Unified inbox and notifications.
8. Security review, backup/restore test, and private pilot.
