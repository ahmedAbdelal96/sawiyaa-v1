# Phase 11B - Backend Admin User Management Implementation (2026-05-12)

Project: `D:\Web\full-projects\fayed\fayed-backend-v1`

Scope: backend only (no frontend/mobile). No new migrations were added in Phase 11B.

## 1) Executive Verdict

**complete (backend ready for Phase 11C frontend integration)**

Core internal admin-user management APIs are implemented with:
- fine-grained permissions
- step-up enforcement for sensitive mutations
- audit logging for sensitive mutations
- throttling for create/sensitive mutations
- guardrails (last SUPER_ADMIN protection, self-lockout prevention, privilege escalation checks)
- focused unit/contract tests

Known limitation (intentional for Phase 11B):
- No admin invite/reset-password email flow implemented. Admin user creation requires an explicit password in the request (still never logged/audited).

## 2) What Was Implemented

### 2.1 Permissions (New Permission Keys)
Added to backend enum:
- `admin-users.read`
- `admin-users.create`
- `admin-users.update`
- `admin-users.status.update`
- `admin-users.roles.update`
- `admin-users.permission-overrides.read`
- `admin-users.permission-overrides.update`
- `admin-users.sessions.revoke`
- `admin-users.token-version.invalidate`

Code:
- [permission-key.enum.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/enums/permission-key.enum.ts)

### 2.2 Seed Updates (Permission Definitions + Role Bundles)
Seeded permissions and updated role bundles:
- SUPER_ADMIN: gets all permissions (existing behavior).
- ADMIN: gets all permissions **except**:
  - `admin-users.permission-overrides.read`
  - `admin-users.permission-overrides.update`
  Rationale: permission override management is SUPER_ADMIN-only by default.
- Other roles (SUPPORT/FINANCE/CONTENT/etc): do not receive admin user management permissions.

Code:
- [auth.seed.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/seed/modules/auth.seed.ts)
- Seed matrix tests:
  - [auth.seed.spec.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/seed/modules/auth.seed.spec.ts)

### 2.3 Throttling Policies
Added throttle policies:
- `admin-users-create`
- `admin-users-sensitive-mutation`

Code:
- [throttle-policy-config.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/throttle/throttle-policy-config.ts)

### 2.4 Admin Users Module
New module wired into AdminModule:
- [admin.module.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/admin.module.ts)
- [admin-users-admin.module.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/admin-users-admin.module.ts)

Endpoints implemented in:
- [admin-users.controller.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/controllers/admin-users.controller.ts)

Core logic pieces:
- Repository:
  - [admin-users.repository.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/repositories/admin-users.repository.ts)
- Guardrail policy:
  - [admin-user-management.policy.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/policies/admin-user-management.policy.ts)
- Use-cases:
  - [list-admin-users.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/list-admin-users.use-case.ts)
  - [get-admin-user.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/get-admin-user.use-case.ts)
  - [create-admin-user.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/create-admin-user.use-case.ts)
  - [patch-admin-user.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/patch-admin-user.use-case.ts)
  - [update-admin-user-status.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/update-admin-user-status.use-case.ts)
  - [update-admin-user-roles.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/update-admin-user-roles.use-case.ts)
  - [list-admin-user-permission-overrides.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/list-admin-user-permission-overrides.use-case.ts)
  - [update-admin-user-permission-overrides.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/update-admin-user-permission-overrides.use-case.ts)
  - [revoke-admin-user-sessions.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/revoke-admin-user-sessions.use-case.ts)
  - [invalidate-admin-user-tokens.use-case.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/users/use-cases/invalidate-admin-user-tokens.use-case.ts)

### 2.5 i18n Messages
Added admin-users keys for success/errors:
- [en/admin.catalog.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/i18n/catalogs/en/admin.catalog.ts)
- [ar/admin.catalog.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/i18n/catalogs/ar/admin.catalog.ts)

## 3) Endpoint Table (Permissions + Step-up + Audit)

All routes:
- Require access token + admin-class role (controller-level)
- Enforce fine-grained permissions via `@Permissions`
- Sensitive mutations enforce step-up via `@RequireStepUp`
- Sensitive mutations are audited (success)

1. `GET /admin/users`
- Permission: `admin-users.read`
- Step-up: no
- Audit: none (read)

2. `GET /admin/users/:id`
- Permission: `admin-users.read`
- Step-up: no
- Audit: none (read)

3. `POST /admin/users`
- Permission: `admin-users.create`
- Step-up: yes (`security.adminUsers.create`)
- Throttle: `admin-users-create`
- Audit: `security.adminUsers.create.success` / failure logged for conflict/unexpected

4. `PATCH /admin/users/:id`
- Permission: `admin-users.update`
- Step-up: yes (`security.adminUsers.update`)
- Throttle: `admin-users-sensitive-mutation`
- Audit: `security.adminUsers.update.success`

5. `PATCH /admin/users/:id/status`
- Permission: `admin-users.status.update`
- Step-up: yes (`security.adminUsers.status.update`)
- Throttle: `admin-users-sensitive-mutation`
- Audit: `security.adminUsers.status.update.success`
- Extra security: disabling status revokes sessions + bumps tokenVersion

6. `PATCH /admin/users/:id/roles`
- Permission: `admin-users.roles.update`
- Step-up: yes (`security.adminUsers.roles.update`)
- Throttle: `admin-users-sensitive-mutation`
- Audit: `security.adminUsers.roles.update.success`

7. `GET /admin/users/:id/permission-overrides`
- Permission: `admin-users.permission-overrides.read` (SUPER_ADMIN-only by default)
- Step-up: no
- Audit: none (read)

8. `PATCH /admin/users/:id/permission-overrides`
- Permission: `admin-users.permission-overrides.update` (SUPER_ADMIN-only by default)
- Step-up: yes (`security.adminUsers.permissionOverrides.update`)
- Throttle: `admin-users-sensitive-mutation`
- Audit: `security.adminUsers.permissionOverrides.update.success`

9. `POST /admin/users/:id/sessions/revoke`
- Permission: `admin-users.sessions.revoke`
- Step-up: yes (`security.adminUsers.sessions.revoke`)
- Throttle: `admin-users-sensitive-mutation`
- Audit: `security.adminUsers.sessions.revoke.success`

10. `POST /admin/users/:id/token-version/invalidate`
- Permission: `admin-users.token-version.invalidate`
- Step-up: yes (`security.adminUsers.tokenVersion.invalidate`)
- Throttle: `admin-users-sensitive-mutation`
- Audit: `security.adminUsers.tokenVersion.invalidate.success`

## 4) Permission Assignment Table (Default)

Granted:
- SUPER_ADMIN: all admin-users permissions
- ADMIN:
  - `admin-users.read`
  - `admin-users.create`
  - `admin-users.update`
  - `admin-users.status.update`
  - `admin-users.roles.update`
  - `admin-users.sessions.revoke`
  - `admin-users.token-version.invalidate`

Not granted (default):
- ADMIN:
  - `admin-users.permission-overrides.read`
  - `admin-users.permission-overrides.update`
- SUPPORT / FINANCE_STAFF / CONTENT_REVIEWER / PRACTITIONER_REVIEWER / PATIENT_OPERATIONS / MARKETING_STAFF:
  - none of the admin-users.* keys

## 5) Security Guardrails Implemented

1. Internal-only target protection:
- List/get are scoped to users who have at least one internal role.
- Mutations reject non-internal targets.

2. Self-lockout protection:
- Mutations block self-targeting (status/roles/overrides/session revoke/token invalidate).

3. Last SUPER_ADMIN protection:
- Cannot disable last SUPER_ADMIN (status mutation).
- Cannot remove SUPER_ADMIN role from last SUPER_ADMIN (roles mutation).
- Cannot DENY admin-users control permissions for last SUPER_ADMIN (overrides mutation).

4. Privilege escalation:
- Non-super-admin cannot assign SUPER_ADMIN role.
- Non-super-admin cannot grant ALLOW overrides for permissions they do not effectively have.

## 6) Migration Status

No migration required/added for this feature:
- Uses existing schema primitives: `User`, `UserEmail`, `UserPhone`, `AuthIdentity`, `UserRole`, `UserPermissionOverride`, `UserSession`, `tokenVersion`.

## 7) Commands Run (Verification)

Backend:
- `npm audit --audit-level=moderate` (0 vulnerabilities)
- `npm run build` (pass)
- `npx prisma validate` (pass)
- `npx prisma migrate status` (up to date)

Tests run (new + existing focused):
- `npx jest --runInBand prisma/seed/modules/auth.seed.spec.ts` (pass)
- `npx jest --runInBand src/modules/admin/users/controllers/admin-users.controller.access.spec.ts` (pass)
- `npx jest --runInBand src/modules/admin/users/use-cases/update-admin-user-status.use-case.spec.ts` (pass)
- `npx jest --runInBand src/modules/admin/users/use-cases/update-admin-user-roles.use-case.spec.ts` (pass)
- `npx jest --runInBand src/modules/admin/users/use-cases/update-admin-user-permission-overrides.use-case.spec.ts` (pass)
- Plus previously-existing security tests (step-up/csrf/throttle/permissions) (pass)

## 8) Remaining Gaps / Follow-ups

1. Admin invite/reset-password flows:
- Not implemented in Phase 11B.
- Options for Phase 11C/11D+:
  - add “invite link” flow
  - add dedicated admin password reset endpoint
  - throttle + audit these flows heavily

2. Frontend UI (Phase 11C):
- `/admin/users` list/details + STEP_UP_REQUIRED UX + mutation flows.

## 9) Final Answer

Is backend Admin User Management ready for frontend integration? **Yes**.

Backend constraints for Phase 11C:
- Frontend must handle `STEP_UP_REQUIRED` by prompting re-auth and calling `POST /auth/admin/step-up/verify`.
- Frontend must not assume it can manage patient/practitioner public accounts via these endpoints (internal users only).
