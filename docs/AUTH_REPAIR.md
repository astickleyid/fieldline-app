# Verified-email authentication rollout

This patch replaces email-only sign-in and signup with an emailed 8-digit verification code. Existing account identities and CRM records stay intact. New accounts are created only after email verification. Existing demo seeding is retained for newly created accounts.

## Required configuration (do not commit values)

- `SESSION_PASSWORD`: a strong random secret of at least 32 characters; the former public development fallback is rejected.
- Existing Upstash Redis configuration.
- `RESEND_API_KEY`: authorized existing Resend account.
- `AUTH_EMAIL_FROM`: a sender on a domain verified in that Resend account.

Without configuration, sign-in fails closed with a setup/unavailable message. Do not deploy until verified sender, deliverability, and actual authorized end-to-end sign-in have been tested. Do not use an unverified default sender or fabricate a sender identity.

## Security behavior

- Codes expire after 10 minutes, have at most 5 attempts, and are HMAC-bound to random 256-bit challenge identifiers.
- Redis atomically consumes each proof once and retains attempt TTL. Limits: 5 email requests and 20 IP requests per 15 minutes.
- A secure HttpOnly same-site cookie binds the pending request to the initiating browser. POST origin validation prevents cross-origin sign-in requests.
- Unknown addresses and recipient-specific delivery failure receive the same response format. Response timing is not guaranteed indistinguishable.
- The new `fieldline_session_v2` cookie and auth version reject legacy unverified sessions. Everyone must verify email once after rollout.
- Account creation claims email and writes the user atomically, preventing concurrent verified signup from overwriting identity.
- No passwords or codes are returned in responses or logged.

## Validation

`node --experimental-strip-types --test tests/auth.test.mjs` (Node 22+)
`npx tsc --noEmit`
`npm run build`

The unit store models Redis behavior; these tests do not replace deployed Redis-script validation or real email/browser acceptance. Before rollout, use a permitted test inbox/account to verify login, signup, expiry, bad-code limit, repeated submission, old-session rejection and logout. Ensure server origin matches the deployed URL and Vercel's trusted client-IP header is present. Do not log into another person's account.

## Recovery

Retain the old code for reference, but do not roll production back to email-only authentication. If email delivery fails, fix the sender/provider or keep access restricted. Session-cookie versioning intentionally signs old sessions out.
