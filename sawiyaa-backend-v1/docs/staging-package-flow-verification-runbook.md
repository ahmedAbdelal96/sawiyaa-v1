# Standardized Package Flow Staging Verification Runbook

This runbook is the safe staging verification pack for the standardized package system.

It is intentionally read-only. Do not use it to reset databases, edit migrations, or deploy new features.

## 1. Purpose

Verify the full standardized package flow on staging:

- package plan discovery
- package quote
- package purchase creation
- payment initiation
- sandbox webhook handling
- package activation
- linked session confirmation
- notification context
- per-session ledger allocation
- package completion
- admin package-plan management

## 2. Required staging inputs

Before running the flow, collect these approved staging inputs:

- staging backend URL
- staging frontend URL
- staging database connection through the approved env/secret setup
- payment sandbox credentials
- payment webhook secret
- webhook target URL
- admin test account
- patient test account
- practitioner test account

Do not place real credentials in this repository.

## 3. Environment preflight

Confirm the staging runtime is wired correctly:

- `APP_ENV=staging`
- `DATABASE_URL` points to staging, not localhost
- frontend points to the staging backend
- payment provider is in sandbox/test mode
- webhook target is reachable from the provider sandbox

Recommended checks:

1. Open the backend process environment or staging secret source.
2. Verify `APP_ENV` and `DATABASE_URL`.
3. Verify payment provider mode values.
4. Verify the frontend build/runtime points at the staging backend URL.

## 4. Migration readiness

Verify these migrations are applied in order:

- `20260503120000_add_standardized_package_plans`
- `20260503193000_add_practitioner_dual_currency_pricing`
- `20260504100000_make_package_purchase_legacy_price_snapshots_nullable`

Safety expectations:

- migrations are forward-only
- no destructive table drops
- `PackagePlan` exists
- `PatientPackagePurchase` supports package-plan snapshots
- `PractitionerProfile` has explicit dual-currency pricing fields

Suggested safe commands:

```bash
npx prisma migrate status
npx prisma validate
```

If staging deploys migrations during release, use the normal deploy path only.

## 5. Seed readiness

Verify or run idempotent seeds for:

- package plans:
  - `SESSIONS_4` / `4` / `10%`
  - `SESSIONS_6` / `6` / `15%`
  - `SESSIONS_8` / `8` / `20%`
- config:
  - `packages.enabled = true`
  - `packages.purchaseEnabled = true`

Seed expectations:

- package plan rows are deterministic
- package config upserts are idempotent
- no legacy practitioner package seed is needed for the standardized package flow

## 6. Test data setup

Use or create staging test data with:

- admin user
- patient user
- practitioner user/profile
- practitioner approved, active, and public
- `acceptsPackage = true`
- explicit prices:
  - `sessionPrice30Egp`
  - `sessionPrice30Usd`
  - `sessionPrice60Egp`
  - `sessionPrice60Usd`
- valid availability slots for the relevant time window

## 7. Manual QA checklist

### 7.1 Admin package settings

- open admin package-plans page
- verify all three standardized plans are visible
- verify package settings are visible
- verify `packages.enabled` and `packages.purchaseEnabled` can be updated
- verify immutable fields are read-only
- verify disabling shows a warning that it affects only new quotes and purchases

### 7.2 Practitioner package visibility

- open practitioner profile
- verify package plans appear only when package support is enabled
- verify no practitioner-created package management UI exists
- verify single-session booking still works normally

### 7.3 Patient quote

- log in as the patient test account
- open the practitioner profile
- select a package plan
- choose duration and currency
- request quote
- verify quote values come from backend totals only
- verify no internal financial split is shown

### 7.4 Package purchase creation

- select exactly the required number of valid slots
- verify the UI blocks duplicate slots
- verify the confirm action is disabled until slot count matches
- create the package purchase
- verify the response returns a pending purchase id

### 7.5 Payment initiation

- initiate payment for the pending purchase
- verify the purchase id, not a session id, is used
- verify the redirect or checkout flow matches the existing payment convention

### 7.6 Sandbox payment success webhook

- complete sandbox checkout successfully
- trigger or wait for the webhook
- verify the purchase becomes active
- verify linked sessions become confirmed
- verify confirmation notifications include package context

### 7.7 Package activation

- verify the purchase is active after payment success
- verify activation timestamps are set
- verify linked package sessions still retain their package linkage fields

### 7.8 Session confirmation

- verify linked sessions are normal real sessions
- verify session status is confirmed
- verify the package session index is visible in admin/read-only views if applicable

### 7.9 Notifications with package context

- verify confirmation notifications include package plan code and package session index/count
- verify reminder notifications include package context
- verify no duplicate package-only notification stream is created

### 7.10 Ledger allocation on session completion

- complete one linked package session
- verify package ledger allocation is posted for that session only
- complete all linked sessions
- verify package purchase becomes completed

### 7.11 Package completion

- verify the purchase stays active while at least one linked session is incomplete
- verify the purchase becomes completed only after all linked sessions are completed

## 8. Failure-path checklist

### 8.1 Disabled plan

- disable a plan in admin
- verify it disappears from public package listings
- verify quote rejects it
- verify purchase creation rejects it

### 8.2 Packages disabled

- set `packages.purchaseEnabled = false`
- verify quote and purchase creation are blocked
- verify existing paid purchases are untouched

### 8.3 Missing currency price

- remove the relevant EGP or USD practitioner price
- verify quote returns a clear price-unavailable error
- verify purchase creation is blocked for that currency

### 8.4 Duplicate slots

- select the same slot twice
- verify the UI blocks it
- verify backend rejection is still handled safely

### 8.5 Wrong slot count

- choose fewer or more slots than required
- verify purchase cannot be confirmed

### 8.6 Expired unpaid purchase

- let the payment hold expire
- verify the purchase expires
- verify linked pending sessions are released

### 8.7 Failed payment

- simulate provider failure
- verify the purchase is cancelled or expired according to provider/hold semantics
- verify linked sessions are released safely

### 8.8 Duplicate webhook replay

- replay the same webhook
- verify status transitions remain idempotent
- verify no duplicate session events or ledger rows are created

## 9. Read-only database verification

Use the companion SQL file:

- [`staging-package-flow-verification.sql`](./staging-package-flow-verification.sql)

It includes read-only queries for:

- package plan rows
- package config values
- practitioner pricing fields
- patient package purchase status
- linked sessions
- payment purpose
- payment capture accounting
- package ledger allocation
- duplicate ledger detection

## 10. Release gate checklist

Must pass before production rollout:

- migrations applied in order
- package seeds verified
- package config enabled
- patient quote returns backend totals only
- package purchase creation works
- payment initiation uses package purchase id
- sandbox payment success activates package purchase
- linked sessions become confirmed
- package notifications carry context
- ledger allocation posts only on session completion
- duplicate webhook replay is idempotent
- admin package settings work
- immutable package-plan fields remain read-only

Can be checked manually by QA or DevOps:

- package listings visible on frontend
- Arabic and English UI copy render cleanly
- continue-payment behavior
- disabled plan behavior
- expired purchase behavior
- no internal financial split in patient/admin UI

## 11. Operational guardrails

- Do not use destructive database commands.
- Do not reset staging.
- Do not edit migrations during verification.
- Do not commit real secrets into the repository.
- Keep the legacy practitioner package code untouched in this verification pack.

## 12. Read-only readiness helper

Use the helper script before manual QA to confirm the staging environment is ready:

```bash
npm run staging:package:verify
```

If you are using an approved staging env file, pass it explicitly:

```bash
npm run staging:package:verify -- --env-file D:/path/to/approved/staging.env
```

What the helper checks:

- `APP_ENV=staging`
- `DATABASE_URL` is not localhost
- required app URLs are present
- at least one payment provider is enabled for package QA
- required payment sandbox variables are present for the enabled provider
- package plan rows exist for the standardized tiers
- package config values exist and are enabled
- at least one practitioner is package-eligible and has explicit dual-currency prices
- available package practitioner slots exist

What it does not do:

- does not mutate data
- does not run migrations
- does not run seeds
- does not start or stop services
- does not print secret values

Example output:

```text
[OK] APP_ENV is staging
[OK] DATABASE_URL is not localhost
[OK] PackagePlan rows exist for all three standardized tiers - SESSIONS_4:ok, SESSIONS_6:ok, SESSIONS_8:ok
[OK] packages.enabled exists and is true - rows=1
[OK] packages.purchaseEnabled exists and is true - rows=1
[OK] At least one package-eligible practitioner exists - public-slug | availabilitySlots=5
[OK] Eligible practitioner has availability slots - public-slug availabilitySlots=5
[OK] Stripe sandbox mode is test
[OK] Stripe secret key present
...
[OK] Staging package readiness checks passed.
Read-only checks only. No data was mutated.
```
