# Session client migration — Phase 2C current audit

**Status: incomplete.** This record was refreshed from the current repositories on 2026-08-08. It supersedes earlier progress bullets, which were not a completion claim.

## Current consumer graph and classification

The discovery searched Web and Mobile for lifecycle values, presentation status, join windows/actions, next/upcoming session selection, and raw status predicates. The principal graph is `Session API -> client API -> React Query hook -> component/helper`; package and journey routes add their own read projections rather than forwarding the Session detail contract.

| Area | Current consumer result | Classification |
|---|---|---|
| Web patient/practitioner lists, details and next-session card | Detail actions, runtime gating, join, room state, complete/no-show, and cancellation now read `operational`. The status badge’s fallback is presentation compatibility only. | Migrated / presentation compatibility |
| Mobile patient/practitioner core session screens | List filtering, detail join/cancel, practitioner prepare/join/room/complete/no-show use conservative operational accessors. | Migrated core paths |
| Mobile next-session card | Navigation reads `operational.join.allowed`; two retained `joinAvailable` display references are compatibility presentation. | Presentation compatibility |
| Admin list/runtime | Runtime inspection response has `operational`; forensic attendance, facts, claims, assessments and decisions remain intentionally raw. Some list/badge consumers still display raw status. | Presentation / audit; UI audit not complete |
| Package purchase Web | `package-purchase-display.ts` classifies, counts, groups and selects “next” by local session-status sets. | **ACTIVE BUSINESS DERIVATION / BACKEND CONTRACT GAP** |
| Package purchase Mobile | Equivalent status matrices decide counts, grouping, next session, display and join messaging. | **ACTIVE BUSINESS DERIVATION / BACKEND CONTRACT GAP** |
| Patient journey Web/Mobile | Journey API exposes `upcoming.session.status` without `operational`; Web currently renders status only, but this remains a contract gap before any lifecycle action is added. | BACKEND CONTRACT GAP / presentation consumer |
| Payment | `PaySessionPanel` and `PaymentReturnPanel` use raw session status to coordinate payment flow. This needs a payment-domain contract review; payment/refund truth must not be replaced by Session operational state. | Active cross-domain derivation, pending audit |
| Review, support, chat, notifications | Session references are mostly identity/status display or independent policy reads; no full proof of their eligibility contracts was completed in this pass. | Audit pending |

## Changes made in this continuation

- `PatientSessionDetailPanel` and `PractitionerSessionDetailPanel` now fail closed if an old cache lacks `operational`; active join/prepare/room/cancel/review/pay/complete/no-show controls consume `operational.join`, `operational.room`, and `operational.actions`.
- Practitioner room-close visibility no longer recreates lifecycle/window eligibility. It offers the command only for an operationally open video room; the existing command remains the authoritative authorization and reason-policy boundary.
- Session mutations centrally invalidate participant lists/details/summaries, next session, Admin list/runtime/resolution, patient journey, and package-purchase projections.
- The existing backend practitioner command-action projection and Admin runtime operational projection remain the only new backend policy composition in this phase.

## Proven contract gaps

1. `package-plans` uses `PackagePurchasePresenter`, which independently calls the deprecated join/presentation utilities and returns linked sessions without `operational`. Its Web and Mobile consumers therefore cannot migrate their current next/group/count decisions without an additive `SessionOperationalInterpreterService` projection.
2. `patient-journey` maps `upcomingSession.status` and history status without `operational`. This is an additive projection requirement for a fully canonical journey lifecycle display.

No extra Session interpreter or client rule was added to paper over either gap.

## Cache result

The central Session mutation invalidator now includes `patient-sessions`, `practitioner-sessions`, `patient-session-summary`, `my-next-session`, `admin-sessions`, `admin-session-runtime`, Admin resolution, `patient-journey`, and `package-purchases`. The latter two are invalidated defensively but do not yet receive canonical lifecycle projections.

## Verification

- Web: `npm run typecheck` passed after this continuation.
- Backend: the immediately preceding focused operational/action tests (13 assertions across three suites) and backend typecheck passed; no backend source changed in this continuation.
- Mobile: targeted `npx tsc --noEmit` filtering still reports two pre-existing implicit-`any` errors in `app/(patient)/sessions/select-time.tsx` (lines 319 and 329). No errors were reported for the migrated mobile session files in that filtered command.

## Completion-gate result

The gate does **not** pass. Current final classification counts cannot be zero because the following active derivations are still present:

- Web: `src/features/package-plans/lib/package-purchase-display.ts` — local lifecycle sets select next sessions, counts, groups, sort buckets, and card state.
- Mobile: `src/features/patient/package-plans/lib/package-purchase-display.ts` — same local lifecycle interpretation.
- Web: `src/features/payments/components/PaySessionPanel.tsx` and `PaymentReturnPanel.tsx` — raw Session status controls payment-flow handling, awaiting payment-domain contract classification.

Therefore `ACTIVE BUSINESS DERIVATION > 0` and `BACKEND CONTRACT GAP > 0`; Phase 2C must remain incomplete. Phase 2E deletion candidates, once the above consumers are migrated, are the deprecated Web/Mobile package status-set helpers and the presentation-status fallback helpers. No financial, evidence, attendance, cancellation, refund, room-close, outcome, entitlement, or Admin-decision rule was changed.
