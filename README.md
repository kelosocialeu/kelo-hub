# Kelo Hub

Kelo Hub is a private prototype for centralizing an organization's approved business tools, subsidiaries, messages, and notifications in one workspace.

## Status

**Early prototype — not production-ready.** Database persistence, server-side session hardening, organization authorization, tenant isolation tests, and audit logging are still required before handling sensitive production data. AT Protocol sign-in currently follows Kelo Social's direct PDS login pattern and stores session tokens in browser localStorage.

## Stack

- Next.js App Router
- React
- TypeScript
- CSS with responsive dashboard layout
- Designed to be deployed on Render

## Local development

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` (no secrets are required for the current UI).
4. Run `npm run dev`.
5. Open http://localhost:3000.

## Initial roadmap

1. Organization-aware authentication and membership (the current sign-in only verifies an AT Protocol account).
2. Organization, subsidiary, team, and role management.
3. Database schema and strict tenant isolation.
4. OAuth connection framework for approved providers.
5. Notifications and unified inbox.
6. Security review and Render deployment.

## Security principles

- Never ask users to paste third-party passwords or one-time codes into Kelo Hub.
- Use provider-supported OAuth authorization flows and request minimum scopes.
- Keep access tokens server-side, encrypted at rest, and revocable.
- Enforce organization-level access control on every server-side operation.
- Never commit secrets, tokens, production data, or real customer credentials.
- Do not claim a provider integration works until it has been implemented and tested against its official API.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
