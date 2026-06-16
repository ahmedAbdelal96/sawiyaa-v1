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

- Paymob provider checkout QA
- future expansion of Instant Booking discovery beyond the current eligible-now model
- timezone rollout work beyond the documented contract
- non-blocking mobile lint warnings
