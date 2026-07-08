# Deferred Work and Risks

This document collects known blockers and follow-ups that are intentionally not treated as product regressions.

## External blockers

### Provider checkout QA

- Provider sandbox or checkout flows can still return `403 Forbidden` in this environment.
- Internal same-surface return, payment confirmation, and join-locking behavior are still verified.
- Full external payment completion remains deferred until provider-side QA succeeds.

## Technical follow-ups

- Pre-existing mobile lint warnings can remain outside the product scope unless they block a specific verification task.
- Any lingering repo-local build or typing issues should be tracked separately from product documentation.
- If a flow depends on a provider sandbox behaving differently from production, document that dependency explicitly.
- `NotificationDevice.timezone` is metadata-only today; when clients send it, the backend should normalize valid IANA values and ignore invalid or fixed-offset input without blocking device registration.

## Product follow-ups

- Future expansion of Instant Booking discovery beyond the current eligible-now model is not part of the closed phase set documented here.
- Any new payment method or refund policy should be added here only after the backend contract changes.
- Timezone normalization and formatter alignment remain follow-up work, not a blocker to the current product closure.
- Localized specialty names need production rollout discipline: apply the migration first, then deploy the code that expects `nameAr` and `nameEn`.

## What not to do

- Do not treat provider sandbox failure as a product logic failure.
- Do not hide blockers behind vague copy.
- Do not change booking, payment, or availability logic just to make a deferred external check disappear.
- Do not reintroduce retired flows such as `/admin/settlements` or legacy recurring availability runtime behavior.

## Current risk posture

At the time of this cleanup, the platform documentation treats the following as deferred rather than open product defects:

### Cleared implementation concerns

- Web session presentation and join-availability contract issues were cleared in the current contract set.
- The backend and frontend now treat localized specialty names as a live contract, with rollout order handled as a deployment concern.

### Deferred external blockers

- Provider checkout QA remains deferred until the sandbox or production provider path is confirmed.
- Future expansion of Instant Booking discovery beyond the current eligible-now model is not in current scope.

### Non-blocking follow-ups

- Dashboard or support copy cleanup may continue as UX polish.
- Timezone rollout work beyond the documented contract is planned follow-up, not a current blocker.
- Non-blocking mobile lint warnings remain outside the product scope unless they block a specific verification task.

