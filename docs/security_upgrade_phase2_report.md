# Security Upgrade – Phase 2 Report

**Date**: 2026-05-11  
**Scope**: Backend only — authorization hardening, permission model expansion, controller narrowing, data access controls  
**Status**: ✅ Complete (Parts A, C, D1–D5, F, G)  
**Part B** (fresh-DB migration validation): documented but deferred — requires provisioning a fresh local PostgreSQL database.

---

## 1. Migration Status (Part A)

| Item               | Status                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Schema validity    | ✅ Valid                                                                                                                     |
| Applied migrations | 54 (last: `20260505230000_add_practitioner_manual_payout`)                                                                   |
| Pending migrations | 1: `20260510120000_phase1_authorization_roles_permissions_foundation`                                                        |
| Drift issue        | Only on `20260418201500_repair_session_cancellation_policy_drift` (pre-existing, does NOT block production `migrate deploy`) |

**Action**: The Phase 1 migration is safe to apply on a fresh or production DB via `prisma migrate deploy`. Never run `prisma migrate reset` on dev DB.

---

## 2. New Permission Keys Added (Part C)

Added 6 new keys to `src/common/enums/permission-key.enum.ts`:

| Key                       | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| `refunds.approve`         | Create and approve payment refund requests                 |
| `refunds.retry`           | Retry failed payment refund requests                       |
| `sessions.read.admin`     | Read session operational data in admin context             |
| `care-chat.decide`        | Approve, reject, or revoke care chat requests              |
| `patients.read.admin`     | Read patient profile list and basic details in back-office |
| `patients.sensitive.read` | Read sensitive patient data such as assessment submissions |

---

## 3. Role-Permission Matrix (Seed Hardened)

`prisma/seed/modules/auth.seed.ts` was restructured to export `permissionDefinitions` and `rolePermissionBundles` as module-level constants (enables pure-data unit tests without DB).

| Role                    | Permissions                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPER_ADMIN`           | All 14 permissions                                                                                                                                 |
| `ADMIN`                 | All 14 permissions                                                                                                                                 |
| `FINANCE_STAFF`         | finance.events.read, settlements.read/write, practitioner-payouts.read/write, practitioner-statements.read, **refunds.approve**, **refunds.retry** |
| `MARKETING_STAFF`       | notification-ops.read                                                                                                                              |
| `PRACTITIONER_REVIEWER` | audit-log.read                                                                                                                                     |
| `PATIENT_OPERATIONS`    | notification-ops.read, audit-log.read, **sessions.read.admin**, **patients.read.admin**                                                            |
| `CONTENT_REVIEWER`      | audit-log.read                                                                                                                                     |
| `SUPPORT`               | **sessions.read.admin**, **patients.read.admin**                                                                                                   |
| `PATIENT`               | (none)                                                                                                                                             |
| `PRACTITIONER`          | (none)                                                                                                                                             |

**Key rule enforced**: `SUPPORT` gets NO finance, NO settlements, NO refund mutations, NO sensitive patient data, NO care-chat decisions, NO audit-log.

---

## 4. Controller Hardening (Parts D1–D5)

### D1: Payment Refunds (`AdminPaymentRefundsController`)

- **File**: `src/modules/payments/controllers/admin-payment-refunds.controller.ts`
- Added `PermissionsGuard` to `UseGuards`
- Added `AppRole.FINANCE_STAFF` to class-level `@Roles` (alongside ADMIN, SUPPORT_AGENT)
- `POST /:id/refunds` → `@Permissions(PermissionKey.REFUNDS_APPROVE)` — SUPPORT_AGENT blocked
- `POST /:paymentId/refunds/:refundId/retry` → `@Permissions(PermissionKey.REFUNDS_RETRY)` — SUPPORT_AGENT blocked
- GET endpoints remain accessible to ADMIN + FINANCE_STAFF + SUPPORT_AGENT (no permission annotation)

### D2: Customer Wallet (`AdminCustomerWalletController`)

- **File**: `src/modules/customer-wallets/controllers/admin-customer-wallet.controller.ts`
- Removed `AppRole.SUPPORT_AGENT` from `@Roles`
- Roles narrowed to `ADMIN, FINANCE_STAFF` only (wallet data is financial-only)

### D3: Sessions Admin (`AdminSessionsOperationsController`)

- **File**: `src/modules/sessions/controllers/admin-sessions-operations.controller.ts`
- Added `PermissionsGuard` to `UseGuards`
- All `GET` endpoints annotated with `@Permissions(PermissionKey.SESSIONS_READ_ADMIN)`
- SUPPORT_AGENT granted `sessions.read.admin` in seed → can still read sessions
- `PATCH cancellation-policies/:bookingType` already restricted to `@Roles(AppRole.ADMIN)` — unchanged

### D4: Care Chat Admin (`AdminCareChatController`)

- **File**: `src/modules/care-chat/controllers/admin-care-chat.controller.ts`
- Added `PermissionsGuard` to `UseGuards`
- `PATCH /requests/:id/decision` → `@Permissions(PermissionKey.CARE_CHAT_DECIDE)`
- `PATCH /requests/:id/revoke` → `@Permissions(PermissionKey.CARE_CHAT_DECIDE)`
- SUPPORT_AGENT has no `care-chat.decide` permission → blocked from approve/reject/revoke
- GET read endpoints remain accessible to ADMIN + SUPPORT_AGENT

### D5: Patient Data Controllers

**`AdminPatientsController`** (`src/modules/patients/admin/controllers/admin-patients.controller.ts`):

- Added `PermissionsGuard`
- Removed `AppRole.CONTENT_REVIEWER` from `@Roles` (reviewers should not access patient profiles)
- Added `AppRole.PATIENT_OPERATIONS` to `@Roles`
- `GET /admin/patients` and `GET /admin/patients/:patientId` → `@Permissions(PATIENTS_READ_ADMIN)`

**`AdminPatientPaymentsController`** (`src/modules/payments/controllers/admin-patient-payments.controller.ts`):

- Added `PermissionsGuard`
- `GET /admin/patients/:patientId/payments` → `@Permissions(PATIENTS_READ_ADMIN)`

**`AdminPatientAssessmentsController`** (`src/modules/assessments/controllers/admin-patient-assessments.controller.ts`):

- Added `PermissionsGuard`
- `GET /admin/patients/:patientId/assessments` → `@Permissions(PATIENTS_SENSITIVE_READ)`
- SUPPORT_AGENT does NOT have `patients.sensitive.read` → blocked from mental-health assessment data

---

## 5. SUPPORT_AGENT Access Audit

| Surface                         | Before                   | After                                             |
| ------------------------------- | ------------------------ | ------------------------------------------------- |
| Refund approve/retry            | ✅ Allowed (full access) | ❌ Blocked (no `refunds.approve`/`refunds.retry`) |
| Refund read / payment ops read  | ✅ Allowed               | ✅ Still allowed (read-only, no @Permissions)     |
| Customer wallet                 | ✅ Allowed               | ❌ Blocked (removed from @Roles)                  |
| Session list/inspect/attendance | ✅ Allowed               | ✅ Still allowed (`sessions.read.admin` in seed)  |
| Cancellation policy update      | ❌ Blocked (ADMIN only)  | ❌ Blocked (unchanged)                            |
| Care chat approve/reject/revoke | ✅ Allowed               | ❌ Blocked (no `care-chat.decide`)                |
| Care chat read requests         | ✅ Allowed               | ✅ Still allowed (no @Permissions on GET)         |
| Patient profile list/details    | ✅ Allowed               | ✅ Still allowed (`patients.read.admin` in seed)  |
| Patient payment history         | ✅ Allowed               | ✅ Still allowed (`patients.read.admin` in seed)  |
| Patient assessments             | ✅ Allowed               | ❌ Blocked (no `patients.sensitive.read`)         |
| Finance events/settlements      | ❌ Blocked               | ❌ Blocked (unchanged)                            |

---

## 6. Test Results (Part F + G)

| Suite                                                 | Tests  | Status          |
| ----------------------------------------------------- | ------ | --------------- |
| `auth.seed.spec.ts` (new, pure-data)                  | 20     | ✅ Pass         |
| `permissions.guard.spec.ts`                           | —      | ✅ Pass         |
| `permission-resolver.service.spec.ts`                 | —      | ✅ Pass         |
| `admin-sessions-operations.controller.access.spec.ts` | —      | ✅ Pass         |
| `care-chat-request-visibility.contract.spec.ts`       | —      | ✅ Pass         |
| care-chat use-case specs (3 suites)                   | —      | ✅ Pass         |
| **Total targeted**                                    | **46** | **✅ All pass** |

---

## 7. Build Verification

```
npm run build   → exit code 0 (no TypeScript errors)
npx prisma validate → schema valid
npm run prisma:generate → client generated v6.19.2
```

---

## 8. Files Changed

| File                                                                           | Change                                                                           |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `src/common/enums/permission-key.enum.ts`                                      | +6 new permission keys                                                           |
| `prisma/seed/modules/auth.seed.ts`                                             | Extracted exports; +6 permission defs; updated 4 role bundles                    |
| `prisma/seed/modules/auth.seed.spec.ts`                                        | **NEW** — 20 pure-data matrix tests                                              |
| `src/modules/payments/controllers/admin-payment-refunds.controller.ts`         | PermissionsGuard + FINANCE_STAFF + @Permissions on mutations                     |
| `src/modules/customer-wallets/controllers/admin-customer-wallet.controller.ts` | Removed SUPPORT_AGENT; added FINANCE_STAFF                                       |
| `src/modules/sessions/controllers/admin-sessions-operations.controller.ts`     | PermissionsGuard + @Permissions(SESSIONS_READ_ADMIN) on GETs                     |
| `src/modules/care-chat/controllers/admin-care-chat.controller.ts`              | PermissionsGuard + @Permissions(CARE_CHAT_DECIDE) on decide/revoke               |
| `src/modules/patients/admin/controllers/admin-patients.controller.ts`          | PermissionsGuard + removed CONTENT_REVIEWER + @Permissions on GETs               |
| `src/modules/payments/controllers/admin-patient-payments.controller.ts`        | PermissionsGuard + @Permissions(PATIENTS_READ_ADMIN)                             |
| `src/modules/assessments/controllers/admin-patient-assessments.controller.ts`  | PermissionsGuard + @Permissions(PATIENTS_SENSITIVE_READ)                         |
| `package.json`                                                                 | jest: added `roots` for prisma/seed; reordered `moduleFileExtensions` (ts first) |

---

## 9. Deferred Items

| Item                         | Reason                                  | Safe Path                                                                                                    |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Part B (fresh DB validation) | Requires new PostgreSQL DB provisioning | `createdb fayed_authz_validation_db` → `DATABASE_URL=...fayed_authz_validation_db npx prisma migrate deploy` |
| Phase 1 migration on dev DB  | Drift blocker on `20260418201500_*`     | Use `prisma migrate deploy` on fresh DB only; dev DB drift is benign                                         |

---

## 10. OWASP Alignment

| Risk                                       | Mitigation Applied                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **A01 – Broken Access Control**            | PermissionsGuard added to 6 controllers; DENY-wins resolver; SUPPORT_AGENT blocked from 5 high-risk surfaces |
| **A04 – Insecure Design**                  | Principle of least privilege enforced per role; CONTENT_REVIEWER removed from patient data routes            |
| **A07 – Identification and Auth Failures** | SUPER_ADMIN bypass explicit + audited in resolver; normalized role mapping prevents privilege collapse       |
