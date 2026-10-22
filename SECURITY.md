# Security policy

Kelo Hub is an early private prototype and is not ready for production credentials or customer data.

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, tokens, personal data, or other sensitive information. Contact the project maintainer privately through the private GitHub repository.

## Current limitations

- No production authentication or authorization is implemented.
- No persistent database is connected.
- No OAuth provider is connected.
- No real messages or credentials should be entered.
- The dashboard currently displays illustrative, non-persistent UI state.

## Before a public pilot

- Implement and test organization-level access control.
- Add secure sessions, MFA options, rate limits, and abuse protection.
- Encrypt provider tokens at rest and keep them server-side.
- Verify OAuth state, redirect URI, scopes, token refresh, and revocation.
- Add tenant-isolation and authorization tests.
- Establish backup/restore procedures, retention rules, and an incident response process.
