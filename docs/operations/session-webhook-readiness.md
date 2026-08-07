# Session Webhook Readiness

Production Daily attendance ingestion requires:

- `DAILY_API_KEY`;
- `DAILY_API_BASE_URL`;
- a non-empty `DAILY_WEBHOOK_SECRET`.

Startup environment validation fails when the production secret is missing.
Readiness/preflight should report only whether the secret is configured and
valid, never its value. Unsigned or invalidly signed Daily requests are rejected
in production. Development/test relaxation is explicit and must not be copied
into production configuration.

Rejected event reasons are recorded as safe metadata only. Provider signatures,
tokens, raw bodies, and secrets are never logged or returned by the Admin
attendance inspector. No Daily REST reconciliation or external provider call is
performed by the evidence normalization path.
