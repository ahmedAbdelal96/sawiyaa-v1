# Phase 13A-Follow-up - TestSprite QA Seed Data Provisioning

## 1) How to Run the QA Seed

This QA seed is local-only and idempotent.

Project:
- `D:\Web\full-projects\fayed\fayed-backend-v1`

Command:
```powershell
$env:DATABASE_URL='postgresql://postgres:<local-password>@localhost:5432/fayed_db'
cd D:\Web\full-projects\fayed\fayed-backend-v1
npm run seed:qa:testsprite
```

Rules:
- Must point to local `localhost` / `fayed_db`.
- Must not be used against production or staging.
- Safe to run multiple times.
- Does not delete existing data.
- Does not reset or truncate the database.
- Uses `process.env.DATABASE_URL` only.

## 2) QA Account Matrix

The seed ensures these test identities exist.

| Role | Email | Password | Purpose |
|---|---|---|---|
| SUPER_ADMIN | `admin@hesba.local` | `Admin@12345` | Full admin coverage |
| ADMIN | `qa.admin@hesba.local` | `AdminQa@12345` | Standard admin QA |
| SUPPORT_AGENT / SUPPORT | `support@hesba.local` | `Support@12345` | Support inbox and triage |
| FINANCE_STAFF | `finance@hesba.local` | `Finance@12345` | Finance and settlement flows |
| CONTENT_REVIEWER | `reviewer@hesba.local` | `Reviewer@12345` | Content moderation/review |
| PRACTITIONER_REVIEWER | `practitioner.reviewer@hesba.local` | `ReviewerQa@12345` | Practitioner application review |
| PATIENT_OPERATIONS | `patient.ops@hesba.local` | `PatientOps@12345` | Patient operations QA |
| MARKETING_STAFF | `marketing@hesba.local` | `Marketing@12345` | Marketing visibility QA |
| PATIENT | `ahmed.patient@hesba.local` | `Patient@12345` | Patient baseline |
| PATIENT | `mohamed.patient@hesba.local` | `Patient2@12345` | Patient baseline |
| PATIENT | `omar.patient@hesba.local` | `Patient3@12345` | Patient baseline |
| PRACTITIONER | `dr.ahmed@hesba.local` | `Practitioner@12345` | Practitioner baseline |
| PRACTITIONER | `dr.mohamed@hesba.local` | `Practitioner2@12345` | Practitioner baseline |
| ADMIN target | `qa.target.admin@hesba.local` | `TargetAdmin@12345` | Role/status/permission/session admin tests |
| SUPER_ADMIN backup | `qa.super.admin.backup@hesba.local` | `BackupSuper@12345` | Safe last-super-admin guard testing |

## 3) Seeded Domain Data

The QA seed provisions these local-only records:

### Admin User Management
- `qa.target.admin@hesba.local`
- `qa.super.admin.backup@hesba.local`
- Active sessions for admin/staff personas to support revoke/invalidate tests

### Audit / Security
- Real audit logging remains enabled via the application itself.
- No fake audit rows were inserted by this QA seed.

### Support
- QA support ticket:
  - `QA-SUPPORT-001`
  - subject: `QA Support Ticket`
- QA support conversation:
  - `qa-support-conversation-001`

### Care Chat
- QA care-chat approval request:
  - `QA-CARE-001`
- QA care-chat conversation:
  - `qa-care-chat-conversation-001`

### Sessions / Payments / Refunds / Settlements
- QA session:
  - `QA-SESSION-001`
- QA session payment:
  - `qa-pay-ref-001`
- QA refund candidate:
  - linked to the session payment
- QA settlement batch:
  - `qa-settlement-batch-egp`
- QA practitioner settlement:
  - `QA settlement ready for TestSprite.`
- QA practitioner payout:
  - `QA payout for TestSprite.`

### Package Purchase / Package Settlement
- QA package payment:
  - `qa-package-pay-ref-001`
- QA package purchase:
  - linked to package plan `SESSIONS_6`
- QA package settlement:
  - `QA package settlement for TestSprite.`

### Academy
- QA academy course:
  - `qa-test-course-001`
- QA academy enrollment:
  - `qa-academy-token-001`

### Existing base seed coverage retained
- Practitioner applications remain available from the existing curated QA seed set.
- Practitioner wallets remain available from the existing curated/bulk seed data.

## 4) What Was Skipped and Why

No additional QA seed items were skipped in the final execution.

Notes:
- Real provider webhooks were not used.
- Real SMS/email were not sent.
- No destructive DB action was used.

## 5) Safety Notes

- Local-only seed data.
- No production data.
- No destructive commands.
- No DB reset.
- No `db push`.
- No real charges.
- No real SMS/email.
- Passwords are only local QA credentials.

