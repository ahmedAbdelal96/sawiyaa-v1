# Phase 11C - Frontend Admin User Management UI

## Executive Verdict
Complete.

The Admin User Management UI is implemented in the frontend and wired to the backend contract for internal admin users only. The feature is behind permission gates, handles `STEP_UP_REQUIRED`, and preserves the existing 401/403 behavior and sensitive-cache handling.

## What Was Implemented
- Routes:
  - `/admin/users`
  - `/admin/users/[id]`
- Navigation:
  - Added an Admin Users entry in the admin navigation, gated by `admin-users.read`
- API layer:
  - Typed client for list/get/create/update/status/roles/permission-overrides/session revoke/token-version invalidate
  - Admin step-up verification helper for `POST /auth/admin/step-up/verify`
- Permission gating:
  - `AdminPermissionGate` wraps both new routes
  - Controls are hidden unless the current user has the matching backend permission keys
- UI:
  - Admin users list with search, role filter, status filter, pagination, and row actions
  - Admin user detail screen with profile, roles, security, and overrides sections
  - Create admin user modal
  - Step-up password dialog
  - Confirm dialogs for revoking sessions and invalidating tokens
- i18n:
  - Added `admin-users` namespace in English and Arabic
  - Added the Admin Users navigation label in the correct `workspace` namespace
- Security integration:
  - `STEP_UP_REQUIRED` is handled in the frontend
  - 403 handling still clears sensitive cache for real authorization failures
  - Passwords are only kept in local component state during step-up/create flows

## Backend Endpoints Integrated
- `GET /admin/users`
- `GET /admin/users/:id`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `PATCH /admin/users/:id/status`
- `PATCH /admin/users/:id/roles`
- `GET /admin/users/:id/permission-overrides`
- `PATCH /admin/users/:id/permission-overrides`
- `POST /admin/users/:id/sessions/revoke`
- `POST /admin/users/:id/token-version/invalidate`
- `POST /auth/admin/step-up/verify`

## Permission Controls
- `admin-users.read`
  - Admin Users nav item
  - List page
  - Detail page
  - Permission override read access
- `admin-users.create`
  - Create admin user button/modal
- `admin-users.update`
  - Edit profile action
- `admin-users.status.update`
  - Status update action
- `admin-users.roles.update`
  - Roles update action
- `admin-users.permission-overrides.read`
  - Overrides section visibility
- `admin-users.permission-overrides.update`
  - Edit overrides action/modal
- `admin-users.sessions.revoke`
  - Revoke sessions action
- `admin-users.token-version.invalidate`
  - Invalidate tokens action

## Step-Up Behavior
- `STEP_UP_REQUIRED` is detected using the existing `AppError` path.
- Sensitive mutations open a password re-auth dialog instead of failing the flow.
- Password handling safeguards:
  - password stays in local component state only
  - password is cleared on close/success/failure
  - password is not logged
- Retry behavior:
  - after successful step-up verification, the pending action is retried once
  - there is no infinite retry loop

## UX Summary
- List page:
  - search by name/email/phone
  - role filter
  - status filter
  - pagination
  - row actions for view/edit/status/roles/sessions/token-version
- Detail page:
  - profile card
  - roles card
  - security card
  - permission overrides card
  - destructive actions gated by permission and self-action checks
- Create flow:
  - admin-only modal
  - internal roles only
  - password required
  - step-up protected
- Edit flows:
  - profile, status, roles, overrides use modal-driven updates
  - session revoke and token invalidation use confirm dialogs

## Security Notes
- Backend remains the source of truth for authorization.
- The UI only hides controls for usability; it does not replace backend checks.
- No patient/practitioner account management was added here.
- No password/token logging was introduced.
- 403 handling remains safe; `STEP_UP_REQUIRED` does not trigger a forbidden/session-expiry cache clear path.

## Verification Commands and Results
- `npm audit --audit-level=moderate`
  - Passed, 0 vulnerabilities
- `npm run build`
  - Passed
- `npx tsc --noEmit`
  - Passed
- `npm run lint`
  - Passed with warnings only
  - Total: 24 warnings, 0 errors
  - Warnings are pre-existing debt plus a small number of local warnings in the new detail screen:
    - 1 `react-hooks/exhaustive-deps` warning in `AdminUserDetailScreen.tsx`
    - 4 unused eslint-disable directive warnings in `AdminUserDetailScreen.tsx`

## Remaining Gaps
- Invite email flow is not implemented; the create flow uses password handoff.
- There is no permission catalog endpoint yet, so the overrides UI uses the current permission key set and backend validation.
- Frontend lint still has unrelated warnings in older admin/public screens, but no errors.

## Files Changed
- `src/lib/auth/permissions.ts`
- `src/features/auth/types/auth.types.ts`
- `src/features/auth/api/auth.api.ts`
- `src/lib/api/errors.ts`
- `src/lib/api/index.ts`
- `src/lib/api/http-client.ts`
- `src/providers/query-provider.tsx`
- `src/config/navigation/admin.tsx`
- `src/config/admin-route-permissions.ts`
- `src/i18n/request.ts`
- `messages/en/navigation.json`
- `messages/ar/navigation.json`
- `messages/en/admin-users.json`
- `messages/ar/admin-users.json`
- `src/app/[locale]/(admin)/admin/users/page.tsx`
- `src/app/[locale]/(admin)/admin/users/[id]/page.tsx`
- `src/features/admin/users/api/admin-users.api.ts`
- `src/features/admin/users/constants/query-keys.ts`
- `src/features/admin/users/hooks/use-admin-users.ts`
- `src/features/admin/users/hooks/use-admin-step-up.ts`
- `src/features/admin/users/types/admin-users.types.ts`
- `src/features/admin/users/utils/admin-users-format.ts`
- `src/features/admin/users/components/AdminUserCreateModal.tsx`
- `src/features/admin/users/components/AdminUserDetailScreen.tsx`
- `src/features/admin/users/components/AdminUserStepUpDialog.tsx`
- `src/features/admin/users/components/AdminUsersScreen.tsx`

## Final Answer
Yes. The frontend Admin User Management UI is ready for admin QA.
