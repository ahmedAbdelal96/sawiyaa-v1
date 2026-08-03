# Sawiyaa Environment Configuration

This document describes ownership and safe deployment requirements. Examples
contain placeholders only; secrets belong in the deployment secret store.

## Ownership

- `DATABASE_CONFIG`: editable platform business policy, read through
  `ConfigRuntimeService`. This includes `platform.defaultLocale` (`ar` or
  `en`) and package/payment routing policy.
- `ENV_SECRET`: database URL credentials, JWT keys, provider API/webhook keys,
  SMTP passwords, Daily keys, and `CORPORATE_CODE_PEPPER`.
- `ENV_INFRASTRUCTURE`: service URLs, ports, CORS, provider mode/base URLs,
  callback URLs, and transport topology.
- `CODE_INVARIANT` or `USER_PREFERENCE`: stable safety rules and per-user
  locale/timezone preferences remain outside platform configuration.

There is no ENV fallback for `platform.defaultLocale`; request fallback is
resolved from the seeded Config catalog and safely falls back to Arabic only
while the catalog is unavailable during startup.

## Production requirements

Production must provide non-placeholder values for database/JWT credentials,
the selected mail provider, Daily video credentials, and the corporate code
pepper. Public and provider callback URLs must use HTTPS and must not target a
local host. Payment credentials remain ENV-only while provider enabled state
and routes are owned by the database payment control boundary.

Development OTP redirect/capture and delivery-bypass controls are never valid
in production. They must remain disabled outside explicit local/test use.

## Email

The active adapter is selected by `MAIL_PROVIDER`:

- `brevo` uses the Brevo HTTP API, `BREVO_API_KEY`, `BREVO_API_URL`, and a
  verified `MAIL_FROM` sender. SMTP variables are not used by this path.
- `smtp` uses `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`,
  `MAIL_PASS`, and `MAIL_FROM`.

OTP redirect and bypass behavior is handled by the notification service, not
by either provider adapter. The configured controls are development-only.

## Video and OAuth

Daily uses `DAILY_API_KEY` as a secret and `DAILY_API_BASE_URL` as
infrastructure. The API key is never returned to Web or Mobile. Google client
IDs are public provider configuration; the client secret remains backend-only,
and the callback URL is environment-specific and HTTPS in production.

## Payments and redirects

Stripe and Paymob secrets, webhook keys, modes, and base URLs remain ENV-only.
Their enabled state, method registry, countries, and routing are read from the
dedicated database payment control. Paymob currency integration variables are
kept as compatibility aliases until every deployment has migrated to the
explicit currency-aware names.

Payment return URLs are validated as trusted same-application URLs. User
return URLs are origin-allowlisted and never used as an open redirect. The
normal session return path is generated from the configured application base
URL and the request locale, rather than a fixed `/ar` path.

## Credential rotation

Any credentials previously exposed in local/shared samples must be rotated
through provider dashboards or the secret manager: Google OAuth client secret,
Brevo API key, SMTP credentials, Daily API key, Paymob API/HMAC credentials,
Stripe secret/webhook keys, JWT signing keys, and the corporate pepper where
applicable. Values are intentionally not recorded here.

## Validation

The backend Zod environment schema validates shape and production safety.
Payment and notification modules perform provider-specific readiness checks at
startup without calling external providers. Run focused validation tests from
`sawiyaa-backend-v1`; do not run seed/bootstrap commands against production.

## Safe production initialization

The exact Config-only command is:

```bash
docker compose -f docker-compose.prod.yml run --rm \
  -e ALLOW_CONFIG_BOOTSTRAP=true \
  backend npm run db:bootstrap:config
```

Run it only after backup, preflight, and `prisma:migrate:deploy`. It is
additive and preserves existing catalog metadata, ConfigValue overrides, and
history. Payment routes use the separate explicit
`npm run db:bootstrap:payment-routes` command and must never be silently added
by Config bootstrap. The root `npm run prisma:seed` command is development
only and must not be used in production.
