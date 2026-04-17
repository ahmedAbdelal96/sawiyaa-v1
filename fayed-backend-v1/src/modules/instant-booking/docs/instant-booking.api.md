# Instant Booking Module API

## Purpose

Instant Booking Module owns the immediate request/decision lifecycle for live-ready practitioners.
It is intentionally separate from:

- recurring availability management
- presence state ownership
- sessions lifecycle ownership
- payment gateway implementation
- video provider orchestration

Accepted requests create a real `Session`, but `Session` remains the actual booking source of truth.

## Endpoints

### Patient

- `POST /api/v1/patients/me/instant-booking-requests`
- `GET /api/v1/patients/me/instant-booking-requests`
- `GET /api/v1/patients/me/instant-booking-requests/:id`
- `POST /api/v1/patients/me/instant-booking-requests/:id/cancel`

### Practitioner

- `GET /api/v1/practitioners/me/instant-booking-requests/pending`
- `POST /api/v1/practitioners/me/instant-booking-requests/:id/accept`
- `POST /api/v1/practitioners/me/instant-booking-requests/:id/reject`

## Guards

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

## Main Use Cases

- `CreateInstantBookingRequestUseCase`
- `GetPatientInstantBookingRequestUseCase`
- `ListPatientInstantBookingRequestsUseCase`
- `CancelInstantBookingRequestUseCase`
- `ListPractitionerPendingInstantBookingRequestsUseCase`
- `AcceptInstantBookingRequestUseCase`
- `RejectInstantBookingRequestUseCase`
- `ExpireInstantBookingRequestUseCase`

## Eligibility Rules

Instant booking requests are allowed only when:

- practitioner is publicly visible
- practitioner presence is `ONLINE`
- `isInstantBookingEnabled = true`
- practitioner is not `BUSY`
- current immediate window fits availability-derived windows
- no blocking session conflict exists

## Lifecycle Notes

- requests start in `PENDING`
- requests can become `ACCEPTED`, `REJECTED`, `EXPIRED`, or `CANCELLED`
- accepted requests create a linked Session with `flowType = INSTANT`
- created Session still starts in `PENDING_PAYMENT` to preserve honest payment boundaries

## Out of Scope

- websocket/realtime push transport
- payment capture/confirmation
- Daily room creation
- instant booking search/discovery ranking
- broader public UX orchestration
