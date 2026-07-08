# Availability System

This document describes the current availability contract for Sawiyaa.

## Current model

- Availability is managed week by week.
- Practitioners manage the current week and the next week.
- Availability weeks have explicit statuses:
  - `DRAFT`
  - `PUBLISHED`
  - `ARCHIVED`
- Public patient booking and discovery read only `PUBLISHED` weeks.
- `DRAFT` and `ARCHIVED` weeks must not authorize booking.
- Backend booking validation must use published week windows only.
- Instant booking eligibility must also use published week windows only.

## Data model notes

- The legacy recurring `AvailabilitySlot` runtime flow is removed.
- `AvailabilitySlot` is not part of the current schema contract.
- If a drop migration exists for cleanup, it should be applied only after backup and rollout planning.

## Timezone rules

- The practitioner's IANA timezone controls week boundaries and schedule interpretation.
- The viewer's local timezone controls display formatting.
- Do not hardcode a single timezone such as `Africa/Cairo` for runtime behavior.
- Backend owns the slot windows, conflict checks, and booking authorization.

## Surfaces

- Practitioner web remains the primary editing surface for availability.
- Practitioner mobile is read-only for availability handoff when the web flow is the source of editing.
- Patient web and mobile consume backend availability windows only.
- Admin can inspect availability as a read model when needed.

## Rollout rule

- If production does not yet have the availability migration applied, apply the migration before deploying backend code that expects the new contract.
- Production rollout should include database backup, migration application, backend deploy, frontend deploy, and smoke verification.

## Related docs

- [Booking, sessions, and availability](booking-sessions-and-availability.md)
- [Platform overview](platform-overview.md)
- [Production rollout](production-rollout.md)
