# Phase 7B — Frontend Production Security Hardening

Project: `D:\Web\full-projects\fayed\fayed-frontend-v1`  
Date: 2026-05-12  
Scope: Frontend only (Next.js). No backend/mobile changes.

## Executive Verdict

**Mostly complete with gaps.**

Rationale:
- Core security UX behavior is in place: deny-by-default admin gating, safe callbackUrl normalization, and non-logout 403 handling.
- Phase 7B hardening improvements were added for: sensitive data cache clearing, security headers, no-store caching for authenticated surfaces, and log hygiene.
- **Remaining gaps** are primarily quality/process: the repo currently fails `npm run lint` due to pre-existing React hooks/React Compiler rules violations, and CSP is not enforced (domain decisions required).

Clear answer: **Safe to proceed to Phase 7C mobile hardening?** **Yes, with documented gaps** (lint debt + CSP decisions).

## Inventory (Current State)

### Auth / Session
- Cookie-based auth; server helpers live in `src/lib/auth/server.ts`.
- Server-side current user access via `getUserData()` and area guards via `src/lib/auth/access.ts`.
- Refresh is supported through `/api/auth/refresh` route handler used by both `src/lib/api/http-client.ts` and `src/lib/api-client.ts`.

### Route Protection
- Primary protection is enforced in middleware `src/proxy.ts` (area classification + unauth redirect with `callbackUrl`).
- SSR layout protection uses `requireAuthenticatedArea()` in `src/lib/auth/access.ts`.
- Admin page permission gating uses backend-derived permission keys via `src/components/admin/AdminPermissionGate.tsx`.

### 401/403 Handling
- `src/lib/api/http-client.ts` refreshes on 401 (non-sensitive auth endpoints are excluded from recovery); 403 does not force logout.
- Server fetch helper `src/lib/server-api-client.ts` retries once after refresh and throws typed `AppError` on 401/403.

### Data Fetching / Cache
- React Query provider is in `src/providers/query-provider.tsx`.
- Previously: did not centrally clear cache on auth failures.
- Now: centrally clears query cache on 401/403 signals (see “Changes”).

### Admin Permission UX
- Permission mapping exists in `src/config/admin-route-permissions.ts`.
- Deny-by-default is implemented by `canAccessAdminRoute()` consumed by `src/components/admin/AdminPermissionGate.tsx`.

### Headers / Cache
- Headers were minimal (COOP only).
- Now includes additional production security headers and `Cache-Control: no-store` for authenticated route areas (see “Changes”).

## What Changed (Phase 7B)

### Sensitive Data Cache / Stale Data Protection
- Added a small client-side event mechanism for “clear sensitive cache”:
  - `src/lib/security/sensitive-cache.ts`
- React Query provider now clears cache on explicit security events and emits a forbidden toast while denying stale data:
  - `src/providers/query-provider.tsx`
- Logout now triggers cache clearing at the store layer (not only in specific hooks):
  - `src/stores/auth-store.ts`
- Axios client now triggers cache clear on session-expired (401 refresh failure) and forbidden (403), without logging out on 403:
  - `src/lib/api/http-client.ts`
- Legacy `src/lib/api-client.ts` now triggers cache clear on session-expired and logout redirects.

### 401/403 UX & Behavior
- Confirmed 403 does not trigger logout (http-client behavior preserved).
- 401 triggers session-expired behavior; cache is cleared before redirect.

### Logging / Secret Leakage Prevention (Frontend)
- Converted multiple `console.*` calls to development-only structured logs so production logs do not include raw objects:
  - `src/lib/auth/actions.ts`
  - `src/lib/auth/server.ts`
  - `src/hooks/useErrorHandler.ts`
  - `src/components/shared/ErrorBoundary.tsx`
  - `src/app/[locale]/error.tsx`
  - `src/app/[locale]/(public)/practitioners/error.tsx`
  - `src/app/api/auth/logout/route.ts`
  - `src/app/api/auth/refresh/route.ts`
  - `src/components/ui/data-table/export-utils.ts`
  - `src/components/ui/data-table/DataTableExport.tsx`
  - `src/lib/api-client.ts`

Notes:
- No frontend change pretends to be the security boundary; these are UX hardening and leak prevention measures only.

### Next.js Headers / Cache
- Added conservative security headers and no-store caching for authenticated areas:
  - `next.config.ts`
- Forced admin layout to be dynamic to reduce accidental caching of sensitive shells:
  - `src/app/[locale]/(admin)/layout.tsx`

### Build Fix (Verification Blocker)
- Made `formatSettlementMoney()` accept `string | number` to fix a TypeScript build failure that prevented Phase 7B verification:
  - `src/features/admin/settlements/lib/settlement-formatters.ts`

## Permission-Gated Admin UX Verification (Spot-Checks)

Admin pages using `AdminPermissionGate` include (non-exhaustive):
- Audit: `src/app/[locale]/(admin)/admin/audit/page.tsx`
- Finance: `src/app/[locale]/(admin)/admin/finance/dashboard/page.tsx`
- Payments/Refunds: `src/app/[locale]/(admin)/admin/payments/page.tsx`
- Settlements: `src/app/[locale]/(admin)/admin/settlements/page.tsx`
- Package Settlements: `src/app/[locale]/(admin)/admin/package-settlements/page.tsx`
- Support / Care chat: `src/app/[locale]/(admin)/admin/support/page.tsx`, `src/app/[locale]/(admin)/admin/care-chat/page.tsx`
- Practitioner applications: `src/app/[locale]/(admin)/admin/practitioner-applications/page.tsx`

Observed posture:
- Missing permissions deny by default (gate returns forbidden view).
- Permissions are fetched from backend `/users/me/permissions` via `getServerCurrentUserPermissions()` and default to `[]` on error, which denies by default.

## Upload UX / Input Hardening (Status)

This phase did not introduce broad upload UX changes yet. Remaining recommended frontend tasks:
- Add pre-upload size/type checks to the main upload entry points (avatar, chat attachments, practitioner documents) where present.
- Ensure object URLs are revoked and previews do not render unsafe content types inline.

## Redirect / Deep-Link Safety

Verified existing safe helper for callback URLs:
- `src/lib/auth/callback-url.ts` (`normalizeCallbackPath`) rejects non-relative and `//` forms and strips locale prefixes.

Middleware builds callbackUrl from canonical internal path:
- `src/proxy.ts` uses `canonicalPath` + `search` and passes it as `callbackUrl` query param.

## Verification Commands (Run)

- `npm run build` (passes)
- `npx tsc --noEmit` (passes)
- `npm run lint` (**fails**, pre-existing issues; see below)

## Lint / Quality Failures (Pre-Existing)

`npm run lint` currently fails with many violations, primarily:
- `react-hooks/set-state-in-effect` errors across multiple modal components.
- `react-hooks/preserve-manual-memoization` error in `PatientTrainingHomeScreen.tsx`.

These failures are not introduced by the Phase 7B security hardening changes in this sweep; they are repo-wide lint policy constraints that should be resolved to improve production hygiene.

## Remaining Risks (Ranked)

### Critical
- None found that indicates a permission bypass or open redirect in the current audited surfaces.

### High
- **No CSP enforced**: CSP requires explicit domain allowlists (payments, video, storage, analytics). Implementing without domain decisions risks breaking production flows.
- **Repo lint is failing**: increases the chance of regressions slipping into production and complicates security change verification.

### Medium
- Upload UX hardening not comprehensively implemented (frontend-side checks are UX-only but still reduce user harm and support load).
- Some legacy client-side API paths (`src/lib/api-client.ts`) still exist; now partially hardened, but long-term consolidation would reduce drift.

### Low
- `baseline-browser-mapping` data warning during build; not a security defect but should be updated for accuracy.

## Backend Follow-Ups Discovered

None required for the changes in this sweep. CSP and any additional CSRF posture changes would require explicit backend/infra alignment only if cookie-auth + browser flows expand.

## Next Recommended Phase

Proceed to **Phase 7C mobile hardening** with the following tracked follow-ups:
1. Decide and implement CSP allowlists (document required external domains first).
2. Address lint failures (hooks rules + React Compiler compatibility).
3. Implement upload UX validation at key upload entry points.

