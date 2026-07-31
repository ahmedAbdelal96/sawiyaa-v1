# Availability Module API

## Purpose
Availability Module owns practitioner availability-week management and temporary schedule overrides.

This module is responsible for:
- Sunday-based rolling weekly session schedule management
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
- `GET /api/v1/practitioners/me/availability/weeks` (the only rolling active-window contract)
- `GET /api/v1/practitioners/me/availability/weeks/:weekId` (owned lazy details for one week)
- `POST /api/v1/practitioners/me/availability/weeks`
- `PATCH /api/v1/practitioners/me/availability/weeks/:weekId`
- `POST /api/v1/practitioners/me/availability/weeks/:sourceWeekId/repeat/preview`
- `POST /api/v1/practitioners/me/availability/weeks/:sourceWeekId/repeat/confirm`
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
- `AvailabilityRollingWindowSuccessResponseDto`
- `AvailabilityWeekMutationSuccessResponseDto`
- `RepeatAvailabilityWeekPreviewRequestDto`
- `RepeatAvailabilityWeekConfirmRequestDto`
- `ListPublicPractitionerAvailabilityWindowsDto`

## Main Use Cases
- `GetMyAvailabilityWeeksUseCase`
- `CreatePractitionerAvailabilityWeekUseCase`
- `UpdatePractitionerAvailabilityWeekUseCase`
- `AvailabilityScheduleRepeatService`
- `PublishPractitionerAvailabilityWeekUseCase`
- `ListPublicPractitionerAvailabilityWindowsUseCase`

## Business Rules
- each practitioner week is Sunday-based and stored with explicit `weekStartDate` / `weekEndDate`
- the active self-service window is controlled by Backend configuration and returns the current week plus the configured future weeks
- only `PUBLISHED` availability weeks are used by public availability, practitioner discovery, and matching readiness
- unpublished weeks can be created and updated; published weeks are protected by booking rules
- repeat preview persists a short-lived operation; confirmation creates independent unpublished weeks only
- recurring weekly slots must not overlap on the same day when they share the same duration
- weekly slot granularity remains enforced at 30 minutes in V1
- each recurring weekly slot declares an explicit booking duration of `30` or `60` minutes
- practitioner timezone is the source of truth for week interpretation and slot derivation
- exceptions are stored as concrete UTC datetimes
- `BLOCK` overrides all other availability
- `OPEN_EXTRA` adds temporary windows outside or alongside weekly schedule
- public reads require the practitioner to satisfy existing public visibility rules

## Response Notes
- self-service `GET /weeks` returns only metadata, `activeRange`, and dynamic `weeks[]`; it has no compatibility `currentWeek` or `nextWeek` fields
- repeat confirmation never overwrites an existing target and records source provenance only
- repeat operations use `updatedAt` as a short processing lease; a stale `PROCESSING` operation can be safely reclaimed by a later confirmation request, while a live operation returns `REPEAT_IN_PROGRESS`
- week mutation endpoints return the mutated week plus refreshed overview data
- public `/availability/windows` returns derived UTC windows for the requested range, including the slot duration that produced each window
- public `/availability/windows` can optionally return public-safe `bookedSlots` when `includeBooked=true`
- exception `reason` is never exposed on public endpoints

## Localization Notes
- business success/error messages use `availability.*` message keys in the shared i18n catalogs
- public read errors reuse localized not-found/range-validation messages
- reminder notifications may still reason about the upcoming week internally; that is not a public schedule-window contract

## Out Of Scope
- presence / live availability
- availability locking
- session creation
- booking confirmation
- payment authorization
- video provider integration
