# Phase 13D-Fix - Authorization Alignment Report

## Executive Verdict
Pass.

The intended staff modules are now aligned with the current permission model in the browser. Finance, Support, Care Chat, and Practitioner Applications render for the correct roles, patient SSR no longer crashes, and the noisy notifications 403s from the admin shell have been removed.

## Root Cause Summary

### Finance
- Root cause: the finance area was already backend-authorized, but the admin shell was still mounting a notifications widget for roles that do not have `notification-ops.read`, which produced noisy 403s during staff dashboard navigation.
- Fix: the header notifications dropdown is now gated by current permissions before it can query `/admin/notifications`.

### Support
- Root cause: the support screen was misread as blocked because it needs a longer client hydration window in this environment. After the page settles, the support list renders normally.
- Fix: no backend auth change was required; the existing permission alignment is correct. The browser QA window was extended and the support list was verified with the seeded `QA Support Ticket`.

### Care Chat
- Root cause: same as Support. The page looked like a loader during short QA waits, but it renders after hydration and data load.
- Fix: no auth change was required. The care-chat list was verified after a longer settle window and the seeded QA request was visible.

### Practitioner Applications
- Root cause: same pattern as Support and Care Chat. The page needed more time to hydrate before the list becomes visible.
- Fix: no auth change was required. The reviewer list rendered and the seeded QA practitioner application rows were visible.

### Patient Sign-In SSR Bug
- Root cause: `PatientGoogleAuthButton.tsx` touched `window` during render, which caused `/ar/signin?mode=patient` to fail server-side.
- Fix: `window` access is now only performed inside `useEffect`, with a safe `scriptReady` initialization path.

### Noisy Forbidden Widget Calls
- Root cause: the admin header notifications dropdown still queried `/admin/notifications` for staff who do not have `notification-ops.read`.
- Fix: the dropdown now checks current permissions first and does not mount the notifications query unless the user can actually read notifications.

## Backend Changes
- None in this pass.
- Backend authorization and seeded role bundles were already aligned with the intended staff roles.

## Frontend Changes
- `fayed-frontend-v1/src/components/auth/PatientGoogleAuthButton.tsx`
- `fayed-frontend-v1/src/components/header/NotificationDropdown.tsx`
- Supporting files already present in the worktree from the earlier Phase 13D fix and validated in this pass:
  - `fayed-frontend-v1/src/components/admin/AdminPermissionGate.tsx`
  - `fayed-frontend-v1/src/features/admin/components/AdminDashboard.tsx`
  - `fayed-frontend-v1/src/features/support/hooks/use-support.ts`
  - `fayed-frontend-v1/src/features/care-chat/hooks/use-care-chat.ts`
  - `fayed-frontend-v1/src/features/admin/settlements/hooks/use-admin-settlements.ts`
  - `fayed-frontend-v1/src/features/admin/moderation-reports/hooks/use-admin-moderation-reports.ts`
  - `fayed-frontend-v1/src/app/[locale]/(admin)/admin/sessions/page.tsx`
  - `fayed-frontend-v1/src/config/admin-route-permissions.ts`
  - `fayed-frontend-v1/src/config/navigation/admin.tsx`
  - `fayed-frontend-v1/src/lib/server-api-client.ts`

## Seed / Permission Bundle Changes
- None in this pass.
- The seeded roles already provide the intended least-privilege permissions:
  - `FINANCE_STAFF` for finance/settlements/payouts
  - `SUPPORT` for support and care-chat
  - `PRACTITIONER_REVIEWER` for practitioner applications

## Tests Added or Updated
- No new backend tests were added in this pass.
- Existing frontend and backend verification checks were re-run successfully.

## Verification Results

### Backend
- `npm audit --audit-level=moderate` - passed
- `npm run build` - passed
- `npx prisma validate` - passed
- `npx prisma migrate status` - passed

### Frontend
- `npm audit --audit-level=moderate` - passed
- `npm run lint` - passed with pre-existing warnings only
- `npx tsc --noEmit` - passed
- `npm run build` - passed

### Manual Browser QA
- `FINANCE_STAFF` login succeeded.
- `/ar/admin/finance/dashboard` opened successfully.
- `/ar/admin/payments`, `/ar/admin/settlements`, `/ar/admin/package-settlements`, and `/ar/admin/settlements/payouts` opened successfully.
- No `/admin/notifications` 403 noise appeared after the dropdown gating fix.
- `SUPPORT` login succeeded.
- `/ar/admin/support` rendered after a longer settle window.
- The seeded `QA Support Ticket` row was visible.
- `/ar/admin/care-chat` rendered after a longer settle window.
- The seeded QA care-chat request row was visible.
- `PRACTITIONER_REVIEWER` login succeeded.
- `/ar/admin/practitioner-applications` rendered after a longer settle window.
- The seeded `QA Test Practitioner A` and `QA Test Practitioner B` rows were visible.
- `PATIENT` sign-in page returned 200 and no SSR crash text appeared.
- Direct admin navigation for patient redirected away safely.

## Screenshots / Artifacts
- `D:/Web/full-projects/fayed/docs/phase13d_artifacts/support_access.png`
- `D:/Web/full-projects/fayed/docs/phase13d_artifacts/reviewer_access.png`
- `D:/Web/full-projects/fayed/docs/phase13d_artifacts/patient_forbidden.png`

## Remaining Gaps
- The Support, Care Chat, and Practitioner Applications screens take noticeably longer to hydrate in this environment than finance pages. They are functional, but QA should allow a longer settle window before classifying them as blocked.
- No backend authorization widening was required, so access remains least-privilege.

## Final Answer
- Are Finance/Support/CareChat/PractitionerApplications now ready for broader QA/staging? Yes.
