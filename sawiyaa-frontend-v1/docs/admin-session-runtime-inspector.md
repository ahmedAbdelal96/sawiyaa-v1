# Admin Session Runtime Inspector

The Admin runtime inspector keeps both legacy routes operational:

- `/[locale]/admin/sessions/runtime-inspector`
- `/[locale]/admin/sessions/runtime-inspection`

The primary inspector is organized into a concise summary and focused tabs for
overview, attendance and evidence, package entitlement, Admin decisions,
support, and advanced diagnostics. Tab selection is deep-linkable with the
`tab` query parameter.

## Time semantics

Persisted Admin timezone is used when available, with the browser IANA timezone
as the fallback. Viewer-facing operational timestamps use that effective
timezone. Technical audit timestamps that are explicitly UTC remain UTC and are
labelled by their existing audit formatter.

## Permissions

Package and manual decision controls are shown only after the current Admin
permissions have loaded and include `SESSIONS_MANUAL_DECISIONS_WRITE`. Read
access and evidence remain available without that write permission. Backend
guards remain authoritative for every mutation.

## Scope

This Phase 1 surface is a read-focused operations workspace. It does not alter
session, payment, attendance, entitlement, or decision APIs, and does not make
automatic business decisions.
