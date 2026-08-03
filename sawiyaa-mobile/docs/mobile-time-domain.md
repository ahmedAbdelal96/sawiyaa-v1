# Mobile Time Domain Contract

## Automatic first-time initialization

`ViewerTimeZoneProvider` is the single Patient/Practitioner integration point.
After the role profile query succeeds, it obtains the device IANA timezone and
calls `POST /users/me/timezone/initialize` only if the persisted profile value
is missing. The request is best-effort, authenticated, idempotent, and does not
block login, offline startup, foreground refresh, or navigation.

The Backend validates and atomically persists the first value. Existing valid
values, including values from a previous device or country, are never
overwritten automatically. Invalid non-empty legacy values are not guessed or
repaired by Mobile. Explicit settings/profile updates remain separate and
practitioner schedule/session guards stay Backend-authoritative.

There is no Admin Mobile flow. Timezone is never used for country resolution,
pricing, currency, payments, wallets, refunds, or authentication behavior.

Mobile receives appointment, package, notification, chat, and support timestamps
as UTC instants. Patient and Practitioner domain screens must import from
`src/lib/time-formatting`.

## Effective Timezone

The canonical precedence is:

1. Valid authenticated profile timezone.
2. Valid device IANA timezone.
3. `UTC`.

`ViewerTimeZoneProvider` loads the Patient or Practitioner profile timezone,
clears it on logout or account change, and refreshes the context when the app
returns to the foreground. Device timezone is display fallback only; it is
never written back to the profile automatically.

Use `formatViewerDate`, `formatViewerTime`, and `formatViewerDateTime` for
authenticated and public viewer surfaces. They resolve the current context
through `getEffectiveViewerTimeZone()`. Use the explicit Practitioner helpers
when a named practitioner timezone is part of a schedule-specific operation.

Do not derive viewer timezone from country, currency, language, phone prefix,
IP address, or `timezoneSnapshot`.

## Temporal Semantics

- UTC instant: format through the effective viewer timezone.
- Date-only `YYYY-MM-DD`: use `formatCalendarDate`; never parse it as an
  implicit local instant.
- Local wall-clock rule: preserve minute-of-day values for availability editing.

Package lifecycle timestamps, payment expiry, selected package session slots,
notifications, messages, support events, and booked sessions are UTC instants.
Numeric package duration, index, and count values are not timestamps.

## Surface Rules

Patient and Practitioner session lists, details, dashboards, booking/instant
booking surfaces, package screens, notifications, chat, and support use the
same viewer formatter. A linked notification destination must render the same
instant and effective timezone as its notification card.

Availability editing is the explicit exception. Weekly schedule values are
local wall-clock rules in the Practitioner schedule timezone and must remain
minute-of-day values. Actual booked session timestamps and published windows
use the canonical UTC display path.

## Locale and Lifecycle

Arabic and English may change labels, numerals, month names, and direction, but
never change the instant or effective timezone. App foreground refreshes the
device fallback without overwriting a persisted profile timezone. Profile
queries update the context after startup and after profile edits. Logout clears
the previous account timezone so it cannot leak to the next account.

Push payload metadata remains UTC or carries an intentional Backend recipient
contract; Mobile must not permanently convert appointment timestamps in push
payloads using an implicit device timezone.

## Approved Remaining Low-Level Uses

Direct date APIs remain only for:

- canonical adapter internals;
- availability/date-picker local wall-clock input and date-only calendar grids;
- numeric countdowns and epoch comparisons;
- technical push registration metadata;
- finance period input helpers.

Domain screens must not add:

```ts
new Date(value).toLocaleString();
new Date(value).toLocaleDateString();
new Date(value).toLocaleTimeString();
new Intl.DateTimeFormat(locale).format(new Date(value));
getTimezoneOffset();
```

unless the code is inside the canonical adapter or is one of the documented
local wall-clock/input exceptions.

## Verification

Focused Jest fixtures cover profile precedence, device fallback, UTC fallback,
invalid zones, invalid timestamps, date-only stability, Arabic/English parity,
and a shared UTC instant. Practitioner availability utility tests confirm that
weekly selections remain minute-of-day values without timezone fields.

## Timezone Picker

`src/features/timezone/timezone-options.ts` is the Mobile option source and
`src/components/timezone/TimeZonePicker.tsx` is the shared Patient/Practitioner
picker. Both use the native `Intl.supportedValuesOf("timeZone")` catalog, preserve
the stored or detected IANA value, support normalized ID/city/region search, and
send only the existing profile/settings timezone payload. The current time/offset
is a display-only snapshot, not a per-row timer. Admin Mobile is intentionally
outside this migration.
