# Availability Module API

## Purpose
Availability Module owns practitioner availability-week management and temporary schedule overrides.

This module is responsible for:
- Sunday-based current/next availability week management
- draft and published week lifecycle
- recurring weekly slot storage inside each availability week
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
- `GET /api/v1/practitioners/me/availability/weeks/current-next`
- `POST /api/v1/practitioners/me/availability/weeks`
- `PATCH /api/v1/practitioners/me/availability/weeks/:weekId`
- `POST /api/v1/practitioners/me/availability/weeks/:weekId/copy-to-next`
- `POST /api/v1/practitioners/me/availability/weeks/:weekId/publish`

### Public read
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
- `CreateAvailabilityWeekDto`
- `UpdateAvailabilityWeekDto`
- `AvailabilityWeekOverviewSuccessResponseDto`
- `AvailabilityWeekMutationSuccessResponseDto`
- `ListPublicPractitionerAvailabilityWindowsDto`

## Main Use Cases
- `GetMyAvailabilityWeeksUseCase`
- `CreatePractitionerAvailabilityWeekUseCase`
- `UpdatePractitionerAvailabilityWeekUseCase`
- `CopyPractitionerAvailabilityWeekToNextUseCase`
- `PublishPractitionerAvailabilityWeekUseCase`
- `ListPublicPractitionerAvailabilityWindowsUseCase`

## Business Rules
- each practitioner week is Sunday-based and stored with explicit `weekStartDate` / `weekEndDate`
- only `PUBLISHED` availability weeks are used by public availability, practitioner discovery, and matching readiness
- draft weeks can be created, updated, and copied; published weeks are immutable in normal practitioner flows
- recurring weekly slots must not overlap on the same day when they share the same duration
- weekly slot granularity remains enforced at 30 minutes in V1
- each recurring weekly slot declares an explicit booking duration of `30` or `60` minutes
- practitioner timezone is the source of truth for week interpretation and slot derivation
- exceptions are stored as concrete UTC datetimes
- `BLOCK` overrides all other availability
- `OPEN_EXTRA` adds temporary windows outside or alongside weekly schedule
- public reads require the practitioner to satisfy existing public visibility rules

## Response Notes
- self-service `GET /weeks/current-next` returns the current and next availability weeks in practitioner timezone, including overview/reminder state
- week mutation endpoints return the mutated week plus refreshed overview data
- public `/availability/windows` returns derived UTC windows for the requested range, including the slot duration that produced each window
- public `/availability/windows` can optionally return public-safe `bookedSlots` when `includeBooked=true`
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
