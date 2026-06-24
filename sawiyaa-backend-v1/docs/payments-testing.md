# Payments Testing Guide

This guide covers local/dev payment setup for Stripe and Paymob with env-driven configuration only.

## 1) Development setup

1. Copy `.env.example` to `.env`.
2. Keep:
   - `APP_ENV=development`
   - `NODE_ENV=development`
3. Use test/sandbox modes:
   - `STRIPE_MODE=test`
   - `PAYMOB_MODE=test`
4. Add provider test credentials into `.env` (never hardcode in source).
5. Run backend:
   - `npm install`
   - `npm run prisma:generate`
   - `npm run start:dev`

## 2) Required payment env variables

### Stripe

- `PAYMENT_STRIPE_ENABLED`
- `STRIPE_MODE`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_API_BASE_URL`

### Paymob

- `PAYMENT_PAYMOB_ENABLED`
- `PAYMOB_MODE`
- `PAYMOB_API_KEY`
- `PAYMOB_INTEGRATION_ID_CARD`
- `PAYMOB_IFRAME_ID`
- `PAYMOB_HMAC_SECRET`
- `PAYMOB_BASE_URL`
- `PAYMOB_INTEGRATION_ID_WALLET` (optional for future wallet flow)

### Redirect URLs

- `APP_BASE_URL`
- `PAYMENT_SUCCESS_URL`
- `PAYMENT_FAILED_URL`
- `PAYMENT_PENDING_URL`

These redirect variables are required when any payment provider is enabled. No implicit in-code fallback redirect URLs are used.

## 3) Webhooks / callbacks

### Stripe webhook endpoint

- `POST /api/v1/payments/webhooks/stripe`
- Signature verification uses `STRIPE_WEBHOOK_SECRET`.
- Local forwarding (Windows) with Stripe CLI:
  1. Install CLI:
     - `winget install Stripe.StripeCLI`
     - or `choco install stripe-cli`
  2. Login:
     - `stripe login`
  3. Forward events to backend:
     - `stripe listen --forward-to http://127.0.0.1:7000/api/v1/payments/webhooks/stripe`
  4. Copy the shown signing secret (`whsec_...`) into:
     - `STRIPE_WEBHOOK_SECRET`

### Paymob webhook endpoint

- `POST /api/v1/payments/webhooks/paymob`
- Signature/HMAC verification uses `PAYMOB_HMAC_SECRET`.
- Paymob dashboard callback/webhook URL (local via tunnel):
  - `https://<your-public-tunnel-domain>/api/v1/payments/webhooks/paymob`
- HMAC prerequisites:
  - `PAYMOB_HMAC_SECRET` must exactly match the dashboard secret.
  - Payload must reach backend unchanged for signature verification to pass.

If verification fails, webhook is rejected safely with machine-readable errors. Secrets are never returned in API responses.

## 4) Stripe testing flow

1. Create/initialize payment from the app flow.
2. Complete test checkout with Stripe test card:
   - `4242 4242 4242 4242`
3. Expiration/CVC/ZIP: use any valid test values accepted by Stripe in test mode.
4. Verify:
   - payment status transitions correctly
   - session confirmation/expiry orchestration runs as expected
   - webhook events are handled idempotently

## 5) Paymob testing flow

1. Use Paymob sandbox credentials in `.env` placeholders.
2. Ensure:
   - `PAYMOB_INTEGRATION_ID_CARD` and `PAYMOB_IFRAME_ID` are set
   - `PAYMOB_BASE_URL` points to sandbox/test endpoint as required by your Paymob account
   - dashboard webhook/callback points to your public backend URL
3. Start checkout and complete sandbox transaction.
4. Verify:
   - checkout URL is generated from env values
   - webhook HMAC validation passes
   - lifecycle updates are idempotent on retries

## 6) Mobile hosted-checkout real-device validation

This is the remaining production-confidence step for patient mobile session payments.

Explicit state:

- mobile payment parity = implemented
- native hardening in code = implemented
- Stripe mobile support = still not implemented
- final production confidence = still requires real-device hosted-checkout validation

Guardrails:

- Do not reopen the hardening code unless a real device bug appears.
- Treat backend session/payment state as the final truth after app return.
- Do not mark Stripe as supported on mobile unless a native SDK-backed implementation is added and validated.

Required setup:

1. Install the mobile app on a physical device with the `fayed` app scheme available.
2. Point the mobile app to a reachable backend environment using Paymob sandbox/test credentials.
3. Ensure the backend can generate a hosted checkout URL and accept webhook callbacks from a public test endpoint.
4. Verify the mobile initiate request sends a native `returnUrl` and the backend uses it for Paymob redirect handling.

Required real-device scenarios:

1. Success path:
   - start session payment from mobile
   - complete hosted checkout successfully
   - confirm provider returns into the app
   - confirm mobile recovery/reconcile resolves to confirmed backend payment/session state
2. Failure path:
   - complete hosted checkout with a provider-declared failure
   - confirm app return does not imply success
   - confirm final state remains backend-truth failed/unconfirmed
3. Browser dismissal path:
   - open hosted checkout and manually close or dismiss the browser
   - confirm app shows recovery behavior only
   - confirm no false success state is shown
4. Delayed confirmation path:
   - simulate or observe a path where webhook confirmation lands after app return
   - confirm polling/recovery converges on backend truth without duplicate side effects

Evidence to capture:

1. Device screen recording or screenshots for each scenario.
2. Initiate API payload/response showing hosted checkout URL and native return URL usage.
3. Backend logs or payment records showing reconcile/webhook outcome.
4. Final session/payment states after each scenario.

## 7) Success/failure verification checklist

- Success path:
  - Payment becomes `CAPTURED`
  - Session transitions from `PENDING_PAYMENT` to `CONFIRMED`
- Failed path:
  - Payment becomes `FAILED`
  - Session remains unconfirmed
- Expired path:
  - Payment becomes `EXPIRED`
  - Unpaid session expires through orchestrated session flow
- Duplicate webhook path:
  - no duplicate side effects

## 8) Switching to production later

Change env values only:

1. `APP_ENV=production`
2. `STRIPE_MODE=live` and live Stripe keys/secrets
3. `PAYMOB_MODE=live` and live Paymob credentials/IDs
4. production redirect URLs
5. restart service

No code changes are required for provider mode switching.
