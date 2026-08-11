# Session compatibility retirement — Phase 2F

**Status: COMPLETE**
**Date:** 2026-08-09

## Baseline and result

Phase 2E measured 38 files containing `presentationStatus` and 19 containing
`joinAvailability`. Phase 2F retired both fields from the primary Session and
Package linked-Session API contracts and from Web/Mobile client types.

| Field | Initial file count | Final file count | Result |
| --- | ---: | ---: | --- |
| `presentationStatus` | 38 | 19 | Primary compatibility contract retired |
| `joinAvailability` | 19 | 6 | Primary compatibility contract retired |

The remaining occurrences are not primary client compatibility consumers:
translation namespace keys, locally named presentation functions, focused test
fixtures, the legacy join-policy utility, and Admin/Chat domain or forensic
contracts. No Web/Mobile production code accesses `.presentationStatus` or
`.joinAvailability`.

## Consumer inventory and migration

| Field | Area | Purpose before | Canonical replacement | Result |
| --- | --- | --- | --- | --- |
| `presentationStatus` | Session list/detail, badges, messaging and chat context | Current-state copy | `operational.state` | Migrated/removed |
| `presentationStatus` | Package linked sessions | Current-state label/tone | `operational.state` | Migrated/removed |
| `presentationStatus` | Mobile patient/practitioner screens | Current-state label/tone | `operational.state` | Migrated/removed |
| `presentationStatus` | Admin runtime/attendance evidence | Persisted operational snapshot | Admin forensic contract | Kept |
| `presentationStatus` | Chat opening use case | Chat-owned permission policy | Chat domain policy | Kept |
| `joinAvailability` | Session details and Package rows | Join eligibility/window display | `operational.join` | Migrated/removed |
| `joinAvailability` | Next-session projection | Join display summary | embedded `operational.join` | Migrated/removed |
| `joinAvailability` | join-policy utility and focused tests | Existing backend policy utility | Backend execution/read policy | Kept; not exposed by retired responses |

## Contract hardening

- `operational.join` now includes canonical `opensAt` and `closesAt` values,
  alongside `allowed`, `reasonCode`, and `canPrepareRuntime`.
- Primary Session and Package linked-session mapper, DTO, and TypeScript
  contracts no longer expose `presentationStatus` or `joinAvailability`.
- Client Session types require `operational`; stale compatibility fallbacks were
  removed.
- The next-session projection now exposes its canonical `operational` object
  rather than duplicate join availability fields.
- Added `npm run test:session-contract` in Web. It rejects production Web
  property access to `.presentationStatus` and `.joinAvailability`.

## Domain boundaries retained

- Payment confirmation remains `PaymentItem.status`; Session payability is
  `operational.actions.canPay`.
- Package entitlement remains Package-owned; Journey workflow remains
  Journey-owned; Chat send/read permission remains Chat-owned.
- Admin retains persisted lifecycle, room, attendance, claims, assessments and
  decisions as forensic evidence distinct from operational interpretation.
- Backend command endpoints continue to revalidate at execution time.

## Raw-status authority audit

Production Web/Mobile Session business decisions continue to use operational
state, join, actions, room, and timeline bucket. Remaining raw status mentions
are presentation labels, translations, tests, forensic evidence, or domain
policy; `ACTIVE BUSINESS DERIVATION = 0` remains true.

## Verification

- Backend `npm run typecheck`: passed.
- Web `npm run typecheck`: passed.
- Web `npm run test:session-contract`: passed.
- Mobile affected Session/Package/Practitioner paths: no errors in filtered
  `tsc --noEmit` output.
- `git diff --check`: passed.

Full Mobile typechecking still has unrelated existing errors, including implicit
`any` errors in assessment, discovery, support, onboarding, and
`PackagePurchaseCreateScreen` files. No Session compatibility regression was
reported in the affected paths.

## Remaining technical debt

The legacy backend join-policy utility may be simplified only when its remaining
command/read-policy and test consumers are independently consolidated. Admin
forensic `presentationStatus` and Chat-local policy naming are intentionally
outside the retired public Session contract; remove/rename them only with their
own domain contract migration.
