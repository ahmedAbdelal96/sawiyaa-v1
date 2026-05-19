# Phase 11A — Admin User Management Discovery & Design (2026-05-12)

Workspace: `D:\Web\full-projects\fayed`

Scope (discovery/design only):
- Backend: `D:\Web\full-projects\fayed\fayed-backend-v1`
- Web frontend: `D:\Web\full-projects\fayed\fayed-frontend-v1`
- No implementation, no migrations, no mobile work in Phase 11A

## 1) Executive Summary

Fayed already has the **core primitives** needed to implement secure Admin User Management:
- A unified `User` identity model with multi-role support (`UserRole`), `UserStatus`, and `tokenVersion`.
- Role-permission mapping (`RolePermission`) and user overrides (`UserPermissionOverride`) with **DENY precedence** and **SUPER_ADMIN bypass**.
- Enforced step-up (`@RequireStepUp` + `StepUpGuard`) and an existing admin step-up verify endpoint (`POST /auth/admin/step-up/verify`).
- Security audit logging (`SecurityAuditService`) with “fire-and-forget” semantics.
- Throttling infrastructure (`@ThrottlePolicy` + guard/store) for abuse-sensitive endpoints.

What is **missing** is a dedicated set of admin endpoints/UI for managing **internal platform users** (admin-class accounts), plus a carefully scoped permission set and guardrails:
- Listing internal users, creating them, editing status/roles, editing overrides, revoking sessions, and token invalidation.
- Prevent “last SUPER_ADMIN” lockout, self-demotion/self-disable, and privilege escalation.
- UI handling for `STEP_UP_REQUIRED` across sensitive mutations (roles, overrides, session revoke, disable/enable).

Recommended implementation path:
1. Phase 11B (backend): add `AdminUsersModule` (controllers/use-cases/repositories), new PermissionKeys, audits, step-up on sensitive mutations, and minimal DTO validation. Avoid migrations if possible.
2. Phase 11C (frontend): add `/admin/users` list + details + modals, reuse `AdminPermissionGate`, implement STEP_UP_REQUIRED re-auth modal using `POST /auth/admin/step-up/verify`.
3. Phase 11D (verification/audit): targeted authorization/IDOR tests + audit coverage verification + UX verification.

## 2) Backend Inventory (What Exists Today)

### 2.1 User & Auth Data Model
Source: [schema.prisma](/D:/Web/full-projects/fayed/fayed-backend-v1/prisma/schema.prisma)

Key models:
- `User`: `id`, `displayName`, `status` (`UserStatus`), `tokenVersion` (global invalidation), `defaultLocale`, `timezone`. Has relations:
  - `emails: UserEmail[]` (unique email, `isPrimary`, `isVerified`)
  - `phones: UserPhone[]` (unique phone, `isPrimary`, `isVerified`)
  - `authIdentities: AuthIdentity[]` (includes `passwordHash`)
  - `roles: UserRole[]` (multi-role records)
  - `permissionOverrides: UserPermissionOverride[]`
  - `sessions: UserSession[]` (refresh rotation / revocation + step-up state)
- `AuthIdentity`: includes `provider` and `passwordHash` (supports password login)
- `UserRole`: `(userId, role)` unique, `role` is enum `UserRoleType`
- `Permission`: `key` (unique string)
- `RolePermission`: `(role, permissionId)` unique
- `UserPermissionOverride`: `(userId, permissionId)` unique with `effect` = `ALLOW|DENY`
- `UserSession`: includes `refreshTokenHash`, `revokedAt`, and **step-up state**:
  - `stepUpVerifiedAt`, `stepUpExpiresAt`

Admin-class roles exist as enums:
- Backend canonical roles: [app-role.enum.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/enums/app-role.enum.ts)
- Persisted role enum: `UserRoleType` in Prisma schema (note: SUPPORT role is persisted as `SUPPORT` while app-level role is `SUPPORT_AGENT`)

### 2.2 Auth Flows (Admin/Patient/Practitioner)
Admin auth controller exists:
- [admin-auth.controller.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/auth/controllers/admin-auth.controller.ts)
  - `POST /auth/admin/login` (throttled)
  - `POST /auth/admin/refresh` (throttled)
  - `POST /auth/admin/logout`
  - `POST /auth/admin/step-up/verify` (password re-auth; throttled)

Notes:
- Patient and practitioner have self-registration flows.
- Practitioner has password reset OTP flows; **admin does not currently have a dedicated invite/reset-password flow** (discovery finding).

### 2.3 RBAC, Permissions, Overrides
Permission keys enum currently contains operational/finance/support/privacy keys, but **no admin-user-management keys yet**:
- [permission-key.enum.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/enums/permission-key.enum.ts)

Authorization plumbing:
- [permissions.guard.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/guards/authorization/permissions.guard.ts)
  - Uses `PermissionResolverService.hasPermissions()`
  - Logs denied attempts via `SecurityAuditService` (`security.permission.denied`)
- [permission-resolver.service.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/common/guards/authorization/permission-resolver.service.ts)
  - SUPER_ADMIN bypass
  - DENY overrides win
  - Also provides `resolvePermissions()` as source of truth for `/users/me/permissions`

Frontend-facing permissions endpoint exists:
- `GET /users/me/permissions` in [current-user.controller.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/users/controllers/current-user.controller.ts)

### 2.4 Step-up Enforcement
Step-up is real and wired as a guard:
- `@RequireStepUp('action.key')` decorator + StepUpGuard (see Phase 9B work)
- Admin verify endpoint: `POST /auth/admin/step-up/verify` (password re-auth)

Implication for Admin User Management:
- All high-risk mutations (role assignment, overrides, disable/enable, session revoke, token invalidation) should require step-up.

### 2.5 Audit Logging
Security audit exists in schema and service:
- `SecurityAuditLog` model in Prisma schema
- `SecurityAuditService` referenced by guards and sensitive paths (Phase 7/9 work)

Implication:
- Admin user management mutations should emit explicit audit events (success/failure/denied) with sanitized metadata (no passwords/tokens/OTP).

### 2.6 Rate Limiting / Throttling
Throttle infrastructure exists and is used on auth endpoints (e.g., admin login/refresh/step-up verify).

Implication:
- Admin create/invite/reset endpoints should be throttled, especially if they can trigger email/SMS.

### 2.7 Existing Admin User Management Endpoints
Discovery result:
- No dedicated endpoints found for:
  - `GET /admin/users` (list internal users)
  - `POST /admin/users` (create internal user)
  - role assignment endpoints
  - permission overrides endpoints
  - admin force logout/session revoke endpoints

There is an `AdminUserRepository` but it is scoped to practitioner application admin workflows (not general admin user management):
- [admin-user.repository.ts](/D:/Web/full-projects/fayed/fayed-backend-v1/src/modules/admin/practitioner-applications/repositories/admin-user.repository.ts)

## 3) Frontend Inventory (What Exists Today)

### 3.1 Admin Structure, Navigation, Permission Gate
Admin navigation is permission-filtered:
- [admin.tsx](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/config/navigation/admin.tsx)

Admin server-side permission gate exists and is deny-by-default:
- [AdminPermissionGate.tsx](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/components/admin/AdminPermissionGate.tsx)
  - Uses backend `/users/me/permissions` via `getServerCurrentUserPermissions()`
  - Shows in-place 403 UI (no redirect loops)

Admin route permission mapping exists:
- [admin-route-permissions.ts](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/config/admin-route-permissions.ts)

403 UX:
- [AdminForbiddenView.tsx](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/components/admin/AdminForbiddenView.tsx)

API posture:
- Client HTTP client: [http-client.ts](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/lib/api/http-client.ts)
  - 401 triggers refresh once; clears sensitive cache + redirects to signin on refresh failure
  - 403 clears sensitive cache and surfaces as AppError (does not logout)
- Server API client: [server-api-client.ts](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/lib/server-api-client.ts)
  - Reads access token server-side and fetches `/users/me/permissions`

### 3.2 Existing Pages Related to User Management
Discovery result:
- No existing `/admin/users` route/pages were found in the admin app folder.
- There are existing admin areas for sessions, patients, finance, audit, settings, etc., already permission-gated.

### 3.3 Step-up UX (Frontend)
Current frontend step-up UX exists specifically for payment-gateway-control and appears OTP-based, separate from the new password step-up verification endpoint:
- [admin-payment-gateway-control.api.ts](/D:/Web/full-projects/fayed/fayed-frontend-v1/src/features/admin/payment-gateway-control/api/admin-payment-gateway-control.api.ts)

Missing (for generalized step-up):
- A generic UI flow to handle backend `STEP_UP_REQUIRED` and perform password re-auth via `POST /auth/admin/step-up/verify`.

## 4) Required Permissions Design (Proposed)

Current backend PermissionKey naming is dotted strings (examples):
- `audit-log.read`
- `refunds.approve`
- `patients.read.admin`

Proposed new permission keys (aligning with the same style):
- `admin-users.read`
- `admin-users.create`
- `admin-users.update`
- `admin-users.status.update` (enable/disable/suspend)
- `admin-users.roles.update`
- `admin-users.permission-overrides.read`
- `admin-users.permission-overrides.update`
- `admin-users.sessions.revoke` (revoke sessions / force logout)
- `admin-users.token-version.invalidate` (global invalidation for a user)

Role bundle recommendation:
- SUPER_ADMIN: all of the above.
- ADMIN: likely `read/create/update/status.update/roles.update/sessions.revoke`, but **permission-overrides.update** should be restricted unless explicitly intended.
- SUPPORT_AGENT / FINANCE_STAFF / CONTENT_REVIEWER / PRACTITIONER_REVIEWER / PATIENT_OPERATIONS: **no admin-user-management permissions by default**.

Notes:
- Keep “permission override management” strictly limited. In many orgs: SUPER_ADMIN only.
- Consider separating “read internal users” from “mutate internal users”.

## 5) Backend API Design (Proposed)

### 5.1 Scope Definition: “Internal Platform Users”
Default rule (recommended):
- “Internal user” = a `User` who has at least one admin-class `UserRoleType`:
  - `SUPER_ADMIN`, `ADMIN`, `SUPPORT`, `FINANCE_STAFF`, `CONTENT_REVIEWER`, `PRACTITIONER_REVIEWER`, `PATIENT_OPERATIONS`, `MARKETING_STAFF`
- Admin User Management should **not** manage patient-only/practitioner-only accounts in Phase 11B unless explicitly expanded (separate product decision).

### 5.2 Endpoints (Draft)

All endpoints:
- Require admin auth (`JwtAccessAuthGuard` + role gate for admin-class roles).
- Use `@Permissions(...)` for authorization.
- Sensitive mutations require `@RequireStepUp(...)`.
- Emit audit events (`SecurityAuditService`) with sanitized metadata.
- Enforce pagination caps.

List:
1. `GET /admin/users`
   - Permission: `admin-users.read`
   - Step-up: no
   - Audit: optional (read audits are usually too noisy; consider only for “sensitive reads”)
   - Filters: `role`, `status`, `search`, `page`, `limit`

2. `GET /admin/users/:id`
   - Permission: `admin-users.read`
   - Step-up: no (unless exposing extremely sensitive fields, which should be excluded anyway)
   - Returns: display name, primary email/phone, roles, status, createdAt, last session activity summary (optional)

3. `POST /admin/users`
   - Permission: `admin-users.create`
   - Step-up: yes (`security.adminUsers.create`)
   - Audit: `security.adminUsers.create.(success|failure|denied)`
   - Payload (minimal, safe): `displayName`, `email`, optional `phone`, `roles[]`, `status`, `password` (explicit)
   - Notes:
     - There is no current admin invite/reset-password flow; initial Phase 11B can require an explicit password set by the creator (out-of-band delivery).
     - Validate email uniqueness (UserEmail unique).

4. `PATCH /admin/users/:id`
   - Permission: `admin-users.update`
   - Step-up: yes (`security.adminUsers.update`)
   - Audit: `security.adminUsers.update.*`
   - Updatable fields: `displayName`, `defaultLocale`, `timezone` (avoid auth identity changes here).

5. `PATCH /admin/users/:id/status`
   - Permission: `admin-users.status.update`
   - Step-up: yes (`security.adminUsers.status.update`)
   - Audit: `security.adminUsers.status.update.*`
   - Guardrails:
     - Cannot disable/demote last SUPER_ADMIN.
     - Cannot disable self (or require extra confirm + step-up; recommend disallow by default).

6. `PATCH /admin/users/:id/roles`
   - Permission: `admin-users.roles.update`
   - Step-up: yes (`security.adminUsers.roles.update`)
   - Audit: `security.adminUsers.roles.update.*`
   - Guardrails:
     - Prevent removing last SUPER_ADMIN
     - Prevent actor from assigning roles “above authority” (unless SUPER_ADMIN)
     - Prevent self-demotion/self-lockout

7. `GET /admin/users/:id/permission-overrides`
   - Permission: `admin-users.permission-overrides.read`
   - Step-up: optional (usually no)
   - Audit: optional

8. `PATCH /admin/users/:id/permission-overrides`
   - Permission: `admin-users.permission-overrides.update`
   - Step-up: yes (`security.adminUsers.permissionOverrides.update`)
   - Audit: `security.adminUsers.permissionOverrides.update.*`
   - Behavior:
     - Set ALLOW/DENY/remove override for a permission key.
     - DENY must win on evaluation (already true in resolver).
   - Guardrails:
     - Actor cannot grant permissions they themselves don’t have (unless SUPER_ADMIN).

9. `POST /admin/users/:id/sessions/revoke`
   - Permission: `admin-users.sessions.revoke`
   - Step-up: yes (`security.adminUsers.sessions.revoke`)
   - Audit: `security.adminUsers.sessions.revoke.*`
   - Behavior:
     - Revoke all sessions (set `revokedAt` for user sessions) or revoke by session id.
     - Optionally bump `tokenVersion` to globally invalidate access tokens.

10. `POST /admin/users/:id/token-version/invalidate`
   - Permission: `admin-users.token-version.invalidate`
   - Step-up: yes (`security.adminUsers.tokenVersion.invalidate`)
   - Audit: `security.adminUsers.tokenVersion.invalidate.*`
   - Behavior:
     - Increments `User.tokenVersion` and revokes sessions.

### 5.3 Tests (Backend) — Proposed
Focused tests (unit/controller access style):
- Permissions required on each endpoint.
- Step-up required on mutations.
- Support/finance/content/practitioner-reviewer cannot manage admin users.
- “Last SUPER_ADMIN” cannot be disabled/demoted.
- Self-demotion/self-disable prevented.
- Overrides: DENY wins; ALLOW grants; cannot grant above actor authority.
- Session revoke and token invalidation audited.

## 6) Frontend UI Design (Proposed)

Suggested routes (Next.js app router):
- `src/app/[locale]/(admin)/admin/users/page.tsx` (list)
- `src/app/[locale]/(admin)/admin/users/[id]/page.tsx` (details)

Gating:
- Wrap each page with `AdminPermissionGate`:
  - list/details: require `admin-users.read`
  - create/edit/roles/overrides/session revoke: check permissions and render controls conditionally

Screens:
1. Admin Users List
   - Table: search, role filter, status filter, pagination.
   - Row actions: view, disable/enable, edit roles, revoke sessions (only if permitted).

2. Admin User Details
   - Profile summary + roles + status
   - Overrides summary (if allowed)
   - Session revoke section (if allowed)

3. Create Admin User (modal/page)
   - Fields: displayName, email, optional phone, roles, status, password strategy.
   - Minimal v1: explicit password typed by creator (backend validates).
   - Future: invite/reset-password flow (requires backend support).

4. Role management UI
   - Add/remove roles (multi-select).
   - Step-up required: handle `STEP_UP_REQUIRED`.

5. Permission Overrides UI
   - List of PermissionKeys with ALLOW/DENY/none (for SUPER_ADMIN-only, recommended).
   - Show explanation: DENY wins.

## 7) Step-up UX Plan (Frontend)

Backend contract today:
- Sensitive routes can respond with 403 and error code `STEP_UP_REQUIRED`.
- Step-up verification endpoint exists:
  - `POST /auth/admin/step-up/verify` with password.

Frontend design (recommended minimal):
1. Any admin mutation that fails with `code === 'STEP_UP_REQUIRED'` opens a “Re-auth required” modal.
2. Modal submits password to `POST /auth/admin/step-up/verify`.
3. On success: close modal and retry the original mutation once (or ask user to click again).
4. Do not store or log the password.
5. Throttle feedback: show generic error on repeated failure.

Implementation note:
- Current `AppError` already preserves `code` from backend response (`error` field). Add a small helper `isStepUpRequired(error)` in frontend later (Phase 11C).

## 8) Data Model / Migration Assessment

Discovery finding:
- The schema already supports:
  - multi-role admin users (`UserRole`)
  - permission overrides (`UserPermissionOverride`)
  - status (`UserStatus`)
  - session revocation (`UserSession.revokedAt`)
  - global invalidation (`User.tokenVersion`)
  - step-up state (`UserSession.stepUpVerifiedAt/stepUpExpiresAt`)

Recommendation:
- **No migration needed** for Phase 11B core Admin User Management.

Optional future schema (only if product requires):
- Admin “createdByUserId” attribution, disable reason, lastRoleChangedAt.
- Admin invitation tokens (if moving to invite flow).

## 9) Security Rules / Edge Cases (Must-Haves)

1. Last SUPER_ADMIN protection:
- Cannot disable/demote last SUPER_ADMIN.

2. Self-management protection:
- Disallow self-disable and self-demotion by default.
- If allowing “revoke my sessions”, treat as logout (separate route).

3. Privilege escalation:
- Non-super-admin cannot assign roles above their authority.
- Non-super-admin cannot grant permission overrides they do not possess.

4. Internal vs public accounts:
- Admin User Management targets internal roles only by default.
- Patient/practitioner account management is a separate feature decision.

5. Step-up required:
- Roles update, status update, overrides update, session revoke, token invalidation.

6. Audit everything sensitive:
- create/update/status/roles/overrides/session revoke/token invalidate.

7. Throttling:
- Creation/invite/reset endpoints (especially if sending email/SMS) should have strict throttles.

## 10) Test Plan

Backend (Phase 11B):
- Access control tests for each endpoint (permissions + roles).
- Step-up enforcement tests for each mutation.
- Audit emission tests for key mutations.
- Guardrail tests: last SUPER_ADMIN, self-lockout.

Frontend (Phase 11C, if test framework exists):
- Nav hidden without permission.
- Page forbidden without permission.
- Controls hidden without mutation permissions.
- `STEP_UP_REQUIRED` opens re-auth modal.
- 403 does not logout.

If no frontend test framework: rely on typecheck/build/lint + manual verification checklist.

## 11) Rollout Plan

Phase 11B — Backend implementation:
- Add new PermissionKeys + seed into `Permission` and `RolePermission`.
- Implement `AdminUsersModule` with:
  - list/get/create/update/status/roles/overrides/session revoke/token invalidate
  - strict DTO validation + pagination caps
  - step-up on sensitive mutations
  - audit events

Phase 11C — Frontend implementation:
- Add `/admin/users` and `/admin/users/[id]`
- Add admin nav entry gated by `admin-users.read`
- Add “Re-auth required” modal for `STEP_UP_REQUIRED`

Phase 11D — Verification/audit:
- Focused access/IDOR regression tests
- Audit log verification for all sensitive mutations
- Manual admin UX verification

## 12) Final Answer

Is the current system ready to manage internal admin users (end-to-end feature)? **No**.
- The security primitives exist (RBAC, overrides, step-up, audit, throttling), but there are no dedicated backend APIs/UI for internal admin user lifecycle management.

Safest next phase: **Phase 11B (backend implementation)**, followed by Phase 11C (frontend UI) and Phase 11D verification.

