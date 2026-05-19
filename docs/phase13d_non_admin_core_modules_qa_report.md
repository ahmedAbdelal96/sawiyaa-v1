# Phase 13D Non-Admin Core Modules QA Report

## Executive Verdict
Fail.

The browser pass confirmed that the local app safely denies unauthorized access and does not log users out on 403-style denials, but several intended staff-facing modules are still blocked for their seeded roles. Finance, Support, Care Chat, and Practitioner Applications are not ready for broader QA or staging yet.

## Modules Tested
- Module A: Finance / Payments / Refunds / Settlements
- Module B: Support Tickets
- Module C: Care Chat
- Module D: Practitioner Applications
- Module E: Cross-role Forbidden Checks

## Passed Tests
- FINANCE_STAFF can log in successfully through the admin sign-in.
- FINANCE_STAFF can open the finance dashboard.
- FINANCE_STAFF can open the payouts page at `/ar/admin/settlements/payouts`.
- SUPPORT can log in successfully through the admin sign-in.
- SUPPORT is safely denied from finance pages without being logged out.
- PRACTITIONER_REVIEWER can log in successfully through the admin sign-in.
- PRACTITIONER_REVIEWER is safely denied from practitioner application pages without being logged out.
- PATIENT can log in successfully through the patient sign-in.
- PATIENT is safely redirected away from admin routes without a logout or crash.
- PRACTITIONER can log in successfully through the practitioner sign-in.
- PRACTITIONER is safely redirected away from admin routes without a logout or crash.
- No passwords, tokens, OTPs, stack traces, or raw translation keys were surfaced in the verified browser states.

## Failed Tests

### 1. Finance staff cannot access finance subpages
- Severity: High
- Affected routes:
  - `/ar/admin/payments`
  - `/ar/admin/settlements`
  - `/ar/admin/package-settlements`
- Exact reproduction steps:
  - Log in as `finance@hesba.local / Finance@12345`.
  - Open each route above.
- Expected:
  - FINANCE_STAFF can access the finance pages granted to it.
  - The QA payment `qa-pay-ref-001`, settlement batch `qa-settlement-batch-egp`, and package settlement data should be visible or searchable where supported.
- Actual:
  - The pages show the app’s `Access Denied` state instead of the finance data views.
- Suspected root cause:
  - Frontend route permission mapping and backend/seed permission grants are not aligned for the finance role.
  - The route permission map requires finance-specific permissions such as `FINANCE_EVENTS_READ`, `ACCOUNTING_READ`, `SETTLEMENTS_READ`, and `SETTLEMENTS_WRITE`, but the seeded finance account does not appear to have the needed grants.
- Recommended fix:
  - Review the finance role’s granted permissions in the QA seed and permission assignment flow.
  - Confirm the finance route permission policy matches the intended staff access model.
- Classification:
  - Backend/config/data
- Screenshot:
  - [finance-payments-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-payments-failure.png)
  - [finance-settlements-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-settlements-failure.png)
  - [finance-package-settlements-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-package-settlements-failure.png)

### 2. Support ticket console is blocked for SUPPORT
- Severity: High
- Affected route:
  - `/ar/admin/support`
- Exact reproduction steps:
  - Log in as `support@hesba.local / Support@12345`.
  - Open `/ar/admin/support`.
- Expected:
  - SUPPORT can triage support tickets.
  - The seeded ticket `QA-SUPPORT-001` should appear.
- Actual:
  - The page shows `Access Denied` instead of the support ticket list.
- Suspected root cause:
  - Support route permissions are too restrictive or the SUPPORT seed account lacks the permissions required by the support route gate.
  - The route policy appears to require `SUPPORT_TICKET_NOTE_INTERNAL` or `SUPPORT_TICKET_ASSIGN`.
- Recommended fix:
  - Reconcile the support role’s permissions in the QA seed with the route permission policy.
  - Confirm the intended support console access model.
- Classification:
  - Backend/config/data
- Screenshot:
  - [support-list-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/support-list-failure.png)

### 3. Care chat is blocked for SUPPORT
- Severity: High
- Affected route:
  - `/ar/admin/care-chat`
- Exact reproduction steps:
  - Log in as `support@hesba.local / Support@12345`.
  - Open `/ar/admin/care-chat`.
- Expected:
  - SUPPORT or the allowed care-chat role can view the QA request `QA-CARE-001`.
  - The request detail page should open.
- Actual:
  - The page shows `Access Denied` instead of the care-chat request list.
- Suspected root cause:
  - Care-chat permissions are not granted to the seeded staff role, or the frontend route permission policy is stricter than the intended QA role model.
  - The gate appears to require `CARE_CHAT_REQUEST_READ_ADMIN`, `CARE_CHAT_CONVERSATION_READ_ADMIN`, or `CARE_CHAT_REQUEST_DECIDE`.
- Recommended fix:
  - Align the care-chat permission grants for the seeded support-facing role.
  - Verify the route gate matches the intended operator role.
- Classification:
  - Backend/config/data
- Screenshot:
  - [care-chat-list-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/care-chat-list-failure.png)
  - [care-chat-detail-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/care-chat-detail-failure.png)

### 4. Practitioner applications are blocked for PRACTITIONER_REVIEWER
- Severity: High
- Affected route:
  - `/ar/admin/practitioner-applications`
- Exact reproduction steps:
  - Log in as `practitioner.reviewer@hesba.local / ReviewerQa@12345`.
  - Open `/ar/admin/practitioner-applications`.
- Expected:
  - PRACTITIONER_REVIEWER can review the QA application list.
  - The list and a detail page should be accessible.
- Actual:
  - The page shows `Access Denied` instead of the application list.
- Suspected root cause:
  - The reviewer account does not appear to have the `PRACTITIONER_APPLICATIONS_READ` permission required by the route policy.
- Recommended fix:
  - Reconcile the reviewer seed permissions with the practitioner application route policy.
  - Verify reviewer-role grants in the QA seed and role-permission assignment flow.
- Classification:
  - Backend/config/data
- Screenshot:
  - [practitioner-applications-list-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/practitioner-applications-list-failure.png)

## Skipped Actions and Why
- No finance mutations were attempted because the finance subpages were already denied for the seeded finance role.
- No support reply was posted because the support ticket page was denied and no safe composer was available.
- No care-chat decision was performed because the care-chat page was denied.
- No practitioner application approval/rejection was performed because the application list was denied.
- No real payments, SMS, or email were attempted.
- No destructive database commands were run.

## Screenshots / Artifacts
- [finance-payments-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-payments-failure.png)
- [finance-settlements-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-settlements-failure.png)
- [finance-package-settlements-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-package-settlements-failure.png)
- [finance-payouts-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/finance-payouts-failure.png) - captured during verification; the page body showed the payouts screen and was treated as a pass.
- [support-list-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/support-list-failure.png)
- [care-chat-list-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/care-chat-list-failure.png)
- [care-chat-detail-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/care-chat-detail-failure.png)
- [practitioner-applications-list-failure.png](D:/Web/full-projects/fayed/artifacts/phase13d/practitioner-applications-list-failure.png)

## Exact Repro Steps

### Finance
1. Open `/ar/signin?mode=admin`.
2. Sign in with `finance@hesba.local / Finance@12345`.
3. Open `/ar/admin/payments`, `/ar/admin/settlements`, and `/ar/admin/package-settlements`.
4. Observe `Access Denied`.

### Support
1. Open `/ar/signin?mode=admin`.
2. Sign in with `support@hesba.local / Support@12345`.
3. Open `/ar/admin/support`.
4. Observe `Access Denied`.

### Care Chat
1. Open `/ar/signin?mode=admin`.
2. Sign in with `support@hesba.local / Support@12345`.
3. Open `/ar/admin/care-chat`.
4. Observe `Access Denied`.

### Practitioner Applications
1. Open `/ar/signin?mode=admin`.
2. Sign in with `practitioner.reviewer@hesba.local / ReviewerQa@12345`.
3. Open `/ar/admin/practitioner-applications`.
4. Observe `Access Denied`.

### Cross-role forbidden checks
1. Log in as `PATIENT` or `PRACTITIONER`.
2. Open `/ar/admin/users`.
3. Confirm the app redirects safely to the appropriate non-admin area without logging the user out.

## Expected vs Actual
- Expected: Finance, Support, Care Chat, and Practitioner Reviewer staff should be able to access their intended modules.
- Actual: The login succeeds, but the routes are denied at the permission gate for those seeded staff accounts.
- Expected: Forbidden access should stay safe and not log the user out.
- Actual: The safe-forbidden behavior is preserved.

## Verification Commands and Results

### Backend
- `npm audit --audit-level=moderate` - passed, 0 vulnerabilities.
- `npm run build` - passed.
- `npx prisma validate` - passed.
- `npx prisma migrate status` - passed, database schema up to date.

### Frontend
- `npm audit --audit-level=moderate` - passed, 0 vulnerabilities.
- `npm run lint` - passed with pre-existing warnings only.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

## Security Concerns
- The app is failing closed, not leaking data. That is good from a security standpoint.
- The concern is authorization coverage, not exposure: intended staff roles cannot reach the modules they need.
- 403-style denials did not log the user out during the browser checks.
- No raw secrets, stack traces, OTPs, or raw translation keys appeared in the verified UI.

## Final Answer
No, the Finance, Support, Care Chat, and Practitioner Application modules are not ready for broader QA/staging yet.

The safe-forbidden behavior is good, but the seeded staff roles are still blocked from the modules they are supposed to operate, which is a functional authorization gap that needs to be corrected before the next QA wave.
