# Auth Module API

## Purpose Of Module

Auth Module provides the Phase 1 authentication baseline for:

- patient auth with Google and email/password
- practitioner auth with password step + OTP verification step
- admin login/refresh/logout baseline
- JWT access/refresh tokens
- persisted auth sessions
- password reset baseline
- current authenticated user context

## Endpoints

### Patient

- `POST /auth/patient/google`
- `POST /auth/patient/register`
- `POST /auth/patient/login`
- `POST /auth/patient/refresh`
- `POST /auth/patient/logout`

### Practitioner

- `POST /auth/practitioner/register`
- `POST /auth/practitioner/login`
- `POST /auth/practitioner/login/verify-otp`
- `POST /auth/practitioner/refresh`
- `POST /auth/practitioner/logout`
- `POST /auth/practitioner/forgot-password`
- `POST /auth/practitioner/reset-password`

### Admin

- `POST /auth/admin/login`
- `POST /auth/admin/refresh`
- `POST /auth/admin/logout`

### Shared

- `GET /auth/me`

## Guards Used

- `JwtAccessAuthGuard`
  - used for `GET /auth/me`
- `JwtRefreshAuthGuard`
  - used for refresh/logout endpoints
- public endpoints are marked with `@Public()`

## Main DTOs

- `PatientGoogleAuthDto`
- `PatientEmailPasswordRegisterDto`
- `PatientEmailPasswordLoginDto`
- `PractitionerRegisterDto`
- `PractitionerLoginDto`
- `PractitionerVerifyOtpDto`
- `ForgotPasswordDto`
- `ResetPasswordDto`
- `RefreshTokenDto`
- `AdminLoginDto`
- `CurrentAuthUserResponseDto`

## Response Envelope Contract (Freeze)

All success responses follow:

- `success: true`
- `data: <endpoint payload>`

Auth payload examples inside `data`:

- token-bearing auth payload (`message`, `tokens`, `user`)
- message payload (`message`)
- OTP challenge payload
- current auth-user context payload

## Main Use Cases

- shared foundation:
  - `IssueAuthTokensUseCase`
  - `InvalidateUserTokensUseCase`
  - `RefreshAuthSessionUseCase`
  - `RevokeAuthSessionUseCase`
  - `HashPasswordUseCase`
  - `VerifyPasswordUseCase`
  - `GetCurrentAuthUserUseCase`
- patient:
  - `RegisterPatientWithGoogleUseCase`
  - `RegisterPatientWithEmailPasswordUseCase`
  - `LoginPatientWithEmailPasswordUseCase`
  - `RefreshPatientTokenUseCase`
  - `LogoutPatientUseCase`
- practitioner:
  - `RegisterPractitionerAccountUseCase`
  - `LoginPractitionerPasswordUseCase`
  - `VerifyPractitionerLoginOtpUseCase`
  - `RequestPractitionerPasswordResetUseCase`
  - `ResetPractitionerPasswordUseCase`
  - `RefreshPractitionerTokenUseCase`
  - `LogoutPractitionerUseCase`
- admin:
  - `LoginAdminUseCase`
  - `RefreshAdminTokenUseCase`
  - `LogoutAdminUseCase`

## Important Security Notes

- `/auth/me` is auth/session-oriented and returns the normalized authenticated request context, while `/users/me` is the product-facing current-user summary endpoint
- practitioner password login does not issue tokens; OTP verification is mandatory before full authentication
- OTP is sent only to a verified channel selected through the practitioner 2FA/contact baseline
- forgot-password responses stay generic to reduce account enumeration risk
- refresh/logout rely on persisted sessions and server-side revocation
- refresh/logout validate the presented refresh token against the persisted session hash, not only the JWT signature
- access and refresh tokens both include `tokenVersion`, and request hydration rejects tokens whose version no longer matches `User.tokenVersion`
- password reset now performs coarse-grained invalidation by incrementing `tokenVersion` and revoking all active sessions in one transaction
- the same invalidation primitive is intended for future password change, logout-all-sessions, and admin force logout-all flows
- practitioner password reset verifies the latest active reset challenge for the practitioner user, so the flow remains valid whether the OTP was delivered by email or SMS
- patient Google and email/password are both supported, but this baseline refuses silent merging into non-patient accounts

## Out Of Scope

- patient profile management beyond minimal auth bootstrap
- practitioner onboarding/profile completion/application submission
- advanced RBAC beyond auth baseline
- sessions, payments, chat, articles, reviews, training
- advanced notification delivery orchestration
