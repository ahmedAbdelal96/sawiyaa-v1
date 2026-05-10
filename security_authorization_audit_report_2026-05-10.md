# 1. Executive Summary

Current security maturity: Medium.

The platform has a solid structural baseline: JWT access/refresh flows with session persistence, token rotation, tokenVersion invalidation, route-area segregation in web and mobile, and many ownership-aware use-cases. However, multiple high-impact authorization design gaps remain, especially around admin sub-role segmentation and finance/support data boundaries.

Biggest risks:

- Admin-class overreach: support roles currently access finance, payments, settlements, and audit domains in backend and frontend.
- Coarse admin model: backend runtime role model collapses SUPER_ADMIN into ADMIN and has no fine-grained permission checks.
- Mobile role drift: mobile contracts/storage still include admin role paths in types and parsing, despite mobile business rule being patient/practitioner only.
- Missing enforced auth throttling framework: ThrottlePolicy decorator is metadata only; no global rate-limit enforcement is wired.

Immediate blockers before production hardening:

- Implement permission-level admin authorization for finance/support/content/operations domains.
- Remove support access from finance/payment/audit surfaces unless explicitly required and approved.
- Remove admin role from mobile contracts/storage/runtime role resolver.
- Add effective rate limiting for auth, OTP, reset, and verification endpoints.

Overall recommendation:
Adopt RBAC + fine-grained permissions + ownership/ABAC policies. Keep backend as the sole security boundary; frontend/mobile guards remain UX-only.

# 2. Current Auth Model

How login works:

- Auth context is hydrated by global middleware [src/modules/auth/services/auth-request-context.middleware.ts](fayed-backend-v1/src/modules/auth/services/auth-request-context.middleware.ts), which attempts bearer/cookie/body tokens and attaches request.user if valid.
- Token verification and session binding occur in [src/modules/auth/services/auth-request-context.service.ts](fayed-backend-v1/src/modules/auth/services/auth-request-context.service.ts).
- Role-specific auth controllers:
  - Patient: [src/modules/auth/controllers/patient-auth.controller.ts](fayed-backend-v1/src/modules/auth/controllers/patient-auth.controller.ts)
  - Practitioner (password + OTP): [src/modules/auth/controllers/practitioner-auth.controller.ts](fayed-backend-v1/src/modules/auth/controllers/practitioner-auth.controller.ts)
  - Admin: [src/modules/auth/controllers/admin-auth.controller.ts](fayed-backend-v1/src/modules/auth/controllers/admin-auth.controller.ts)

How refresh works:

- Refresh JWT is validated, role-scoped against expected role(s), and matched against persisted refresh hash in session row.
- Core flow: [src/modules/auth/use-cases/refresh-auth-session.use-case.ts](fayed-backend-v1/src/modules/auth/use-cases/refresh-auth-session.use-case.ts)
- Session hash check: [src/modules/auth/services/auth-session.service.ts](fayed-backend-v1/src/modules/auth/services/auth-session.service.ts)

How logout/session revocation works:

- Role-specific logout endpoints use refresh guard and revoke current session id.
- Session persistence and revocation: [src/modules/auth/repositories/user-session.repository.ts](fayed-backend-v1/src/modules/auth/repositories/user-session.repository.ts)

How roles are represented:

- Prisma enum: UserRoleType includes PATIENT, PRACTITIONER, ADMIN, SUPPORT, CONTENT_REVIEWER, SUPER_ADMIN in [prisma/schema.prisma](fayed-backend-v1/prisma/schema.prisma).
- Runtime guard enum: AppRole only ADMIN, SUPPORT_AGENT, CONTENT_REVIEWER, PATIENT, PRACTITIONER in [src/common/enums/app-role.enum.ts](fayed-backend-v1/src/common/enums/app-role.enum.ts).
- SUPER_ADMIN is mapped to ADMIN in [src/modules/auth/utils/auth-role.util.ts](fayed-backend-v1/src/modules/auth/utils/auth-role.util.ts).

Current strengths:

- Refresh token rotation with hashed persisted refreshTokenHash.
- tokenVersion enforcement in request auth context and refresh path.
- OTP challenge model with code hashing, expiry, max attempts, and cooldown policy.
- Global validation pipe with whitelist + forbidNonWhitelisted in [src/main.ts](fayed-backend-v1/src/main.ts).

Current weaknesses:

- No effective throttling enforcement despite ThrottlePolicy metadata (see [src/common/decorators/throttle-policy.decorator.ts](fayed-backend-v1/src/common/decorators/throttle-policy.decorator.ts)).
- SUPER_ADMIN semantic privileges are not differentiated from ADMIN at guard layer.
- Cookie + bearer dual mode exists; CSRF posture is not explicitly hardened for cookie-only flows.

# 3. Current Authorization Model

Existing guards/decorators/policies:

- JWT guards: [src/common/guards/authentication/jwt-access-auth.guard.ts](fayed-backend-v1/src/common/guards/authentication/jwt-access-auth.guard.ts), [src/common/guards/authentication/jwt-refresh-auth.guard.ts](fayed-backend-v1/src/common/guards/authentication/jwt-refresh-auth.guard.ts)
- Role guard: [src/common/guards/authorization/roles.guard.ts](fayed-backend-v1/src/common/guards/authorization/roles.guard.ts)
- Specialized guards: admin/support/content reviewer + practitioner/account-state guards
- Ownership and policy examples:
  - Session ownership: [src/modules/sessions/use-cases/get-session-details.use-case.ts](fayed-backend-v1/src/modules/sessions/use-cases/get-session-details.use-case.ts)
  - Support ownership policy: [src/modules/support/policies/support-ticket-access.policy.ts](fayed-backend-v1/src/modules/support/policies/support-ticket-access.policy.ts)

Role checks:

- Mostly controller-level @Roles with JwtAccessAuthGuard + RolesGuard.
- Some sensitive mutation endpoints add method-level @Roles(AppRole.ADMIN) and AdminGuard.

Permission checks:

- No first-class permission entity/check middleware found.
- Authorization is role-centric with occasional method-level narrowing.

Ownership checks:

- Present in multiple use-cases (patient/practitioner self scope, actorType checks).
- Not consistently represented in controller decorators, mostly enforced inside use-cases/repositories.

Missing concepts:

- Fine-grained permission catalog enforcement.
- Step-up auth for sensitive admin actions.
- Central policy engine for cross-domain decisioning (finance/support/PII boundaries).

# 4. Recommended Authorization Architecture

Recommended model for Fayed: RBAC + fine-grained permissions + ABAC ownership policies.

Design:

- RBAC controls area access (patient, practitioner, admin-class).
- Permission checks gate sensitive operations and domain actions.
- ABAC/policy checks enforce ownership and context constraints (session assignment, refund amount thresholds, assignment-based support visibility).

Examples:

- Role: FINANCE_STAFF
- Permission: finance.payments.read
- Permission: finance.refunds.approve
- Permission: finance.settlements.execute
- Policy: refunds.approve requires amount <= threshold unless SUPER_ADMIN

# 5. Proposed Roles

Core product roles:

- PATIENT
- PRACTITIONER

Admin domain roles:

- SUPER_ADMIN
- ADMIN
- SUPPORT_AGENT
- FINANCE_STAFF
- MARKETING_STAFF
- PRACTITIONER_REVIEWER
- PATIENT_OPERATIONS
- CONTENT_REVIEWER

Role vs permission guidance:

- Keep PATIENT and PRACTITIONER as hard roles.
- Keep SUPER_ADMIN as hard role with immutable high privilege.
- Use operational roles for team identity; use permissions for actual capability.
- Allow multi-role assignment per admin user with explicit deny/allow overrides.

# 6. Proposed Permission Catalog

auth.\*

- auth.login
- auth.refresh
- auth.logout
- auth.sessions.revoke
- auth.otp.issue
- auth.otp.verify

users.\*

- users.read.self
- users.read.admin
- users.update.self
- users.roles.read
- users.roles.assign

patients.\*

- patients.read.self
- patients.read.admin
- patients.update.self
- patients.avatar.manage

practitioners.\*

- practitioners.read.self
- practitioners.read.public
- practitioners.read.admin
- practitioners.update.self
- practitioners.approval.view

practitionerApplications.\*

- practitionerApplications.read
- practitionerApplications.update
- practitionerApplications.approve
- practitionerApplications.reject
- practitionerApplications.requestChanges

sessions.\*

- sessions.read.self
- sessions.read.admin
- sessions.create.patient
- sessions.manage.cancellation
- sessions.runtime.prepare
- sessions.runtime.join

payments.\*

- payments.read.self
- payments.read.admin
- payments.operations.read
- payments.gateway.control

refunds.\*

- refunds.read
- refunds.request
- refunds.retry
- refunds.approve
- refunds.cancel

ledger.\*

- ledger.read
- ledger.read.entry
- ledger.export

wallet.\*

- wallet.read.self
- wallet.read.admin
- wallet.adjust

settlements.\*

- settlements.read
- settlements.generate
- settlements.markPaid
- settlements.markFailed
- settlements.payout.record

support.\*

- support.ticket.create.self
- support.ticket.read.self
- support.ticket.read.admin
- support.ticket.assign
- support.ticket.note.internal

careChat.\*

- careChat.request.read.self
- careChat.request.read.admin
- careChat.request.decide
- careChat.conversation.read.self
- careChat.conversation.read.admin

chatModeration.\*

- chatModeration.report.read
- chatModeration.report.act

articles.\*

- articles.read.public
- articles.read.admin
- articles.create
- articles.update
- articles.publish

contentModeration.\*

- contentModeration.review
- contentModeration.approve
- contentModeration.reject

notifications.\*

- notifications.read.self
- notifications.preferences.manage
- notifications.templates.manage
- notifications.dispatch

settings.\*

- settings.read.self
- settings.update.self

config.\*

- config.read.internal
- config.update
- config.sensitive.update

reports.\*

- reports.read.sessions
- reports.read.revenue
- reports.read.support
- reports.read.payouts

audit.\*

- audit.read
- audit.read.sensitive

marketing.\*

- marketing.content.read
- marketing.campaign.manage
- marketing.analytics.read

# 7. Backend API Permission Matrix

Full matrix generated from all backend controllers (389 endpoints):

- [artifacts/backend_api_permission_matrix.json](artifacts/backend_api_permission_matrix.json)

Notes:

- Matrix source extraction: [fayed-backend-v1/artifacts/backend-endpoint-matrix.json](fayed-backend-v1/artifacts/backend-endpoint-matrix.json)
- Includes method, path, controller, current protection, inferred role requirement, ownership note, risk level, fix placeholder.

High-risk highlights from matrix verification:

- Admin/support shared access on finance operations: [src/modules/financial-operations/controllers/admin-finance-operations.controller.ts](fayed-backend-v1/src/modules/financial-operations/controllers/admin-finance-operations.controller.ts)
- Admin/support shared access on patient payment views: [src/modules/payments/controllers/admin-patient-payments.controller.ts](fayed-backend-v1/src/modules/payments/controllers/admin-patient-payments.controller.ts)
- Admin/support shared access on refund operations: [src/modules/payments/controllers/admin-payment-refunds.controller.ts](fayed-backend-v1/src/modules/payments/controllers/admin-payment-refunds.controller.ts)
- Admin/support shared access on audit log: [src/modules/notifications/controllers/admin-audit-log.controller.ts](fayed-backend-v1/src/modules/notifications/controllers/admin-audit-log.controller.ts)

# 8. Frontend Route Permission Matrix

Full route matrix generated from app routes/layouts (155 route entries):

- [artifacts/frontend_route_permission_matrix.json](artifacts/frontend_route_permission_matrix.json)

Route guard foundation:

- Edge route-area enforcement: [src/proxy.ts](fayed-frontend-v1/src/proxy.ts)
- Server-side area guard in layouts: [src/lib/auth/access.ts](fayed-frontend-v1/src/lib/auth/access.ts)

Important observation:

- Admin area currently accepts all admin-class roles uniformly in [src/config/route-access.ts](fayed-frontend-v1/src/config/route-access.ts), without page-level permission segmentation.

# 9. Mobile Screen Permission Matrix

Full mobile screen matrix generated from Expo router app tree (67 screens):

- [artifacts/mobile_screen_permission_matrix.json](artifacts/mobile_screen_permission_matrix.json)

Mobile guard foundation:

- Runtime segment guard and auth flow: [src/providers/AuthProvider.tsx](fayed-mobile/src/providers/AuthProvider.tsx)
- Root redirection: [app/index.tsx](fayed-mobile/app/index.tsx)

Important observation:

- No admin screen group exists under app routes, which aligns with requirement.
- But mobile auth contracts/storage still include admin role in type/runtime parsing.

# 10. Sensitive Data Protection Review

Reviewed categories and status:

Patient private data, sessions, assessments, messages:

- Ownership checks appear in major use-cases (example session details) and support policy paths.
- Risk remains for broad admin/support visibility due coarse role segmentation.

Payments/ledger/provider payloads:

- Webhooks verify signatures/HMAC and are idempotent (good).
- Payment mapper includes clientSecret/checkoutUrl fields in response model: [src/modules/payments/mappers/payment.mapper.ts](fayed-backend-v1/src/modules/payments/mappers/payment.mapper.ts). Must ensure exposure only on intended endpoints/actors.

Practitioner documents/credentials:

- Admin operations exist for credentials and practitioner applications; role segmentation should be tightened by permissions.

OTPs/refresh/password hashes:

- Stored as hashes in schema and services (good):
  - password hash via bcrypt
  - refresh token hash via bcrypt
  - OTP hash via sha256

Push tokens:

- Mobile push registration flow exists; routing currently patient-focused for notification taps.

# 11. Security Hardening Checklist

JWT

- Keep separate access/refresh secrets and short access TTL.
- Add strict audience claim and optional jti for replay analytics.

Refresh rotation/revocation

- Keep current hash match + rotate + revoke model.
- Add refresh replay detection telemetry and automatic account/session lock policy for suspicious reuse.

tokenVersion

- Keep existing checks in request hydration and refresh path.
- Add explicit admin action to invalidate by user/session scope with audit reason.

Session management

- Add device fingerprint metadata and optional risk scoring.
- Add admin UI for session inventory and selective revoke.

Password hashing

- Current bcrypt rounds are acceptable; keep env constrained.

OTP rate limits

- Implement real endpoint/IP/user throttling middleware.
- Keep per-challenge attempts + cooldown already present.

Brute-force protection

- Add progressive delay and lockout policy per account + IP.

2FA/step-up for admins

- Enforce admin OTP/step-up for sensitive actions (settlements, refunds, roles, config, patient-private-data views).

Admin IP/device/session controls

- Add optional IP allowlist, device trust, session anomaly detection.

CORS

- Keep strict origin list in production; never allow wildcard with credentials.

Security headers

- helmet enabled; review CSP policy and frame-ancestors per deployment.

Validation

- Global ValidationPipe with whitelist/forbidNonWhitelisted is enabled (good).

File uploads

- Add explicit file size/mime limits in interceptor config for all upload routes.

Audit logs

- Add guaranteed audit coverage for sensitive admin mutations and role/permission changes.

Rate limiting

- Add throttler module or equivalent at gateway + auth endpoints.

CSRF

- If cookie auth remains supported, enforce anti-CSRF tokens for cookie-based sensitive POST/PATCH/DELETE flows.

Secure mobile storage

- Replace AsyncStorage for auth tokens with secure storage (Keychain/Keystore via Expo SecureStore).

Deep-link validation

- Keep route resolver allowlist and role checks.
- Validate deep-link parameters rigorously for payment/session routes.

Payment callback validation

- Keep provider signature verification and idempotent event handling.

Webhook signature verification

- Already implemented for Stripe and Paymob; keep secret rotation procedures.

Database indexes/constraints

- Core auth/session indexes exist; review for permission/audit query scale.

Backups

- Ensure encrypted backups and tested restore runbooks.

Logging without leaking secrets

- Ensure tokens, OTP codes, raw provider secrets are never logged.

# 12. Critical Findings

## Critical

1. Coarse admin-class access allows support role to finance/payment/audit domains

- Affected files:
  - [src/modules/financial-operations/controllers/admin-finance-operations.controller.ts](fayed-backend-v1/src/modules/financial-operations/controllers/admin-finance-operations.controller.ts)
  - [src/modules/financial-operations/controllers/admin-settlements.controller.ts](fayed-backend-v1/src/modules/financial-operations/controllers/admin-settlements.controller.ts)
  - [src/modules/payments/controllers/admin-payment-refunds.controller.ts](fayed-backend-v1/src/modules/payments/controllers/admin-payment-refunds.controller.ts)
  - [src/modules/payments/controllers/admin-patient-payments.controller.ts](fayed-backend-v1/src/modules/payments/controllers/admin-patient-payments.controller.ts)
  - [src/modules/notifications/controllers/admin-audit-log.controller.ts](fayed-backend-v1/src/modules/notifications/controllers/admin-audit-log.controller.ts)
- Affected routes: multiple under /api/v1/admin/finance, /admin/settlements, /admin/payments, /admin/audit
- Risk: support users can read or trigger finance-sensitive operations beyond support remit
- Exploit example: support account accesses settlement or refund operations and views detailed financial traces
- Recommended fix: enforce permission checks and split finance capabilities to FINANCE_STAFF only
- Estimated effort: Medium
- Fix layer: Backend + Frontend

2. No enforced auth throttling despite security-sensitive ThrottlePolicy markers

- Affected files:
  - [src/common/decorators/throttle-policy.decorator.ts](fayed-backend-v1/src/common/decorators/throttle-policy.decorator.ts)
  - auth controllers using @ThrottlePolicy
- Affected routes: login/register/refresh/OTP/reset endpoints
- Risk: brute-force, OTP abuse, credential stuffing
- Exploit example: repeated login attempts with no effective route-level rate limit enforcement
- Recommended fix: integrate throttler middleware with per-policy limits and IP/user dimensions
- Estimated effort: Medium
- Fix layer: Backend

## High

3. SUPER_ADMIN is collapsed to ADMIN in runtime mapping

- Affected file: [src/modules/auth/utils/auth-role.util.ts](fayed-backend-v1/src/modules/auth/utils/auth-role.util.ts)
- Risk: inability to enforce stronger controls for super-admin-only actions
- Exploit example: any ADMIN-equivalent path receives same capability as SUPER_ADMIN
- Recommended fix: preserve SUPER_ADMIN as first-class runtime role and enforce higher policy gates
- Estimated effort: Low-Medium
- Fix layer: Backend + Frontend

4. Mobile role model still includes admin role in contracts/storage parsing

- Affected files:
  - [src/features/auth/contracts.ts](fayed-mobile/src/features/auth/contracts.ts)
  - [src/features/auth/storage.ts](fayed-mobile/src/features/auth/storage.ts)
  - [src/features/auth/roles.ts](fayed-mobile/src/features/auth/roles.ts)
- Risk: accidental admin-state handling on mobile and future regression exposure
- Exploit example: malformed role payload resolves to admin branch in role resolver fallback
- Recommended fix: remove admin from mobile role union and reject unknown roles explicitly
- Estimated effort: Low
- Fix layer: Mobile

5. Admin area route guard is area-based only; no page-level permission gating in frontend

- Affected files:
  - [src/config/route-access.ts](fayed-frontend-v1/src/config/route-access.ts)
  - [src/config/navigation/admin.tsx](fayed-frontend-v1/src/config/navigation/admin.tsx)
- Risk: all admin-class roles can navigate to all admin pages (UX leakage); backend still protects, but exposure and misuse risk increase
- Exploit example: support role sees finance navigation and repeatedly hits restricted actions
- Recommended fix: permission-aware menu and route-level page guards
- Estimated effort: Medium
- Fix layer: Frontend

6. Support ticket admin retrieval is unrestricted by assignment policy

- Affected files:
  - [src/modules/support/use-cases/get-admin-support-ticket.use-case.ts](fayed-backend-v1/src/modules/support/use-cases/get-admin-support-ticket.use-case.ts)
  - [src/modules/support/repositories/support-ticket.repository.ts](fayed-backend-v1/src/modules/support/repositories/support-ticket.repository.ts)
- Risk: support/admin role can access any ticket regardless of assignment model expectations
- Exploit example: support employee reads unrelated sensitive ticket threads
- Recommended fix: enforce assignment or team-scope policy where required by business rules
- Estimated effort: Medium
- Fix layer: Backend

## Medium

7. Upload endpoint uses generic FileInterceptor without explicit limits in controller

- Affected file: [src/modules/patients/controllers/patient-profile.controller.ts](fayed-backend-v1/src/modules/patients/controllers/patient-profile.controller.ts)
- Risk: oversized/malformed uploads rely on downstream validation; potential resource abuse
- Recommended fix: enforce interceptor-level size/mime limits consistently
- Estimated effort: Low
- Fix layer: Backend

8. CSRF protections are not explicit while cookie auth support exists

- Affected files:
  - [src/main.ts](fayed-backend-v1/src/main.ts)
  - [src/modules/auth/services/auth-request-context.middleware.ts](fayed-backend-v1/src/modules/auth/services/auth-request-context.middleware.ts)
- Risk: cookie-based endpoints may be vulnerable if browser sends cookies in cross-site contexts
- Recommended fix: add CSRF token strategy or enforce header-only token auth for state-changing endpoints
- Estimated effort: Medium
- Fix layer: Backend + Frontend

## Low

9. Public academy enrollment endpoints are intentionally open but should remain monitored

- Affected file: [src/modules/academy/controllers/public-academy.controller.ts](fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts)
- Risk: abuse/spam load on public enrollment endpoints
- Recommended fix: anti-automation controls, abuse monitoring, captcha where appropriate
- Estimated effort: Low
- Fix layer: Backend

# 13. Implementation Roadmap

Phase 0: Audit confirmation and permission matrix approval

- Confirm backend/frontend/mobile matrices and approve role-permission model.

Phase 1: Backend authorization foundation

- Introduce permission entities and authorization guard/decorator for permissions.
- Preserve SUPER_ADMIN as distinct runtime role.

Phase 2: Admin roles and permissions

- Create admin sub-role permission bundles.
- Remove implicit support access from finance/audit unless explicitly approved.

Phase 3: Object-level ownership policies

- Centralize ownership policy services for sessions/payments/support/care-chat.
- Add assignment-based support visibility if required by operations policy.

Phase 4: Frontend route guards and admin menu gating

- Add permission-aware route/page guard wrappers.
- Filter admin navigation by permission catalog.

Phase 5: Mobile guards and deep-link hardening

- Remove admin role from mobile model.
- Keep strict route allowlist and role checks for notification/deep link entry.

Phase 6: Security hardening and rate limits

- Enforce throttling for auth/OTP/reset.
- Add step-up authentication for sensitive admin actions.
- Strengthen CSRF/cookie strategy.

Phase 7: Tests and penetration-style validation

- Add automated authz/IDOR test suites and run targeted abuse scenarios.

# 14. Test Plan

Backend unit tests:

- Policy tests for session ownership, support assignment rules, care-chat visibility.
- Permission guard tests (allow/deny per role+permission).

Backend e2e tests:

- Forbidden checks for cross-role endpoint access.
- IDOR tests for patient A vs patient B, practitioner A vs practitioner B.
- Finance action tests for non-finance roles.
- Support and care-chat visibility tests by assignment and role.

Security tests:

- Auth brute-force and OTP abuse simulation with expected throttling responses.
- Refresh token replay/rotation misuse tests.
- Webhook signature tampering tests.

Frontend tests:

- Route-area guard tests in proxy and layout guards.
- Admin menu visibility by permission.
- 401/403 handling and redirect behavior.

Mobile tests:

- Segment guard tests for patient/practitioner separation.
- Deep-link tests for payment return, session links, notification href mapping.
- Unknown/unsupported role bootstrap tests must force logout and auth route.

---

Appendix: Full generated matrices

- [artifacts/backend_api_permission_matrix.json](artifacts/backend_api_permission_matrix.json)
- [artifacts/frontend_route_permission_matrix.json](artifacts/frontend_route_permission_matrix.json)
- [artifacts/mobile_screen_permission_matrix.json](artifacts/mobile_screen_permission_matrix.json)
