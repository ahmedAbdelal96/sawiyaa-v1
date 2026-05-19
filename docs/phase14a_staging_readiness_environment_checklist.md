# Phase 14A - Staging Readiness Environment Checklist

## Executive Summary
Phase 13F established that Fayed is ready for staging/manual QA with caveats, not production. This report turns that into an environment and deployment checklist for staging.

The main staging prerequisites are:
- verify Prisma migration history/checksum on any existing DB
- run staging with `STEP_UP_ENABLED=true`
- configure Redis-backed throttling for production-like staging
- use sandbox-only finance, email, SMS, and Google auth settings
- provision the QA identities and seeded domain records
- confirm frontend and mobile API URLs point to staging-safe HTTPS endpoints

## Staging Readiness Verdict
**Ready for staging after listed prerequisites**

## Reports Reviewed
- [phase10_final_production_go_no_go.md](D:/Web/full-projects/fayed/docs/phase10_final_production_go_no_go.md)
- [phase13f_final_qa_consolidation_staging_readiness.md](D:/Web/full-projects/fayed/docs/phase13f_final_qa_consolidation_staging_readiness.md)
- [phase9b_prisma_migration_deployability_validation.md](D:/Web/full-projects/fayed/docs/phase9b_prisma_migration_deployability_validation.md)
- [phase9b_backend_production_blockers_remediation.md](D:/Web/full-projects/fayed/docs/phase9b_backend_production_blockers_remediation.md)
- [phase13a_testsprite_qa_seed_data.md](D:/Web/full-projects/fayed/docs/phase13a_testsprite_qa_seed_data.md)
- [phase13a_testsprite_qa_seed_execution_report.md](D:/Web/full-projects/fayed/docs/phase13a_testsprite_qa_seed_execution_report.md)

## Extracted Evidence

### Known staging blockers
- Existing DB migration checksum verification is required before relying on `prisma migrate deploy`.
- `STEP_UP_ENABLED=true` must be verified in staging.
- Redis throttling must be configured for multi-instance staging.
- Sandbox-only payment/email/SMS settings are required.
- Upload coverage was not fully revisited in Phase 13E.
- Mobile was not part of the web browser QA waves.

### Known production blockers
- No Phase 13 Critical or High functional blockers remained in the final QA consolidation.
- Production readiness still depends on environment correctness, migration checksum verification, sandbox provider setup, and mobile/step-up/upload validation.

### Required migration/checksum verification
- Verify the checksum/history for migration:
  - `20260418201500_repair_session_cancellation_policy_drift`
- Verify the full migration chain on the target staging DB with:
  - `npx prisma validate`
  - `npx prisma migrate status`
  - `npx prisma migrate deploy`
- If the checksum differs on an already-deployed DB, do not treat deploy as clean until the drift is resolved on a backup/snapshot-backed clone.

### Required QA accounts and seed data
QA identities confirmed in the local seed:
- `admin@hesba.local` / `Admin@12345`
- `qa.admin@hesba.local` / `AdminQa@12345`
- `support@hesba.local` / `Support@12345`
- `finance@hesba.local` / `Finance@12345`
- `reviewer@hesba.local` / `Reviewer@12345`
- `practitioner.reviewer@hesba.local` / `ReviewerQa@12345`
- `patient.ops@hesba.local` / `PatientOps@12345`
- `marketing@hesba.local` / `Marketing@12345`
- `ahmed.patient@hesba.local` / `Patient@12345`
- `mohamed.patient@hesba.local` / `Patient2@12345`
- `omar.patient@hesba.local` / `Patient3@12345`
- `dr.ahmed@hesba.local` / `Practitioner@12345`
- `dr.mohamed@hesba.local` / `Practitioner2@12345`
- `qa.target.admin@hesba.local` / `TargetAdmin@12345`
- `qa.super.admin.backup@hesba.local` / `BackupSuper@12345`

Seeded domain data confirmed:
- QA support ticket: `QA-SUPPORT-001`
- QA care chat request: `QA-CARE-001`
- QA session: `QA-SESSION-001`
- QA session payment: `qa-pay-ref-001`
- QA refund candidate linked to the session payment
- QA settlement batch: `qa-settlement-batch-egp`
- QA practitioner settlement
- QA practitioner payout
- QA package payment: `qa-package-pay-ref-001`
- QA package purchase linked to `SESSIONS_6`
- QA package settlement
- QA academy course: `qa-test-course-001`
- QA academy enrollment: `qa-academy-token-001`

### Required security config
- `STEP_UP_ENABLED=true`
- `STEP_UP_TTL_SECONDS=600`
- `AUTH_COOKIE_AUTH_ENABLED` and `AUTH_CSRF_ENFORCEMENT_ENABLED` must match the staging auth posture
- `AUTH_CSRF_COOKIE_NAME` and `AUTH_CSRF_HEADER_NAME` must be consistent between backend and frontend clients
- `AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV` should remain off for staging-like behavior
- `CORS_ORIGINS` must contain the actual staging frontend origins, not localhost-only entries

### Required third-party sandbox config
- Payments:
  - Stripe sandbox or disabled
  - Paymob sandbox/test only
  - webhook secrets and return URLs must point to staging-safe endpoints
- Email:
  - sandbox/test provider only
  - no real recipient delivery
- SMS:
  - sandbox/test provider only
  - no real recipient delivery
- Google auth:
  - staging-safe OAuth client IDs and origins
- Redis:
  - required for production-like throttling
- Optional video providers:
  - Daily / Zoom secrets only if the staging smoke plan exercises those flows

### Remaining coverage gaps
- Uploads were not fully re-opened in Phase 13E.
- Mobile was not fully browser-validated in the Phase 13 web QA waves.
- Some module mutation coverage remains broader than the exact smoke paths verified.

## Environment Variable Checklist

### 1. Database
- `DATABASE_URL`
- staging DB host/name
- SSL requirement for the target DB
- backup/snapshot requirement before migration deploy
- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma migrate deploy`
- checksum verification for `20260418201500_repair_session_cancellation_policy_drift`

### 2. Backend Auth / Sessions
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `JWT_ISSUER`
- `AUTH_PASSWORD_SALT_ROUNDS`
- `AUTH_OTP_CODE_LENGTH`
- `AUTH_LOGIN_OTP_TTL_MINUTES`
- `AUTH_RESET_PASSWORD_TTL_MINUTES`
- `AUTH_OTP_MAX_ATTEMPTS`
- `AUTH_OTP_RESEND_COOLDOWN_SECONDS`
- `AUTH_COOKIE_AUTH_ENABLED`
- `AUTH_CSRF_ENFORCEMENT_ENABLED`
- `AUTH_CSRF_COOKIE_NAME`
- `AUTH_CSRF_HEADER_NAME`
- `AUTH_PRACTITIONER_LOGIN_OTP_BYPASS_IN_DEV`
- `APP_URL`
- `APP_BASE_URL`
- `APP_DEFAULT_LOCALE`
- `APP_ENV`
- `NODE_ENV`

### 3. Step-up Security
- `STEP_UP_ENABLED=true`
- `STEP_UP_TTL_SECONDS`
- verify `POST /api/v1/auth/admin/step-up/verify`
- verify sensitive actions:
  - admin permission overrides
  - finance settlement / refund / package settlement mutations
  - any other route tagged with step-up

### 4. Rate Limiting / Redis
- `THROTTLE_STORE=redis`
- `REDIS_URL`
- `THROTTLE_KEY_PREFIX`
- `THROTTLE_KEY_HASH_SECRET`
- verify login throttling
- verify public academy enrollment throttling
- verify multi-instance behavior does not reset counters unexpectedly

### 5. CORS / CSRF / Cookies
- `CORS_ORIGINS`
- `AUTH_CSRF_ENFORCEMENT_ENABLED`
- `AUTH_CSRF_COOKIE_NAME`
- `AUTH_CSRF_HEADER_NAME`
- secure cookie posture must be verified in staging
- no localhost-only origins in staging
- credentials handling must match the deployed frontend origin

### 6. Payments / Finance
- `PAYMENT_STRIPE_ENABLED`
- `STRIPE_MODE`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_BASE_URL`
- `PAYMENT_PAYMOB_ENABLED`
- `PAYMOB_MODE`
- `PAYMOB_API_KEY`
- `PAYMOB_PUBLIC_KEY`
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_INTEGRATION_ID`
- `PAYMOB_INTEGRATION_ID_CARD`
- `PAYMOB_INTEGRATION_ID_WALLET`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_BASE_URL`
- `PAYMOB_INTENTION_BASE_URL`
- `PAYMOB_CHECKOUT_BASE_URL`
- `PAYMOB_CHECKOUT_FLOW`
- `PAYMOB_DEFAULT_CHECKOUT_METHOD`
- `PAYMOB_METHOD_REGISTRY_JSON`
- `PAYMENT_SUCCESS_URL`
- `PAYMENT_FAILED_URL`
- `PAYMENT_PENDING_URL`
- `FINANCE_VAT_ENABLED`
- `FINANCE_VAT_RATE_PERCENT`
- `FINANCE_GATEWAY_FEE_RATE_PERCENT`
- `FINANCE_GATEWAY_FEE_FIXED_AMOUNT`

### 7. Email / SMS / Notifications
- `MAIL_PROVIDER`
- `MAIL_FROM`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_SECURE`
- `DEV_OTP_EMAIL_REDIRECT`
- `DEV_OTP_BYPASS_DELIVERY_FAILURES`
- `SMS_PROVIDER`
- no real delivery destinations in staging

### 8. Uploads / Storage
- No explicit upload/storage env variables were surfaced in the inspected schemas.
- Staging should still verify the active upload provider, file size limits, MIME allowlist, and private/public access policy in code and deployment config.
- Confirm the QA upload files used in the smoke plan are harmless, small, and sandbox-only.

### 9. Audit / Logging
- audit logging must remain enabled
- `LOG_LEVEL`
- `LOG_PRETTY`
- `LOG_HTTP_ENABLED`
- admin audit page must show new events from real actions
- no secrets in logs
- request IDs should be retained if the platform uses them

### 10. Frontend
- `NEXT_PUBLIC_API_URL`
- `API_PROXY_TARGET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_SHOW_DETAILED_ERRORS`
- `NEXT_PUBLIC_TOKEN_EXPIRY_DAYS`
- `NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY_DAYS`
- `NEXT_PUBLIC_CHAT_SOCKET_URL`
- `NEXT_PUBLIC_ENABLE_ANALYTICS`
- `NEXT_PUBLIC_ENABLE_NOTIFICATIONS`
- `NEXT_PUBLIC_ENABLE_DEVTOOLS`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `next.config.ts` security headers and rewrites must match the staging topology

### 11. Mobile
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- production mobile builds must use HTTPS API URLs
- SecureStore must remain the token store
- mobile smoke testing remains a separate validation stream

### 12. Test Data / QA Accounts
Required staging QA personas:
- SUPER_ADMIN
- ADMIN
- SUPPORT
- FINANCE_STAFF
- PRACTITIONER_REVIEWER
- PATIENT
- PATIENT B
- PRACTITIONER
- PRACTITIONER B

Required staging QA records:
- support ticket
- care chat request
- practitioner applications
- session / payment / refund / settlement / package settlement
- academy course / enrollment

Safe handling notes:
- passwords/secrets must be injected securely
- do not commit real secrets
- do not use production identities

### 13. Observability / Error Monitoring
- backend logs
- frontend error capture if used
- request IDs
- health check endpoint(s)
- uptime monitoring
- alert destinations
- sanitize sensitive metadata from logs and events

## Deployment Checklist

1. Take a DB backup/snapshot.
2. Verify migration checksum/history for `20260418201500_repair_session_cancellation_policy_drift`.
3. Run `npx prisma validate`.
4. Run `npx prisma migrate status`.
5. Run `npx prisma migrate deploy`.
6. Run `npx prisma generate` if the deploy pipeline requires it.
7. Start backend with staging env.
8. Start frontend with staging env.
9. Verify health checks.
10. Verify auth smoke.
11. Verify step-up smoke.
12. Verify audit smoke.
13. Verify finance/support/reviewer/patient/practitioner smoke.
14. Verify no real payment, SMS, or email leaves sandbox.

## Prisma Migration / Checksum Checklist

- Confirm the DB has a backup/snapshot before deploy.
- Read `_prisma_migrations` on the target DB.
- Compare the checksum for `20260418201500_repair_session_cancellation_policy_drift` with the repository migration file.
- If the checksum differs, do not claim clean deployability until a controlled remediation plan is approved.
- Do not edit historical migrations in place.
- Do not use `prisma db push` as a staging/prod fix.

## Security Configuration Checklist

- Backend remains the source of truth for authorization.
- Frontend gates are UX only.
- `STEP_UP_ENABLED=true` in staging.
- Redis-backed throttling for production-like staging.
- CORS allowlist must match actual staging origins.
- CSRF behavior must match the chosen cookie-auth posture.
- Secure cookies should be verified over HTTPS.
- No raw passwords, tokens, OTPs, or stack traces in UI.
- Audit events must appear after real mutations.
- 403 must not log the user out.
- 401/session expiry should redirect safely.

## Third-Party Sandbox Checklist

- Payments:
  - Stripe sandbox/test only
  - Paymob sandbox/test only
  - no live gateway credentials
- Email:
  - sandbox provider only
  - no real recipient delivery
- SMS:
  - sandbox provider only
  - no real recipient delivery
- Google auth:
  - staging-safe OAuth client IDs
  - allowed origins updated for staging
- Redis:
  - configured for throttle persistence
- Optional video providers:
  - Daily / Zoom only if the staging plan exercises those routes

## Test Data / QA Account Checklist

Provision or verify:
- SUPER_ADMIN
- ADMIN
- SUPPORT
- FINANCE_STAFF
- PRACTITIONER_REVIEWER
- PATIENT A / B
- PRACTITIONER A / B

Verify domain fixtures:
- support ticket
- care chat request
- practitioner applications
- session / payment / refund / settlement / package settlement
- academy course / enrollment

## Staging Smoke Test Plan

1. Log in as SUPER_ADMIN.
2. Create/edit a user and save permissions with step-up.
3. Verify the audit event appears.
4. Log in as FINANCE_STAFF and open finance pages.
5. Perform only safe sandbox finance reads/mutations if available.
6. Log in as SUPPORT and open support ticket / care-chat.
7. Log in as PRACTITIONER_REVIEWER and open practitioner applications.
8. Log in as PATIENT and verify own session detail vs non-owned denial.
9. Log in as PRACTITIONER and verify own dashboard/session pages.
10. Open the academy course and try a safe enrollment flow.
11. Recheck upload validation if an upload UI is present.
12. Recheck throttling on a small number of invalid attempts.
13. Recheck 403 and 401 behavior.
14. If mobile is included in the staging phase, run a separate mobile smoke.

## Risk Register

| Risk | Severity | Likelihood | Impact | Detection Method | Mitigation | Owner Placeholder |
|---|---|---|---|---|---|---|
| Prisma migration checksum mismatch on existing DB | High | Medium | Deploy failure / drift confusion | `prisma migrate status`, checksum readout | Backup first, compare checksums, use controlled remediation | Ops / Backend |
| Step-up not enabled or not enforced | High | Medium | Sensitive actions weaken | Sensitive action smoke + config check | Set `STEP_UP_ENABLED=true`, verify step-up endpoint | Backend / DevOps |
| Redis throttle not configured | High | Medium | Multi-instance throttling gaps | Login/enrollment abuse smoke | Set `THROTTLE_STORE=redis`, provision `REDIS_URL` | DevOps |
| Payment provider accidentally live | Critical | Low | Real charge risk | Provider mode/keys review | Use sandbox-only keys and test mode | Finance / DevOps |
| SMS/email accidentally live | Critical | Low | Real user contact risk | Mail/SMS provider review | Sandbox/test providers only | Ops |
| Upload storage misconfigured/public | High | Medium | Private data exposure | Upload QA + bucket policy review | Verify private/public policy and MIME/size rules | Backend / DevOps |
| Mobile API URL not HTTPS | High | Medium | Token/network exposure | Build config review | Enforce HTTPS `EXPO_PUBLIC_API_URL` | Mobile / DevOps |
| Missing staging QA accounts | Medium | Medium | QA block | Seed/account verification | Provision all required QA identities | QA / Backend |
| Audit events not visible | Medium | Low | Reduced traceability | Real mutation + audit page check | Confirm audit writes and list visibility | Backend |
| CORS/cookie mismatch | High | Medium | Auth failures / cross-origin breakage | Auth smoke across domains | Align `CORS_ORIGINS` and cookie posture | Backend / Frontend / DevOps |
| Long hydration causing false QA failures | Medium | High | False negatives in manual QA | Retest after wait window | Allow longer settle time before classifying blocked | QA |
| Upload surface not fully validated | Medium | Medium | Missing validation regressions | Dedicated upload smoke | Run a separate upload QA pass | QA / Frontend |

## Explicit Non-Goals
- No production data.
- No real payments.
- No real SMS/email.
- No destructive DB commands.
- No DB reset.
- No `prisma db push`.
- No migration edits to historical files.

## Open Questions / Missing Env Examples
- No committed frontend `.env.example` was found in the inspected workspace; the frontend currently exposes `.env.local` plus code-read env names.
- No committed mobile `.env.example` or `.env.local` was found in the inspected workspace; mobile envs are injected externally.
- Confirm the exact staging domain topology:
  - single-domain same-origin proxy, or
  - separate frontend/backend domains
- Confirm which sandbox payment provider will be enabled first in staging:
  - Stripe, Paymob, or both
- Confirm whether email/SMS sandbox providers are available for the staging environment
- Confirm whether upload storage will be local, S3-compatible, or another private bucket

## Final Answer
- Is staging ready to be configured? **Yes**
- Is staging ready to deploy today? **Conditional**
- What must be done before Phase 14B staging smoke QA?
  - provision staging env vars and sandbox provider settings
  - verify Prisma checksum history and run deploy checks on the target DB
  - enable `STEP_UP_ENABLED=true`
  - configure Redis throttling
  - provision the QA seed identities and domain records
  - verify HTTPS frontend/backend URLs and CORS/cookie alignment
  - confirm upload and mobile smoke plans separately

