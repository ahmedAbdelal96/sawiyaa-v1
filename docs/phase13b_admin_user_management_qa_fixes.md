# Phase 13B-Fix: Admin User Management QA Fixes

## Executive Verdict
All requested Phase 13B QA failures were closed in the final verification pass.

## Root Cause Summary

### 1. Admin user details page did not open
- Root cause: the admin users UI was generating localized routes with a duplicated locale prefix during navigation, which produced `/ar/ar/...` paths and redirected the browser away from the intended details route.
- Fix implemented: route generation in the admin users screens was normalized to pass canonical `/admin/...` paths into the locale-aware router, so the router adds the locale exactly once.

### 2. Admin users row actions appeared inert
- Root cause: this did not reproduce in the final pass after the routing fix. The earlier negative result was a QA-state false negative caused by the route issue and selector timing during the first browser attempt.
- Fix implemented: no additional code change was needed beyond the routing normalization. Final browser QA confirmed each row action opens a local dialog/confirm and the URL stays on `/ar/admin/users`.

### 3. SUPPORT admin login failed
- Root cause: `LoginAdminUseCase` only accepted `SUPER_ADMIN` and `ADMIN`, so seeded admin-class staff such as `SUPPORT` were rejected.
- Fix implemented: the admin auth allowlist was expanded to accept the full backend admin-class role set, and refresh-token auth was aligned with the same set.

### 4. FINANCE_STAFF admin login failed
- Root cause: the backend auth allowlist rejected `FINANCE_STAFF`, and the frontend route-access helpers did not normalize `FINANCE_STAFF` as an admin-class role, which caused redirect churn instead of a clean admin-shell + forbidden view.
- Fix implemented: backend login/refresh allowlists were expanded, and frontend route access, session-role helpers, and auth-server role handling were aligned to recognize finance and the other admin-class roles.

### 5. Step-up did not appear on permission override save
- Root cause: local development is configured with `STEP_UP_ENABLED=false`, so the sensitive action does not require a step-up prompt in this environment.
- Fix/documentation: no security weakening was introduced. The final QA run confirmed the save path works without a prompt because local step-up is disabled by config, not because the guard was removed.

## Files Changed

### Backend
- `fayed-backend-v1/src/modules/auth/utils/auth-role.util.ts`
- `fayed-backend-v1/src/modules/auth/use-cases/login-admin.use-case.ts`
- `fayed-backend-v1/src/modules/auth/use-cases/refresh-admin-token.use-case.ts`
- `fayed-backend-v1/src/modules/auth/use-cases/login-admin.use-case.spec.ts`
- `fayed-backend-v1/src/modules/auth/use-cases/refresh-admin-token.use-case.spec.ts`

### Frontend
- `fayed-frontend-v1/src/features/admin/users/components/AdminUsersScreen.tsx`
- `fayed-frontend-v1/src/features/admin/users/components/AdminUserDetailScreen.tsx`
- `fayed-frontend-v1/src/features/admin/users/components/AdminUserPermissionsScreen.tsx`
- `fayed-frontend-v1/src/config/route-access.ts`
- `fayed-frontend-v1/src/lib/auth/roles.ts`
- `fayed-frontend-v1/src/lib/auth/server.ts`

### Report
- `docs/phase13b_admin_user_management_qa_fixes.md`

## Verification Results

### Backend
- `npm audit --audit-level=moderate` passed with `0 vulnerabilities`.
- `npm run build` passed.
- `npx prisma validate` passed.
- `npx prisma migrate status` passed and reported the database schema is up to date.
- `npx jest src/modules/auth/use-cases/login-admin.use-case.spec.ts --runInBand` passed, `10/10` tests.
- `npx jest src/modules/auth/use-cases/refresh-admin-token.use-case.spec.ts --runInBand` passed, `1/1` test.
- `npx jest src/modules/admin/users/controllers/admin-users.controller.access.spec.ts --runInBand` passed, `6/6` tests.
- `npx jest src/common/guards/security/step-up.guard.spec.ts --runInBand` passed, `3/3` tests.
- `npx jest src/modules/admin/users/use-cases/update-admin-user-permission-overrides.use-case.spec.ts --runInBand` passed, `3/3` tests.

### Frontend
- `npm audit --audit-level=moderate` passed with `0 vulnerabilities`.
- `npm run lint` passed with existing warnings only.
- `npx tsc --noEmit` passed.
- `npm run build` passed.

## Manual QA Results

- SUPER_ADMIN login state was verified with a local backend-signed access token for `admin@hesba.local`.
- `/ar/admin/users` loaded successfully.
- Clicking View Details for `qa.target.admin@hesba.local` opened `/ar/admin/users/[id]` without redirecting to sign-in.
- Returning to `/ar/admin/users`, each row action opened a local dialog or confirm and the URL stayed on `/ar/admin/users`.
- `/ar/admin/users/[id]/permissions` loaded as the compact checkbox matrix.
- A safe permission toggle was changed and saved successfully.
- No `STEP_UP_REQUIRED` prompt appeared because `STEP_UP_ENABLED=false` in local development.
- The audit page showed the new event for the permission override update.
- SUPPORT access was verified with a seeded backend-signed token and `/ar/admin/users` showed the safe `Access Denied` view.
- FINANCE_STAFF access was verified with a seeded backend-signed token and `/ar/admin/users` showed the safe `Access Denied` view after the frontend route-role mapping fix.
- PATIENT access was blocked safely from `/ar/admin/users`.
- Logout was verified by hitting the app logout route, which cleared the cookies locally.
- The admin login endpoint was still under a pre-existing throttle window from earlier QA probing, so the final browser pass used seeded backend-signed sessions instead of repeating interactive sign-in. The backend auth flow itself was still verified by unit tests and the local JWT/session data was real, not mocked.

## Remaining Gaps

- `npm run lint` still reports pre-existing repository warnings outside this phase.
- Local step-up remains disabled by design in this environment, so the QA pass validates the non-step-up path rather than a prompted re-auth flow.
- The working tree contains many unrelated pre-existing modifications from other phases; this report only covers the files listed above.

## Final Answer

Are the TestSprite QA failures fixed? yes
