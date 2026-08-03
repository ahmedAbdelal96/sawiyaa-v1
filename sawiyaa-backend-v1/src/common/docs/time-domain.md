# Backend Time Domain Contract

## Automatic first-time timezone initialization

Authenticated clients may call `POST /users/me/timezone/initialize` after
profile hydration with a detected named IANA timezone. The endpoint validates
the value through `common/utils/timezone.util.ts` and atomically persists it
only when the authenticated `User.timezone` is `NULL` or empty. The response
returns the persisted value and whether this request initialized it.

This operation is separate from explicit settings/profile updates. It never
overwrites a valid value, never trusts a client user id, and must not run on
every login or foreground event. Device travel, another browser, OAuth login,
and account switching cannot silently replace a persisted timezone. Invalid
legacy non-empty values are not repaired by this endpoint.

Timezone is display/schedule context only. It is not used for country
resolution, pricing, currency, payments, wallets, refunds, or authorization.

Sawiyaa Backend uses three explicit temporal semantics. Every new field and API
value must be classified before implementation.

## Temporal Types

- **Date-only**: a business calendar date with no time or timezone, for example
  `2026-08-10`. Validate with `assertDateOnly`; never use `new Date(dateOnly)`
  for business-calendar calculations.
- **Local wall-clock**: a calendar date and time interpreted with a named IANA
  timezone, for example `2026-08-10 10:00` in `Africa/Cairo`. Availability
  adapters use `resolveZonedDateTime` and reject nonexistent or ambiguous DST
  values.
- **UTC instant**: one immutable point on the timeline, for example
  `2026-08-10T07:00:00.000Z`. API inputs must be offset-qualified (`Z` or a
  numeric offset); `2026-08-10T10:00:00` is invalid.

## Canonical Utility

Generic validation and conversion lives in
`src/common/utils/timezone.util.ts`:

- `isValidIanaTimeZone`, `normalizeIanaTimeZoneInput`, and
  `assertIanaTimeZoneInput` validate named zones and reject fixed offsets.
- `assertDateOnly` validates calendar dates without server-local parsing.
- `assertOffsetQualifiedIsoInstant` validates and parses UTC instants.
- `resolveZonedDateTime` and `zonedDateTimeToUtc` convert local wall-clock
  values to UTC and reject DST gaps/folds.
- Calendar helpers operate through UTC calendar arithmetic, not server-local
  time.

`src/modules/availability/utils/availability-timezone.util.ts` is an adapter
that preserves availability imports while delegating generic operations to the
canonical utility. Availability remains responsible for slot/week semantics,
minute-of-day validation, and schedule-specific error messages.

## Rules

Correct:

```text
timezone: Africa/Cairo
instant: 2026-08-10T07:00:00Z
date-only: 2026-08-10
```

Incorrect:

```text
timezone: UTC+2
instant: 2026-08-10T10:00:00
new Date("2026-08-10") for a business calendar date
server-local conversion for availability rules
```

Sessions remain UTC instants and preserve their stored timezone snapshot.
Timezone changes do not reinterpret existing sessions. Package lifecycle
timestamps and notification/reminder due timestamps remain database instants;
package validity semantics that are not explicitly date-only are deferred to
the package consolidation phase rather than guessed here.

## Phase 2B Inventory

| Flow                                                  | Source of time                                                                              | Persistence                                                                                                            | API serialization                                                                                               | Snapshot                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Scheduled patient/practitioner/admin booking          | Explicit-offset `scheduledStartAt` plus duration                                            | `Session.requestedStartAt`, `scheduledStartAt`, `scheduledEndAt` as UTC instants                                       | `SessionMapper` emits ISO UTC strings                                                                           | `Session.timezoneSnapshot`                                        |
| Package purchase sessions                             | `ValidatePackagePurchaseSlotsService` resolves selected slots in the practitioner IANA zone | The same `Session` fields and `paymentExpiresAt` for payment reservation                                               | Package presenter emits linked session ISO UTC strings; session details use the shared mapper                   | Each linked session receives the validated timezone               |
| Instant booking acceptance                            | `ValidateInstantBookingEligibilityService` returns `startsAtUtc`/`endsAtUtc`                | `CreateSessionFromInstantBookingService` creates the same `Session` shape                                              | Instant request lifecycle timestamps are ISO UTC strings; linked session uses session APIs                      | Accepted request timezone is copied to `Session.timezoneSnapshot` |
| Cancellation/completion/history/upcoming/join windows | Existing persisted session instants                                                         | Mutations write `cancelledAt`, `completedAt`, `expiredAt`, `videoRoomClosedAt`, and related event timestamps as `Date` | Session mapper serializes all timestamps with `toISOString()`                                                   | Existing snapshot is retained                                     |
| Session reminders and join notifications              | Derived from the persisted session start instant                                            | `SessionReminderQueue.dueAt` is a UTC instant                                                                          | Notification payload uses canonical ISO session time; recipient rendering may localize at the presentation edge | Recipient timezone is not used to reinterpret `dueAt`             |

### Package temporal-field classification

| Field                                                                                                                                                                       | Semantic type                  | Writer                                             | Reader/mutation                                 | Risk/status                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `PackagePlan.createdAt`, `updatedAt`, `archivedAt`                                                                                                                          | UTC instant                    | Prisma/package-plan use cases                      | Package-plan repositories/presenters            | Safe; database `DateTime`                                                       |
| `PatientPackagePurchase.paymentInitiatedAt`, `paymentExpiresAt`, `paidAt`, `activatedAt`, `completedAt`, `expiredAt`, `cancelledAt`, `refundedAt`, `createdAt`, `updatedAt` | UTC instant                    | Purchase/payment lifecycle use cases               | Purchase repository and presenter               | Safe; no local-wall-clock conversion                                            |
| `metadataJson.selectedSessionSlots[].scheduledStartAt/EndAt`                                                                                                                | UTC instant snapshot           | Package purchase use case                          | Audit/debug/package metadata readers            | Safe only when written from validated `Date` values; do not parse as local time |
| Linked `Session.requestedStartAt`, `scheduledStartAt`, `scheduledEndAt`, `expiresAt`                                                                                        | UTC instant                    | Shared session repository through package use case | Session APIs, join policy, conflicts, reminders | Canonical shared pipeline                                                       |
| `sessionCountSnapshot`, duration, package index                                                                                                                             | Non-temporal numeric snapshots | Package purchase use case                          | Purchase/session presenters                     | Not date/time values                                                            |

The current package schema has no package validity-start/validity-end business
fields. Therefore there is no hidden date-only or local-wall-clock package
validity value to reinterpret; adding one requires an explicit domain decision
and a migration. This is a documented future design boundary, not an implicit
server-local assumption.

## API and Notification Parity

Patient, practitioner, and admin session endpoints delegate to the shared
session use cases and `SessionMapper`. List responses expose the same UTC
scheduled values; detail responses additionally expose the same
`timezoneSnapshot` under `timezone`. No role endpoint may derive a competing
local timestamp.

Notification scheduling receives `Date` UTC instants, computes reminder
offsets using epoch milliseconds, stores `dueAt` as a database instant, and
uses idempotency keys per session and recipient. Notification context carries
the canonical ISO session start. Localized display belongs to the recipient
presentation layer and must use the recipient's named IANA timezone.
