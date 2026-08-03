# Web Time Domain Contract

## Automatic first-time initialization

After authenticated `/users/me` hydration, the single application-level
`AutomaticTimeZoneInitializer` detects the browser IANA timezone and calls
`POST /users/me/timezone/initialize` only when the persisted value is missing.
Detection and persistence are best-effort and never block login or navigation.

The Backend owns validation and the atomic no-overwrite invariant. A valid
stored profile timezone remains the display source of truth even when the
browser timezone changes. Explicit settings updates remain separate, and
practitioner changes continue through the Backend schedule/session guard.

Google and password authentication converge on the same post-auth profile
hydration path. There is intentionally no timezone field in registration and
no save-on-every-login behavior.

Web receives appointment and lifecycle timestamps as immutable UTC instants.
All domain display code must use `src/lib/time-formatting`.

## Effective Viewer Timezone

`resolveEffectiveViewerTimeZone(profileTimeZone, browserTimeZone)` applies:

1. Valid persisted authenticated profile timezone.
2. Valid browser IANA timezone.
3. `UTC`.

Country, currency, locale, language, route locale, phone code, IP address, and
`timezoneSnapshot` are not viewer-timezone sources. `timezoneSnapshot` is only
context about the practitioner timezone captured when a session was booked.

Use `formatEffectiveViewerDateTime`, `formatEffectiveViewerDate`, and
`formatEffectiveViewerTime` when the profile timezone is available. Use the
`formatViewer*` functions only for public/anonymous surfaces or when no
authenticated profile exists.

## Semantic Types

- **UTC instant**: ISO timestamp with an offset, normally `Z`. Format it in the
  effective viewer timezone.
- **Date-only**: `YYYY-MM-DD` with no instant meaning. Use `formatCalendarDate`;
  never parse it as a local instant with `new Date(value)`.
- **Local wall-clock rule**: availability editor values such as minute-of-day.
  Keep them in the practitioner's schedule timezone. Do not convert them using
  viewer display formatting.

## Surface Rules

Patient, practitioner, and admin session screens may show different local
values for the same UTC instant because each account has its own effective
viewer timezone. Within one account, list, detail, history, confirmation,
package, notification, and join surfaces must agree.

Package lifecycle timestamps, `paymentExpiresAt`, and package-backed session
timestamps are UTC instants. Numeric duration/count/index values are not dates.
Notification metadata remains UTC; notification content is formatted for the
recipient viewer and must agree with the linked destination screen.

SSR uses UTC when no profile/browser timezone is available. Client fallback is
explicit and goes through the same resolver, preventing an implicit runtime
timezone from being selected by a domain component.

## Migrated Web Surfaces

The canonical adapter is used by the primary appointment surfaces:

- Patient and practitioner session lists, details, history, review cards, and session chat.
- Patient upcoming sessions, journey, instant-booking requests, and confirmations.
- Patient package purchases, package details, payment expiry, and package-backed sessions.
- Practitioner dashboard, sessions, instant-booking requests, and availability context.
- Admin session operations, patient 360 session/payment/assessment history, and patient detail views.
- Patient, practitioner, and admin support lists and ticket threads.
- Unified conversations, session chat, admin conversation history, notification dropdowns,
  notification centers, and notification detail pages.

Package and notification destinations use the same effective viewer timezone as their
source card or notification. Support and chat message timestamps are UTC instants and
are formatted through the same adapter.

## Verification Evidence

Fresh Playwright contexts authenticated the local Patient and Admin accounts
against the local production server. Arabic and English route shells returned
HTTP 200 without application console errors for the available session,
instant-booking, package, notification, dashboard, patient, support, and chat
routes. Profile timezone precedence is covered by the canonical tests using the
same UTC instant and a different browser-zone fallback.

Practitioner authentication was not bypassed. The documented seed practitioner
was unavailable locally, while the available QA account correctly returned an
OTP challenge. Practitioner session list/detail, dashboard, notification,
package-backed session, join-session, and availability paths were verified by
tracing their imports and profile-timezone inputs to
`formatPractitionerOrViewer*` or the availability wall-clock helpers. The
focused Practitioner detail test and canonical time tests pass.

## Availability Exception

Availability editors are intentionally different: recurring start/end values are
local wall-clock rules in the practitioner's configured schedule timezone. They must
remain editable as minute-of-day values and must not be converted into viewer-local
UTC values. Published availability windows and booked session instants use the
canonical formatter when displayed.

## Runtime Verification Evidence

The public `/ar` route and the authenticated Patient/Admin route matrices
rendered successfully without application console errors. No production
accounts or data are used.

The canonical test suite covers persisted timezone precedence, browser fallback, UTC
fallback, invalid zones/timestamps, date-only values, Arabic/English locale output,
Cairo and New York timezone differences, Practitioner timezone formatting, and
deterministic availability wall-clock output.

## Future Developer Rule

New user-facing date/time code must import from `src/lib/time-formatting` and pass the
authenticated profile/settings timezone when one exists. Do not create local resolver,
locale, offset, or `Intl.DateTimeFormat` helpers in feature code. Use `formatCalendarDate`
for date-only values and preserve local wall-clock semantics only for documented
availability-editor inputs.

## Prohibited Domain Patterns

Do not add these to domain screens:

```ts
new Date(value).toLocaleString();
new Date(value).toLocaleDateString();
new Date(value).toLocaleTimeString();
new Intl.DateTimeFormat(locale).format(new Date(value));
getTimezoneOffset();
```

## Timezone Picker

`src/features/timezone/timezone-options.ts` is the single Web option source. It
starts from `Intl.supportedValuesOf("timeZone")`, validates identifiers through
the canonical adapter, keeps persisted and detected values visible, and searches
the IANA ID plus normalized city and region labels. `src/components/timezone/TimeZonePicker.tsx`
is role-agnostic and is used by Patient, Practitioner, and Admin Web settings.
It emits only the selected IANA value; its current time/offset line is a
display-only snapshot and does not run a timer.

The low-level `Intl.DateTimeFormat` calls are allowed only inside the canonical
adapter. Technical comparisons using epoch milliseconds are allowed and do not
change the instant.
