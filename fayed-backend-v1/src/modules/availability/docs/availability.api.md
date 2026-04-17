# Availability Module API

## Purpose
Availability Module owns practitioner recurring schedule management and temporary schedule overrides.

This module is responsible for:
- recurring weekly availability slots
- temporary availability exceptions (`BLOCK`, `OPEN_EXTRA`)
- timezone-aware availability window derivation
- practitioner self-service schedule management
- public-safe read APIs for later booking/schedule viewing

This module explicitly does **not** own:
- presence / online indicators
- session lifecycle
- booking creation
- payment holds or payment state
- video room provisioning

## Endpoints

### Practitioner self-service
- `GET /api/v1/practitioners/me/availability`
- `PUT /api/v1/practitioners/me/availability/weekly-slots`
- `POST /api/v1/practitioners/me/availability/exceptions`
- `PATCH /api/v1/practitioners/me/availability/exceptions/:id`
- `DELETE /api/v1/practitioners/me/availability/exceptions/:id`

### Public read
- `GET /api/v1/public/practitioners/:slug/availability`
- `GET /api/v1/public/practitioners/:slug/availability/windows?from=...&to=...`

## Guards

### Self-service routes
- `JwtAccessAuthGuard`
- `RolesGuard`
- `@Roles(AppRole.PRACTITIONER)`
- `@RequireAccountStates(ACTIVE_ACCOUNT, PRACTITIONER_OTP_VERIFIED)`

### Public routes
- `@Public()`
- protected by existing public practitioner visibility policy at the use-case level

## Main DTOs
- `ReplaceWeeklyAvailabilityDto`
- `CreateAvailabilityExceptionDto`
- `UpdateAvailabilityExceptionDto`
- `ListPublicPractitionerAvailabilityWindowsDto`

## Main Use Cases
- `GetMyAvailabilityUseCase`
- `ReplaceWeeklyAvailabilityUseCase`
- `CreateAvailabilityExceptionUseCase`
- `UpdateAvailabilityExceptionUseCase`
- `DeleteAvailabilityExceptionUseCase`
- `GetPublicPractitionerAvailabilityUseCase`
- `ListPublicPractitionerAvailabilityWindowsUseCase`

## Business Rules
- recurring weekly slots must not overlap on the same day
- weekly slot granularity is enforced at 15 minutes in V1
- practitioner timezone is the source of truth for recurring schedule interpretation
- exceptions are stored as concrete UTC datetimes
- `BLOCK` overrides all other availability
- `OPEN_EXTRA` adds temporary windows outside or alongside weekly schedule
- public reads require the practitioner to satisfy existing public visibility rules

## Response Notes
- self-service `GET /me/availability` returns timezone, recurring slots, and upcoming active exceptions
- public `/availability` returns only recurring weekly slots and timezone
- public `/availability/windows` returns derived UTC windows for the requested range
- exception `reason` is never exposed on public endpoints

## Localization Notes
- business success/error messages use `availability.*` message keys in the shared i18n catalogs
- public read errors reuse localized not-found/range-validation messages

## Out Of Scope
- presence / live availability
- availability locking
- session creation
- booking confirmation
- payment authorization
- video provider integration
