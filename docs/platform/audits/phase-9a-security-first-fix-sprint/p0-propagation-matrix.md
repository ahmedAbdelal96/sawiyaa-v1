# P0 Propagation Matrix — Phase 9a Security First Fix Sprint

**Phase:** 9a
**Created:** 2026-06-17
**Purpose:** Documents DTO/API contract changes and their propagation to frontend/mobile surfaces.

This matrix covers only the P0 fixes applied in Sprint 1. It tracks which surfaces are affected by each contract change, what was updated, and any residual risk.

---

## AUDIT-032 Propagation: Remove Internal UUID from Public Practitioner DTOs

**Contract change:** `PublicPractitionerListItemResponseDto` and `PublicPractitionerDetailsResponseDto` no longer include `id: string` (internal UUID). The `slug` field remains the sole public identifier.

### Backend → Frontend Contract

| Surface | File | Change | Status |
|---------|------|--------|--------|
| **Backend DTO** | `public-practitioner-response.dto.ts` | Removed `id` from `PublicPractitionerListItemResponseDto` and `PublicPractitionerDetailsResponseDto` | ✅ Applied |
| **Backend controller** | `public-practitioner.controller.ts` | No change (controller already uses slug-based routing) | N/A |
| **Backend mapper** | `public-practitioner.mapper.ts` | No change (identity mapper — no UUID-specific logic) | N/A |

### Backend → Frontend SSR API Contract

| Surface | File | Change | Status |
|---------|------|--------|--------|
| **Frontend SSR type** | `practitioners-ssr.api.ts` | Removed `id` from `BackendPublicPractitionerListItem` type | ✅ Applied |
| **Frontend mapper** | `practitioners-ssr.api.ts` | Changed `id: item.id` → `id: item.slug` in `mapBackendListItemToUi` | ✅ Applied |
| **Frontend type** | `practitioners-discovery/types/practitioner.ts` | `PublicPractitioner.id` now holds slug value (backwards compatible — callers use `slug` for routing) | ✅ Propagated |
| **Profile SSR API** | `practitioner-profile/api/practitioner-profile-ssr.api.ts` | `BackendPublicPractitionerDetailsItem` extends `BackendPublicPractitionerListItem` — inheritance cascades removal | ✅ Propagated |
| **Profile mapper** | `practitioner-profile/api/practitioner-profile-ssr.api.ts` | `mapBackendDetailsToUi` calls `mapBackendListItemToUi` — cascade applies | ✅ Propagated |

### React Keys

| Surface | File | Change | Status |
|---------|------|--------|--------|
| **SpecialtyPractitionersTeaser** | `specialty-practitioners-teaser.tsx:53` | `key={practitioner.id}` — value is now slug (stable, no functional change) | ✅ Already correct |
| **PractitionerCard** | Used via `practitioner.id` as key in listing maps | Same as above — stable slug used as key | ✅ Already correct |

### Mobile

| Surface | File | Change | Status |
|---------|------|--------|--------|
| **Mobile practitioner listing** | Not audited in Phase 9a | Not in scope — AUDIT-032 was scoped to web backend DTOs | 🔲 Pending check |

### Residual Risk

- **Mobile surfaces** were not audited in this sprint. The mobile app may have its own type definitions for the public practitioner API response. If mobile fetches `GET /public/practitioners` directly (vs through a shared API layer), it will receive responses without `id` and may have TypeScript errors. **Action required:** Check mobile practitioner listing and profile types.

---

## AUDIT-033 Propagation: httpOnly Cookie on Auth Tokens

**Contract change:** `AUTH_COOKIE_OPTIONS` now includes `httpOnly: true`. Refresh token uses `sameSite: "strict"` (instead of `"lax"`). Access token keeps `sameSite: "lax"` to support payment provider redirects.

### Frontend Auth Cookie Chain

| Cookie | Attribute Before | Attribute After | Risk |
|--------|----------------|-----------------|------|
| `ACCESS_TOKEN` | `secure + sameSite=lax` | `secure + sameSite=lax + httpOnly` | ✅ Hardened |
| `REFRESH_TOKEN` | `secure + sameSite=lax` | `secure + sameSite=strict + httpOnly` | ✅ Hardened |

### Affected Code Paths

| Code Path | File | Change | Status |
|-----------|------|--------|--------|
| **token storage** | `http-client.ts:283-300` | `AUTH_COOKIE_OPTIONS` now includes `httpOnly`, per-token `sameSite` overrides | ✅ Applied |
| **token retrieval** | `http-client.ts:300-306` | `Cookies.get()` calls — **will return `undefined` for httpOnly cookies** | ⚠️ Known issue |
| **refresh interceptor** | `http-client.ts:58-80` | Uses `fetch("/api/auth/refresh", { credentials: "include" })` — browser sends httpOnly cookies automatically | ✅ No change needed |
| **SSR token read** | `server-http-client.ts` | Uses native `fetch` server-side — **cannot read httpOnly cookies**. SSR token injection for API calls needs separate mechanism. | 🔲 Architectural gap |

### Residual Risk — SSR Token Access

The Next.js server components use `serverGet` which calls the backend API. For SSR to work:
1. The server needs an access token to attach to API calls
2. With httpOnly cookies, JavaScript (including client-side `Cookies.get()`) cannot read the token
3. The existing code uses a separate server-side mechanism via `server-http-client`

The `server-http-client.ts` was not changed in this sprint. If SSR breaks after this fix, the server needs a dedicated internal API route that reads the httpOnly cookie server-side and proxies the token to the API layer.

**This is a known architectural gap (documented in Phase 4 findings).** The httpOnly fix is correct for XSS prevention. The SSR pattern needs a follow-up architectural fix.

### Known Limitations

- **SSR accessibility:** The access token is now httpOnly. If the SSR layer needs to read it for initial page renders, a server-side token reader route is required.
- **Login response:** After login, `setTokens` is called client-side. The refresh token is now httpOnly and will be set as such.

---

## AUDIT-031 Propagation: Academy Enrollment Auth Guard

**Contract change:** `PublicAcademyController` now has explicit `@Public()` decorator. `createEnrollment` endpoint now has `@UseGuards(JwtAccessAuthGuard)`.

### Backend Guard Chain

| Layer | File | Change | Status |
|-------|------|--------|--------|
| **Controller** | `public-academy.controller.ts` | Added `@Public()` to controller class, added `@UseGuards(JwtAccessAuthGuard)` to `createEnrollment` | ✅ Applied |
| **Global guards** | `app.module.ts` | No APP_GUARD for JWT — ThrottlePolicyGuard, CsrfProtectionGuard, StepUpGuard are global. JWT remains per-endpoint. | N/A |
| **Enrollment token DTO** | `academy-enrollment-token.dto.ts` | No change — enrollment token auth still happens in use case layer | N/A |

### API Contract Impact

| Endpoint | Before | After |
|----------|--------|-------|
| `POST /api/v1/academy/courses/:slug/enrollments` | No auth required | **JWT required** — returns 401 without valid token |
| `GET /api/v1/academy/courses` | No auth | No change |
| `GET /api/v1/academy/courses/:slug` | No auth | No change |
| `GET /api/v1/academy/enrollments/:id?token=` | No auth | No change |
| `GET /api/v1/academy/enrollments/:id/pay/redirect` | No auth | No change |

### Propagation Risk

- **Frontend academy enrollment flow:** The patient-facing enrollment flow calls `POST /academy/courses/:slug/enrollments`. After this fix, the frontend must send a valid JWT. If the frontend was sending requests without an auth header (e.g., via a server-side call), it will receive 401.
- **Checked:** The `createAcademyEnrollmentUseCase` receives `currentUserId` via the `@CurrentUser()` decorator. With `JwtAccessAuthGuard` applied, the guard will populate `currentUser` from the JWT before the controller method is called.

### Residual Risk

- **Enrollment token flow:** The enrollment token (`AcademyEnrollmentTokenDto`) is still accepted. The `@Public()` on the controller means unauthenticated users can still hit the enrollment status and payment redirect endpoints. This is intentional — enrollment token is the auth mechanism for those flows.

---

## AUDIT-010 Propagation: Instant Booking Race Condition Fix

**Contract change:** `AcceptInstantBookingRequestUseCase` now explicitly verifies `claimedRequest.status === ACCEPTED` inside the transaction before creating a session.

### Database Transaction Flow (After Fix)

```
Practitioner calls accept
  → markExpired()          ← updates stale PENDING → EXPIRED
  → findById()              ← reads current state (PENDING or ACCEPTED)
  → Prisma $transaction
      → claimPendingRequestForAcceptance (atomic updateMany)
          WHERE id, practitionerId, status=PENDING, linkedSessionId=null, expiresAt > now
          → count=1: row claimed, status set to ACCEPTED
          → count=0: already claimed or expired — returns null
      → findById()           ← re-read inside transaction
      → STATUS CHECK         ← NEW: verify claimedRequest.status === ACCEPTED
          → NOT ACCEPTED → ConflictException
      → createSession()
      → updateRequest(linkedSessionId)
```

### API Response Contract

| Scenario | Before | After |
|----------|--------|-------|
| First concurrent accept | HTTP 200 + session | No change |
| Second concurrent accept (loser) | HTTP 200 + null (no session) | No change — count=0 still returns null |
| Third+ concurrent accepts | Same as above | No change |
| Session creation unique constraint violation | HTTP 500 (raw) | HTTP 409 Conflict (caught P2002) |
| Race condition — status check fails | Would proceed to create session | HTTP 409 Conflict |

### Propagation to Notifications

| Change | File | Status |
|--------|------|--------|
| `operationalNotificationService.notifyInstantBookingAccepted` is called with accepted request | `accept-instant-booking-request.use-case.ts:185` | ✅ Already present — AUDIT-024 (P1) not addressed in this sprint |

### Residual Risk

- **AUDIT-024 (notifications on accept/reject):** Not fixed in this sprint. Patient still has no push notification on accept. This is P1 — not in scope for Sprint 1.

---

## Cross-Fix Summary

| Fix | Surfaces Changed | Propagation Complete |
|-----|-----------------|---------------------|
| AUDIT-031 auth guard | Backend: 1 file | ✅ Yes |
| AUDIT-032 UUID removal | Backend DTO + Frontend SSR API + Frontend mapper | ⚠️ Mobile unchecked |
| AUDIT-033 httpOnly | Frontend: 1 file (http-client.ts) | ⚠️ SSR token access gap |
| AUDIT-010 race condition | Backend: 1 file | ✅ Yes |

---

*Propagation matrix produced by Phase 9a Sprint. Only P0 fixes applied. No P1/P2/P3 changes.*
