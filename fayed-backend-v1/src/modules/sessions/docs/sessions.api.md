# Sessions Module API

## Purpose

Sessions Module is the platform source of truth for scheduled consultation bookings.
It owns scheduled session creation, lifecycle persistence, patient/practitioner ownership reads, and cancellation baseline.

This module intentionally does **not** own:

- recurring weekly availability
- availability exceptions
- practitioner live presence
- instant booking request orchestration
- payment gateway logic

## Endpoints

### Patient self-service

- `POST /api/v1/patients/me/sessions`
- `GET /api/v1/patients/me/sessions`
- `GET /api/v1/patients/me/sessions/:id`
- `POST /api/v1/patients/me/sessions/:id/cancel`
- `POST /api/v1/patients/me/sessions/:id/runtime/prepare`
- `GET /api/v1/patients/me/sessions/:id/runtime/join`

### Practitioner self-service

- `GET /api/v1/practitioners/me/sessions`
- `GET /api/v1/practitioners/me/sessions/:id`
- `POST /api/v1/practitioners/me/sessions/:id/mark-completed`
- `POST /api/v1/practitioners/me/sessions/:id/mark-no-show`
- `POST /api/v1/practitioners/me/sessions/:id/runtime/prepare`
- `GET /api/v1/practitioners/me/sessions/:id/runtime/join`

### Admin / Support operations

- `GET /api/v1/admin/sessions`
- `GET /api/v1/admin/sessions/:id/runtime-inspection`
- `GET /api/v1/admin/sessions/:id/attendance`

Admin sessions list returns visibility-first operational list data:

- optional status filter (`status`)
- optional delayed-only filter (`late=true`)
- optional ownership filters (`practitionerId`, `patientId`)
- optional scheduled range (`scheduledFrom`, `scheduledTo`)
- optional attendance gap filter (`missingAttendance=true`)
- stable pagination (`page`, `limit`)
- session item includes `isDelayed` computed from scheduled start + lifecycle status

Runtime inspection returns operational join-readiness context:

- current session lifecycle and mode
- current provider linkage (`provider`, `providerRoomId`, `providerSessionRef`)
- computed readiness flags (`canPrepareRuntime`, `canJoin`, `blockedReason`)

Attendance read returns persisted telemetry context:

- ordered attendance timeline (`JOINED` / `LEFT`) with participant role context
- participant identity summary (`userId`) when safely resolved during ingestion
- deterministic summary block:
  - `patientHasJoined`
  - `practitionerHasJoined`
  - `patientJoinedAt`
  - `practitionerJoinedAt`
  - `patientLeftAt`
  - `practitionerLeftAt`
  - `firstJoinedAt`
  - `lastLeftAt`

### Provider webhook ingestion

- `POST /api/v1/sessions/webhooks/daily`

Daily attendance webhook ingestion is visibility-first and append-safe:

- supports attendance event mapping for `participant.joined` and `participant.left`
- links provider room context to an existing session (`providerRoomId` / `providerSessionRef`)
- resolves participant role (`PATIENT` / `PRACTITIONER`) when identity is safely mappable
- persists structured attendance telemetry with idempotent ingestion key
- ignores unsupported provider event types explicitly without failing lifecycle ownership

## Guards Used

### Patient routes

- `JwtAccessAuthGuard`
- `RolesGuard`
- `@Roles(AppRole.PATIENT)`
- `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT)`

### Practitioner routes

- `JwtAccessAuthGuard`
- `RolesGuard`
- `@Roles(AppRole.PRACTITIONER)`
- `@RequireAccountStates(AccountStateRequirement.ACTIVE_ACCOUNT, AccountStateRequirement.PRACTITIONER_OTP_VERIFIED)`

## Main DTOs

- `CreateScheduledSessionDto`
- `CancelSessionDto`
- `ListSessionsDto`
- `SessionItemResponseDto`
- `SessionDetailsResponseDto`
- `SessionsListSuccessResponseDto`
- `SessionRuntimeItemSuccessResponseDto`
- `SessionJoinItemSuccessResponseDto`
- `AdminSessionAttendanceSuccessResponseDto`

## Main Use Cases

- `CreateScheduledSessionUseCase`
- `GetMyPatientSessionsUseCase`
- `GetMyPractitionerSessionsUseCase`
- `GetAdminSessionAttendanceUseCase`
- `GetSessionDetailsUseCase`
- `MarkSessionCompletedByPractitionerUseCase`
- `MarkSessionNoShowByPractitionerUseCase`
- `PrepareSessionRuntimeUseCase`
- `ResolveSessionJoinContractUseCase`
- `CancelSessionUseCase`
- `ExpireUnpaidSessionUseCase`

## Lifecycle Notes

- V1 scheduled bookings are created in `PENDING_PAYMENT`
- Payments module will later own payment confirmation and unpaid expiry orchestration
- Sessions module already enforces transition rules and keeps them explicit in `ValidateSessionStatusTransitionService`

## Availability Relationship

- Sessions consume Availability-derived windows
- Sessions do not store weekly schedule data
- Requested scheduled windows must fit a derived public/bookable availability window
- Conflict detection is still baseline only and does not implement distributed reservation locking yet

## Response Shape Notes

### Create/details

`data.item` returns a stable session object with:

- session identity
- lifecycle status
- scheduled start/end times in UTC
- duration
- session mode
- patient/practitioner ownership summaries
- baseline cancellation/expiry/completion metadata

### List

`data.items` returns stable list items with:

- session identity
- lifecycle status
- scheduled timing
- duration
- patient/practitioner summaries

`data.pagination` returns:

- `page`
- `limit`
- `totalItems`
- `totalPages`

## Out of Scope

- instant booking request flow
- payment capture / refund implementation
- practitioner-initiated cancellation and refund-policy orchestration
- recording/transcription and advanced telehealth controls
- multi-provider video parity beyond Daily baseline
- presence orchestration
- admin attendance timeline read surface (delivered in next slice)
- automated status jobs beyond baseline domain helpers

## Operational Notifications Baseline

- session confirmation emits operational notifications to patient and practitioner
- patient-initiated cancellation emits operational notifications to patient and practitioner
- notifications are best-effort and do not block lifecycle transitions
