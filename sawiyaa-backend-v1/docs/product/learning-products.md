# Learning Products IA Note

Date: 2026-07-05

## Current Product Decision

- **Academy** is the only visible learning product in web, mobile, and admin.
- **Training** has been retired from user-facing and backend runtime surfaces.

## Guidance

- Keep Academy as the visible learning/catalog experience.
- Do not revive Training user-facing surfaces.
- Keep legacy references only in historical docs or migration notes when necessary.

## Phase 1 Freeze

- Academy is the only visible learning/training product name in public, patient, practitioner, admin, and mobile navigation.
- Existing Training routes should be treated as retired compatibility redirects only if they still exist in historical deployments.
- Legacy Training payment and return URLs are retired from active product scope.
- New user-facing work must target Academy and the future `AcademyProgram` boundary, not Training.

## Phase 2 Foundation

- `AcademyProgram` is the canonical backend aggregate for Academy v2 going forward.
- The legacy `AcademyCourse` domain remains only where needed for Academy compatibility.
- The `Training` backend domain has been retired from active runtime surfaces.
- New Academy v2 backend work should land under the Academy module and target `AcademyProgram` first.

## Final Academy v2 status

The Academy v2 user-facing flow is implemented and smoke-tested as the only visible learning product.

### Completed and smoke-tested

- Public Academy program list and detail
- Public enrollment
- Payment redirect and payment-return
- Patient learner portal
- Patient pay continuation
- Admin learners management
- Manual enrollment
- Admin attendance
- Learner read-only attendance
- Admin certificate upload
- Learner certificate view/download
- Final Academy smoke QA

### Intentionally deferred

- Refund from learner page is intentionally deferred because the current refund contract is payment-level only and not Academy-enrollment-aware.
- Accept learner is intentionally not implemented because the current Academy lifecycle does not include a pending-review acceptance state.

### Non-blocking QA note

- Invalid file type certificate upload smoke remains a manual QA item because Playwright locator timing was flaky during verification.

### Rollout and environment notes

- Attendance and certificate migrations exist and must be applied before using those features on a database.
- Local production-like builds may require `NODE_OPTIONS=--max-old-space-size=4096` in heavier environments.

## Notes

- This is a product/IA note only.
- No backend contract, schema, or migration changes are implied by this document.

