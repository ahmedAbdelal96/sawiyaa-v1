# Practitioners Module API

> Note:
> Public read-only endpoints (`GET /public/practitioners`, `GET /public/practitioners/:slug`) are documented separately in:
> `docs/practitioners.public.api.md`
> to keep practitioner self-service and public-contract concerns isolated.

## Purpose Of Module

Practitioners Module provides the Phase 1 baseline for the current practitioner's own professional profile surface.
It is responsible for:

- reading current practitioner profile summary
- updating baseline practitioner profile fields
- linking specialties to practitioner profile
- managing credential metadata records
- readiness evaluation for application submit
- practitioner self-submission baseline and status summary

It is intentionally not responsible for:

- auth flows (login/register/otp/reset)
- admin review/approval workflows
- sessions, availability, presence
- pricing runtime orchestration
- payments, wallets, settlements
- content/reviews/training flows

## Endpoints

- `GET /practitioners/me`
- `PATCH /practitioners/me`
- `PUT /practitioners/me/specialties`
- `GET /practitioners/me/specialties`
- `POST /practitioners/me/credentials`
- `GET /practitioners/me/credentials`
- `POST /practitioners/me/application/submit`
- `GET /practitioners/me/application`
- `GET /practitioners/me/readiness`

## Guards Used

- `JwtAccessAuthGuard`
- `RolesGuard` with `PRACTITIONER`
- `ActiveAccountGuard` via `@RequireAccountStates(ACTIVE_ACCOUNT)`
- `PractitionerOtpVerifiedGuard` via `@RequireAccountStates(PRACTITIONER_OTP_VERIFIED)`

Notes:
- `PRACTITIONER_OTP_VERIFIED` is a session-derived access requirement (completed OTP step in current practitioner session), not a persisted profile column.
- It is still composed through `@RequireAccountStates(...)` for consistent guard wiring across modules.

## Main DTOs

- `UpdatePractitionerProfileDto`
- `SetPractitionerSpecialtiesDto`
- `UploadPractitionerCredentialMetadataDto`
- `SubmitPractitionerApplicationDto`
- `PractitionerProfileResponseDto`
- `PractitionerProfileReadinessResponseDto`
- `PractitionerApplicationStatusResponseDto`
- `PractitionerCredentialResponseDto`

## Main Use Cases

- `CreatePractitionerProfileUseCase`
- `GetPractitionerProfileUseCase`
- `UpdatePractitionerProfileUseCase`
- `SetPractitionerSpecialtiesUseCase`
- `ListPractitionerSpecialtiesUseCase`
- `UploadPractitionerCredentialMetadataUseCase`
- `ListPractitionerCredentialsUseCase`
- `GetPractitionerProfileReadinessUseCase`
- `SubmitPractitionerApplicationUseCase`
- `GetPractitionerApplicationStatusUseCase`

## Response Shape Notes

- profile response is frontend-oriented and includes:
  - practitioner profile basics
  - linked specialties
  - linked language codes
  - readiness summary
  - credential summary
  - latest application status summary
- no raw Prisma shape, auth/session internals, payment/session details, or admin-only review internals are exposed

## Profile Creation Behavior

- `GET /practitioners/me` is explicitly side-effect free and never creates a profile.
- Profile bootstrap is handled only in write/init paths (`PATCH /me`, specialties set, credentials upload, application submit) via `CreatePractitionerProfileUseCase`.

## Localized Messages Notes

- success messages are resolved via `I18nService.t(...)`
- business errors use `messageKey` so global exception filter localizes responses
- practitioners module keys are namespaced under `practitioners.*`

## Specialties Boundary Notes

- practitioners module only validates and links specialty ids
- specialty master records remain outside this module
- no specialty create/update/delete logic exists here

## Credentials / Application Boundary Notes

- credentials flow is metadata-only baseline
- duplicate credential metadata for same practitioner (`credentialType + fileUrl`) is rejected
- no storage-provider or moderation workflow is implemented here
- application flow is self-submit + status summary only
- duplicate submit is guarded (`SUBMITTED`, `UNDER_REVIEW`, `APPROVED` are blocked)
- admin review lifecycle (approve/reject/queue assignment) is deferred

## Out Of Scope

- auth flows
- admin review workflow
- sessions/availability/presence
- payments/wallet/settlements
- public practitioner discovery listing
- articles/reviews/training flows
