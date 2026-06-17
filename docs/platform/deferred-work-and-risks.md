# Deferred Work and Risks

This document collects known blockers and follow-ups that are intentionally not treated as product regressions.

## External blockers

### Paymob provider QA

- The Paymob sandbox/provider checkout flow returned `403 Forbidden` during QA in this environment.
- Internal same-surface return, payment confirmation, and join-locking behavior were still verified.
- Full external payment completion remains deferred until provider-side QA succeeds.

## Technical follow-ups

- Pre-existing mobile lint warnings can remain outside the product scope unless they block a specific verification task.
- Any lingering repo-local build or typing issues should be tracked separately from product documentation.
- If a flow depends on a provider sandbox behaving differently from production, document that dependency explicitly.
- `NotificationDevice.timezone` is metadata-only today; when clients send it, the backend should normalize valid IANA values and ignore invalid/fixed-offset input without blocking device registration.

## Product follow-ups

- Future "available today" / "soon" instant-booking discovery is not part of the closed phase set documented here.
- If the product later expands instant booking beyond the current now-eligible discovery model, update the availability and booking docs together.
- Any new payment method or refund policy should be added here only after the backend contract changes.
- Timezone normalization and formatter alignment are planned follow-up work, not a blocker to the current product closure, and should be implemented against the contract documented in the architecture and booking docs.

## What not to do

- Do not treat provider sandbox failure as a product logic failure.
- Do not hide blockers behind vague copy.
- Do not change booking, payment, or availability logic just to make a deferred external check disappear.

## Current risk posture

At the time of this cleanup, the platform documentation treats the following as deferred rather than open product defects:

### Cleared (Phase 5A / Phase 5B)

- **Web TypeScript build P0** — cleared by Phase 5A. The `use-sessions.ts` hook was missing explicit `SessionItem` generics, causing 89 TypeScript errors that blocked the production build.
- **Web session enum leakage P1** — cleared by Phase 5B. Missing `presentationHints.NO_SHOW` and `sessions.detail.presentation.NO_SHOW` translation keys were added. Practitioner session detail missing `sessions.practitioner.detail.presentation` block was also added. DOM proof confirms raw `NO_SHOW` no longer appears in patient or practitioner web surfaces.
- **Suspected P1 false positives** — practitioner Messages/Support empty and admin `practitioner-applications` 404 were disproven during Phase 5B smoke revalidation.

### Deferred external blockers

- **Paymob provider checkout QA** — sandbox/provider checkout still returns `403 Forbidden` in this environment. Internal payment return, confirmation, and join-locking behavior verified. Full external completion deferred until provider-side QA succeeds.
- **Future expansion of Instant Booking discovery** beyond the current eligible-now model — not in current closed scope.

### Non-blocking follow-ups

- **Dashboard raw permission/status code display** — some patient dashboard surfaces may show raw permission or status code strings from backend i18n catalogs. This is a non-blocking P2 unless confirmed on a critical user flow. Tracking separately from product docs.
- **Timezone rollout work** beyond the documented contract — planned follow-up, not a current blocker.
- **Non-blocking mobile lint warnings** — pre-existing ESLint warnings in the mobile codebase, outside the product scope unless they block a specific verification task.
