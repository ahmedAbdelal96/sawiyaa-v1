# Session legacy cleanup — Phase 2E audit

**Status: COMPLETE**
**Date:** 2026-08-09
**Baseline:** Phase 2C complete (`ACTIVE BUSINESS DERIVATION = 0`).

## Scope and outcome

This deletion-focused pass removed proven-dead Web lifecycle compatibility
helpers. It did not alter Session lifecycle policy, financial behavior, command
authorization, Package entitlement, Journey workflow, Chat authority, or Admin
forensic evidence.

## Deletion inventory

| Repo | File | Symbol / field | Current consumers before cleanup | Canonical replacement | Classification | Safe now? | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Web | `features/sessions/lib/session-runtime.ts` | `SESSION_RUNTIME_STATUSES`, `hasSessionRuntimeAccess` | 0 outside implementation | `operational` / backend join contract | DELETE NOW | Yes | Removed |
| Web | `features/sessions/lib/session-runtime.ts` | `canPrepareSessionRuntime`, `isJoinWindowOpen` | 0 | `operational.join`, `operational.actions`, backend command result | DELETE NOW | Yes | Removed |
| Web | `features/sessions/lib/session-presentation.ts` | `SESSION_CHAT_OPEN_STATUSES`, `canOpenSessionChatFromPresentationStatus` | 0 | Chat-domain authority and display-only labels | DELETE NOW | Yes | File removed |
| Backend/Web/Mobile | Session `presentationStatus` | active presentation/type/API consumers | `operational.state` for current meaning | KEEP — PRESENTATION / external contract | No | Retained |
| Backend/Web/Mobile | Session `joinAvailability` | active timestamp/display/type/API consumers | `operational.join` for canonical read permission | KEEP TEMPORARILY — EXTERNAL/UNKNOWN CONTRACT | No | Retained |
| Backend | persisted status, attendance, room, claim, assessment, decision facts | Admin audit consumers | Admin forensic model | KEEP — FORENSIC | No | Retained |
| Backend | chat eligibility policy | Chat use case | Chat-domain policy | KEEP — DOMAIN POLICY | No | Retained |

## Retention rationale

`presentationStatus` still supports display labels and existing response/type
shapes across the Web and Mobile clients; it no longer decides current Session
behavior. `joinAvailability` remains in active response/type shapes and is used
for availability timestamps and compatibility display. Removing either server
field would be a public contract change while consumers remain.

Admin raw Session fields are evidence, not duplicate operational policy. Chat
permission remains Chat-owned. Neither is a legacy lifecycle interpreter.

## Contract and boundary check

- Current Session interaction decisions continue to consume `operational`
  directly.
- The backend command/bootstrap path remains final execution authority.
- Package grouping/next selection stays on `operational.timelineBucket`.
- Journey workflow remains Journey-owned; payment settlement remains Payment-owned.
- No client helper now reinterprets runtime eligibility from raw Session statuses.

## Files changed

- `sawiyaa-frontend-v1/src/features/sessions/lib/session-runtime.ts`
- `sawiyaa-frontend-v1/src/features/sessions/lib/session-presentation.ts` (deleted)
- `docs/audits/session-client-migration-phase-2c.md`
- `docs/audits/session-legacy-cleanup-phase-2e.md`

## Final repository searches

| Search | Result |
| --- | --- |
| `SESSION_RUNTIME_STATUSES` | 0 active consumers / removed |
| `hasSessionRuntimeAccess` | 0 active consumers / removed |
| `canPrepareSessionRuntime` | 0 active consumers / removed |
| `isJoinWindowOpen` | 0 active consumers / removed |
| `canOpenSessionChatFromPresentationStatus` | 0 active consumers / removed |
| `presentationStatus` | retained active presentation, type, forensic, and API-contract references; no active lifecycle authority |
| `joinAvailability` | retained active presentation, type, and API-contract references; no active lifecycle authority |

## Verification

- Web typecheck: passed after the cleanup.
- Backend typecheck and focused Package/Journey tests: passed from the Phase 2C
  baseline; Phase 2E did not change backend source.
- Mobile `tsc --noEmit` still reports an unrelated implicit-`any` in
  `src/features/patient/package-plans/components/PackagePurchaseCreateScreen.tsx:113`;
  the filtered migrated Session/payment/practitioner/journey paths reported no error.

## Remaining technical debt / next recommended phase

Remove `presentationStatus` and `joinAvailability` only as a deliberate,
repository-wide response-contract migration after replacing their remaining
display/timestamp consumers with an explicitly supported canonical display
contract. That work is outside this safe deletion pass.
