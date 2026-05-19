# Backend Phase 7A Production Security Hardening

## Executive Verdict

Mostly complete with gaps.

The backend received a production-oriented hardening sweep across CSRF posture, security audit sanitization, step-up metadata, rate-limit cleanup, upload limits, sensitive-route audit coverage, and secret-leakage reduction. Core auth and business flows were kept intact.

Two important gaps remain:

1. Step-up authentication is currently a metadata foundation only. It marks sensitive routes, but there is no full verification challenge / enforcement flow yet.
2. Rate limiting is still backed by the current in-memory store, so multi-instance production deployments still need a shared store strategy.

## Short Inventory

- Auth/session: cookie-auth transport is gated by config, request transport is tracked, CSRF guard scaffold is in place, and auth env flags were added.
- Authorization: existing RBAC / permission / ownership layers were preserved. Sensitive endpoints were annotated with step-up metadata where practical.
- Throttling: policy-based throttling remains in place, and the in-memory store now cleans expired entries.
- Audit: recursive sanitization is tighter, and several high-risk admin/finance/privacy flows now emit audit records.
- Uploads: missing file-size limits and empty-file checks were added to the most exposed upload paths.
- Payments/webhooks: no broad logic rewrite was made; the sweep focused on protection, audit, and enforcement markers.
- Logs/errors: sensitive key redaction was expanded and generic error leakage was reduced.
- Database: Prisma validation and migrate status were checked and passed; no migration was required.

## What Changed

### Auth / Session / CSRF

- Added auth config flags for cookie-auth posture and CSRF enforcement.
- Added a CSRF protection guard for cookie-authenticated unsafe requests.
- Added `x-csrf-token` to allowed CORS headers.
- Added request transport tracking so cookie-only requests can be distinguished from bearer-token clients.
- Added auth error catalog entries for CSRF rejection.
- Documented the auth posture in env examples.

### Step-Up Foundation

- Added `@RequireStepUp(...)` metadata for sensitive routes.
- Marked the following as step-up candidates:
  - refund approve / retry
  - practitioner application create / approve / reject / request changes
  - accounting reconciliation review
  - payment gateway control updates
  - practitioner payout record
- This is a scaffold only. It does not yet enforce a full challenge flow.

### Audit

- Hardened the security audit sanitizer to recurse through nested objects and arrays.
- Expanded banned audit keys to cover more secret-like fields.
- Added audit coverage to sensitive actions, including:
  - refund request / retry
  - practitioner application decisions
  - patient sensitive profile reads
  - admin care-chat reads
  - finance and gateway-sensitive actions where touched
- Preserved non-blocking audit behavior.

### Rate Limiting

- Kept the current policy-based throttling system intact.
- Added expired-entry cleanup to the in-memory throttle store.
- No Redis/shared store was introduced in this phase.

### Upload / Input Hardening

- Added file-size limits on the exposed upload endpoints that were missing them.
- Added empty-file rejection on avatar / attachment / payout-proof upload paths.
- Kept text validation changes minimal to avoid breaking existing flows.

### Logging / Secret Leakage

- Expanded sensitive log keys.
- Reduced generic exception leakage by avoiding raw error messages in the global exception filter.

## Commands Run

- `npx prisma validate`
- `npx prisma migrate status`
- `npm run build`
- `npx jest --runInBand common/security-audit/security-audit.service.spec.ts`
- `npx jest --runInBand common/decorators/step-up.decorator.spec.ts`
- `npx jest --runInBand common/guards/security/csrf-protection.guard.spec.ts`
- `npx jest --runInBand common/throttle/throttle-store.service.spec.ts`

## Verification Notes

- Prisma schema validation passed.
- Prisma migration status passed and reported the database schema is up to date.
- Backend build passed after fixing the audit service typing issue.
- Targeted security tests passed.

## Remaining Risks

### Critical

- Full step-up enforcement flow is not implemented yet. Sensitive routes are marked, but not challenged.
- Cookie-auth production usage still depends on deployment config discipline. If enabled, CSRF enforcement must also be enabled and verified.

### High

- Throttle storage is still in-memory and not cluster-safe for horizontally scaled production.
- Some high-risk controller paths were hardened, but a full route-by-route step-up enforcement pass still needs a follow-up phase.

### Medium

- Pagination caps and URL allowlist enforcement were improved in the most relevant paths, but a broader DTO sweep may still find edge cases.
- Webhook and payment flow logic was verified at a targeted level, not rewritten end-to-end.

### Low

- Additional sensitive audit opportunities may still exist in lower-traffic admin tools and reports.

## Next Recommended Phase

Phase 7B Frontend Production Security Hardening.

## Is the backend security sweep complete enough to proceed to frontend hardening?

Yes, with documented gaps.

The backend is now in a materially safer state for frontend hardening work, but the two main backend follow-ups should remain on the backlog:

- step-up enforcement flow
- shared rate-limit store for multi-instance production

