# Admin Practitioner Applications API

## Purpose Of This Admin Scope

This scope handles **admin review/application management** for practitioner onboarding applications.

It owns:
- list practitioner applications for admin review
- fetch one application details snapshot
- approve application
- reject application
- baseline decision traceability (`status`, `reviewedAt`, `reviewNotes`)

It does not own:
- practitioner self-service profile/update flows
- auth/login/session flows
- specialties source-of-truth management
- sessions/payments/analytics/reviewer-assignment engines

## Endpoints

- `GET /admin/practitioner-applications`
- `GET /admin/practitioner-applications/:id`
- `POST /admin/practitioner-applications/direct-create`
- `POST /admin/practitioner-applications/:id/approve`
- `POST /admin/practitioner-applications/:id/reject`

## Guards Used

All endpoints are admin-only and protected by:
- `JwtAccessAuthGuard`
- `AdminGuard`
- `@RequireAccountStates(ACTIVE_ACCOUNT)` (via `ActiveAccountGuard`)

No public endpoints are exposed in this scope.

## Main DTOs

- `ListPractitionerApplicationsDto`
- `CreateAdminPractitionerDto`
- `ApprovePractitionerApplicationDto`
- `RejectPractitionerApplicationDto`
- `PractitionerApplicationListItemResponseDto`
- `PractitionerApplicationDetailsResponseDto`
- `PractitionerApplicationDecisionResponseDto`

## Main Use Cases

- `ListPractitionerApplicationsUseCase`
- `GetPractitionerApplicationDetailsUseCase`
- `CreateAdminPractitionerUseCase`
- `ApprovePractitionerApplicationUseCase`
- `RejectPractitionerApplicationUseCase`

## Response Shape Notes

List response includes:
- application ids/status/timestamps
- practitioner/user identifiers
- display name + country + practitioner type
- primary specialty summary

Details response includes:
- applicant basics (email/phone summary, locale/timezone/country)
- professional profile (title, bio, years, languages, specialties)
- credentials metadata summary
- application summary
- readiness snapshot (`isProfileCompleted`, `hasRequiredSpecialties`, `hasRequiredCredentials`, `canBeReviewed`, `canBeApproved`)

Decision responses return:
- updated application decision state (`status`, `reviewedAt`, `reviewNotes`)
- practitioner/user linkage ids
- note: reviewer identity is not included because current schema has no `reviewedByUserId` on `PractitionerApplication`

## Transition Rules Notes

- Approve/reject allowed only from:
  - `SUBMITTED`
  - `UNDER_REVIEW`
- Approve also requires baseline readiness (`canBeApproved=true`) so incomplete profiles are not approved by mistake.
- `APPROVED` -> approve/reject is blocked with conflict
- `REJECTED` -> approve/reject is blocked with conflict
- other states are treated as non-reviewable in this baseline
- transitions are re-checked inside DB transaction to avoid race-condition double decisions
- approve/reject are therefore idempotent in behavior (second same decision is rejected with conflict)

Transition decisions are centralized in:
- `PractitionerApplicationTransitionPolicy`

Readiness snapshot logic is centralized in:
- `PractitionerApplicationReviewPolicy`

Consistency side-effects:
- approve updates both:
  - `PractitionerApplication.status = APPROVED`
  - `PractitionerProfile.status = APPROVED`
- reject updates both:
  - `PractitionerApplication.status = REJECTED`
  - `PractitionerProfile.status = REJECTED`
- both updates happen in one DB transaction to avoid mismatch.

## Reject Reason / Resubmission Notes

- reject endpoint requires `reason` (mandatory).
- `note` is optional.
- both are persisted into `reviewNotes` in current schema baseline.
- re-submission after rejection is handled by practitioner self-service flow (Practitioners Module) and remains outside this admin scope.

## Localized Messages Notes

- success and business errors are localized via `I18nService` + `messageKey`.
- keys live under:
  - `admin.practitionerApplications.success.*`
  - `admin.practitionerApplications.errors.*`
  - `admin.practitionerApplications.notifications.*`

## Traceability Notes

Current schema supports baseline traceability through:
- `status`
- `reviewedAt`
- `reviewNotes`

Current schema does **not** provide a dedicated reviewer-id field on `PractitionerApplication`,
so reviewer identity is not persisted there in this baseline.

## Notifications Baseline Notes

- approve/reject notification queueing is best-effort.

## Direct-create behavior (admin-only)

- `POST /admin/practitioner-applications/direct-create` creates practitioner account + approved profile/application in one transaction.
- Intended for admin onboarding cases where practitioner self-submission should be bypassed.
- Supports optional initial profile enrichment:
  - `bio`
  - `yearsOfExperience`
  - `specialtyIds` (active specialties only)
  - `credentials[]` (`credentialType`, `fileUrl`, optional `expiresAt`)
- Baseline writes:
  - `User` (ACTIVE)
  - `UserRole` (`PRACTITIONER`)
  - `UserEmail` (primary + verified)
  - `AuthIdentity` (`PASSWORD`)
  - `TwoFactorSetting` (required, preferred email)
  - `PractitionerProfile` (`APPROVED`)
  - optional `PractitionerSpecialty` links
  - optional `PractitionerCredential` rows
  - `PractitionerApplication` (`APPROVED`, with `submittedAt` + `reviewedAt`)
- Out of scope:
  - bulk import/invite
  - advanced admin profile authoring
  - reviewer identity field persistence (schema currently stores review notes/timestamp only)
- missing notification type seeds do not fail admin decisions.
- runtime notification queue failures are swallowed with warning logs so decision updates remain authoritative.

## Out Of Scope

- reviewer assignment workflow
- queue prioritization engine
- OCR/AI document validation
- admin analytics dashboards
- practitioner profile editing from admin outside decision status updates
