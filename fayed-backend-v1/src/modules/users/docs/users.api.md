# Users Module API

## Purpose Of Module

Users Module provides a read-only baseline above Auth Module for the currently authenticated user.
It is responsible for:

- current user basics
- current user roles
- account/security state summary
- linked patient/practitioner profile summary

It is intentionally not responsible for:

- auth flows
- password or OTP flows
- profile editing
- onboarding transitions
- admin role editing

## Endpoints

- `GET /users/me`
- `GET /users/me/roles`
- `GET /users/me/security-state`

## Guards Used

- `JwtAccessAuthGuard`
  - all endpoints require an authenticated access-token context

## Main DTOs

- `CurrentUserSummaryResponseDto`
- `CurrentUserRolesResponseDto`
- `CurrentUserSecurityStateResponseDto`
- `CurrentUserProfileLinksResponseDto`

## Main Use Cases

- `GetCurrentUserUseCase`
- `GetCurrentUserSummaryUseCase`
- `ListCurrentUserRolesUseCase`
- `GetCurrentUserSecurityStateUseCase`
- `GetCurrentUserProfileLinksUseCase`

## Response Shape Notes

- `/users/me` is the main bootstrapping response for frontend applications
- `/users/me` is product-facing and should be preferred for UI summaries, profile-link awareness, and account state rendering
- the response separates:
  - top-level user basics
  - `identitySummary` for masked contact hints
  - `roles` for normalized application roles
  - `securityState` for verification/account gating
  - `profileLinks` for patient/practitioner linkage only
- no raw database rows, session secrets, token details, or auth-internal flags are exposed
- all success responses are envelope-based:
  - `success: true`
  - `data: <endpoint payload>`

## Notes And Assumptions

- Users Module resolves data from the database rather than trusting token claims for profile/account state
- `hasPractitionerOtpVerifiedSession` is derived from the current authenticated request context and indicates whether the active practitioner access token belongs to a session that already passed the OTP gate
- the module is read-only by design so later Patients/Practitioners modules can own profile mutation logic cleanly

## Out Of Scope

- login/register/logout/refresh
- password reset and OTP flows
- session management
- patient/practitioner profile updates
- practitioner onboarding and applications
- specialty assignment
- admin role management
