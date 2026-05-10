# Presence Module API

## Purpose
Presence Module owns the practitioner's **current live state** only.

This module is responsible for:
- explicit live states: `OFFLINE`, `ONLINE`, `AWAY`, `BUSY`
- explicit instant-booking readiness flag
- last seen / heartbeat freshness timestamps
- practitioner self-service live-state management
- public-safe live indicator reads

This module does **not** own:
- weekly schedule availability
- availability exceptions
- session lifecycle orchestration
- instant-booking request orchestration
- payments
- video room logic

## Endpoints

### Practitioner self-service
- `GET /api/v1/practitioners/me/presence`
- `PUT /api/v1/practitioners/me/presence/status`
- `PUT /api/v1/practitioners/me/presence/instant-booking`
- `POST /api/v1/practitioners/me/presence/heartbeat`

### Public read
- `GET /api/v1/public/practitioners/:slug/presence`

## Guards

### Self-service routes
- `JwtAccessAuthGuard`
- `RolesGuard`
- `@Roles(AppRole.PRACTITIONER)`
- `@RequireAccountStates(ACTIVE_ACCOUNT, PRACTITIONER_OTP_VERIFIED)`

### Public route
- `@Public()`
- visibility enforced through shared `PublicPractitionerVisibilityPolicy`

## Main DTOs
- `SetMyPresenceStatusDto`
- `SetMyInstantBookingAvailabilityDto`
- `PresenceResponseDto`

## Main Use Cases
- `GetMyPresenceUseCase`
- `SetMyPresenceStatusUseCase`
- `SetMyInstantBookingAvailabilityUseCase`
- `HeartbeatMyPresenceUseCase`
- `GetPublicPractitionerPresenceUseCase`

## Business Rules
- presence is distinct from recurring schedule availability
- `BUSY` is distinct from `OFFLINE`
- `isInstantBookingEnabled` is distinct from generic status
- heartbeat refreshes live timestamps and can bootstrap a non-manual offline row to ONLINE when the practitioner app becomes active
- public presence must not leak for hidden/non-public practitioners

## Response Notes
- self-service reads return full practitioner-owned presence shape
- public reads return only public-safe fields: `status`, `isInstantBookingEnabled`, `lastSeenAt`

## Localization Notes
- success/error messages use `presence.*` message keys in shared i18n catalogs

## Out Of Scope
- websockets/realtime transport
- automatic session-driven BUSY reconciliation
- instant-booking orchestration
- availability-now policy engine
