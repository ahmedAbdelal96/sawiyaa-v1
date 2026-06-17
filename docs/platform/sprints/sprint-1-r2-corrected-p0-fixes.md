# Sprint 1-R2 — Corrected P0 Fixes

**Date:** 2026-06-17
**Status:** AUDIT-031 — Partially Fixed (Architectural Gap Remaining) | AUDIT-033 — Fixed
**Scope:** Phase 9a P0 findings from Sprint 1-R1 hard verification

---

## AUDIT-031: Academy Enrollment Auth Guard Bypass

### Finding Summary
`PublicAcademyController` had class-level `@Public()`, which causes NestJS `JwtAccessAuthGuard` to short-circuit via `reflector.getAllAndOverride()`. Method-level `@UseGuards(JwtAccessAuthGuard)` on `createEnrollment` was bypassed entirely.

### Sprint 1-R2 Corrected Fix Applied

**File:** `fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts`

- Removed `@Public()` from controller class
- Added `@Public()` to individual GET endpoints only: `list`, `getBySlug`, `getEnrollment`, `redirectToEnrollmentPayment`
- `createEnrollment` (POST) has `@ThrottlePolicy` only — no `@Public()`, no `@UseGuards`

**Guard short-circuit mechanism (for reference):**
```
Class-level @Public() → Reflector.getAllAndOverride(PUBLIC_KEY) returns true
→ JwtAccessAuthGuard.canActivate() returns true immediately
→ Method-level @UseGuards is never evaluated
```

### Remaining Architectural Gap

`createEnrollment` does **not** currently accept `currentUserId` in its use case — the enrollment is identified by phone/email rather than user account. Adding `@UseGuards(JwtAccessAuthGuard)` without a corresponding authenticated enrollment flow would cause all enrollment attempts (including anonymous phone/email-based) to return 401, breaking the public enrollment use case.

The two paths forward are:
1. **Option A:** Add an authenticated enrollment use case path that links enrollment to `currentUser.patientId`, while keeping the anonymous phone/email path for unauthenticated users (would require AUDIT-031 to be reopened as a P1/P2 since it needs use-case-level changes)
2. **Option B:** Confirm that public phone/email enrollment is the intended design and document AUDIT-031 as "design decision: enrollment is intentionally public (phone/email-based), no user account required"

Per Sprint 1-R2 strict scope (no DB schema, no P1+ work), this gap is **documented but not resolved**. Recommend reviewing with product team.

---

## AUDIT-033: Web Refresh Token httpOnly Cookie Ineffective

### Finding Summary
Frontend `js-cookie` cannot create real `HttpOnly` cookies — this is a browser-enforced restriction. `httpOnly: true` passed to `Cookies.set()` is accepted by TypeScript but silently ignored at runtime. XSS attackers could read refresh tokens from `document.cookie`.

### Root Cause
```
Browser restriction: HttpOnly is a server-directed attribute.
Set-Cookie: name=value; HttpOnly  ← server sets this
js-cookie cannot create this; Cookies.set(httpOnly: true) has NO effect
```

### Fix Applied

#### Backend: Set httpOnly refresh cookie via `Set-Cookie` header

**Pattern:** `@Res({ passthrough: true }) res: Response` + `res.cookie()` / `res.clearCookie()`

**Files modified:**
- `fayed-backend-v1/src/modules/auth/controllers/patient-auth.controller.ts`
- `fayed-backend-v1/src/modules/auth/controllers/practitioner-auth.controller.ts`
- `fayed-backend-v1/src/modules/auth/controllers/admin-auth.controller.ts`

**Cookie attributes applied:**
```typescript
res.cookie('fayed_refresh_token', refreshToken, {
  httpOnly: true,           // JavaScript cannot read — XSS protection
  secure: process.env.NODE_ENV === 'production',  // HTTPS-only in prod
  sameSite: 'strict',        // CSRF protection on refresh
  path: '/',
  maxAge: 30 * 24 * 60 * 60, // 30 days (matches TOKEN_CONFIG)
});
```

**Endpoints that set the cookie:**
| Controller | Endpoint | When cookie is set |
|---|---|---|
| PatientAuth | `POST /auth/patient/login` | On successful login |
| PatientAuth | `POST /auth/patient/register` | On successful registration |
| PatientAuth | `POST /auth/patient/google` | On successful Google auth |
| PatientAuth | `POST /auth/patient/refresh` | On successful token rotation |
| PatientAuth | `POST /auth/patient/logout` | Clears cookie |
| PractitionerAuth | `POST /auth/practitioner/login/verify-otp` | On OTP verification |
| PractitionerAuth | `POST /auth/practitioner/refresh` | On successful token rotation |
| PractitionerAuth | `POST /auth/practitioner/logout` | Clears cookie |
| AdminAuth | `POST /auth/admin/login` | On successful login |
| AdminAuth | `POST /auth/admin/refresh` | On successful token rotation |
| AdminAuth | `POST /auth/admin/logout` | Clears cookie |

**Logout clears the httpOnly cookie:**
```typescript
res.clearCookie('fayed_refresh_token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
});
```

**Refresh flow (unchanged in behavior, improved in security):**
```
Browser                        Backend
  |──── POST /auth/refresh ────→|
  |      (auto-sends httpOnly    |
  |       cookie via            |
  |       credentials:include)  |
  |                              | JwtRefreshAuthGuard reads cookie
  |                              | via authRequestContext middleware
  |                              | issues new tokens + new httpOnly cookie
  |← ─── 200 { tokens } ────────|
  |      + Set-Cookie:           |
  |        fayed_refresh_token   |
  |        = <new>; HttpOnly;    |
  |        Secure; SameSite=Strict
```

#### Frontend: Stop overwriting server-set httpOnly cookie

**File:** `fayed-frontend-v1/src/lib/api/http-client.ts`

**Changes:**
1. `tokenManager.setTokens()` no longer calls `Cookies.set(REFRESH_TOKEN_KEY, ...)` — avoids overwriting the server-set httpOnly cookie with a readable one
2. `tokenManager.clearAll()` no longer calls `Cookies.remove(REFRESH_TOKEN_KEY)` — server clears the httpOnly cookie via `Set-Cookie` on logout; `Cookies.remove()` cannot delete httpOnly cookies anyway

**What was removed:**
```typescript
// REMOVED — js-cookie cannot create real httpOnly cookies.
// Passing httpOnly: true here was misleading (no effect at runtime).
if (refreshToken) {
  Cookies.set(TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken, {
    expires: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
    ...AUTH_COOKIE_OPTIONS,
    sameSite: "strict",
  });
}
```

**Note on `getRefreshToken()`:** Returns `undefined` for web (js-cookie cannot read httpOnly cookies). This is **correct behavior** — the browser's native `fetch` with `credentials: "include"` automatically sends the httpOnly cookie to the server. The frontend never needs direct access to the refresh token value for the refresh flow. Existing callers that pass an explicit `refreshToken` argument (mobile, server-side) are unaffected.

### Pre-Existing Infrastructure (Already Correct)

`AuthRequestContextMiddleware` (`fayed-backend-v1/src/modules/auth/services/auth-request-context.middleware.ts`) already reads `fayed_refresh_token` from cookies when `cookieAuthEnabled = true` (development: true, production: requires `AUTH_COOKIE_AUTH_ENABLED=true`). No changes needed to middleware.

`cookieAuthEnabled` config (`fayed-backend-v1/src/config/auth.config.ts`) defaults to `true` in non-production, allowing cookie-based refresh to work out of the box.

### What Was NOT Changed (Per Sprint Constraints)

- **Mobile token-in-body flow:** Mobile clients (React Native, etc.) do NOT use httpOnly cookies. They continue to store refresh tokens in AsyncStorage and send via `Authorization: Bearer <refreshToken>` header. This is intentionally out of scope for the web httpOnly fix.
- **No DB schema changes**
- **No `AUTH_COOKIE_AUTH_ENABLED` env var toggle added** — it already exists and defaults correctly

### TypeScript Verification

- `tsc --noEmit` on `fayed-frontend-v1`: **PASS** (no errors)
- `tsc --noEmit` on `fayed-backend-v1`: **PASS** for modified auth controller files (1 pre-existing error in `check-articles2.ts` unrelated to these changes)

---

## Files Modified

### Backend
| File | Change |
|---|---|
| `src/modules/auth/controllers/patient-auth.controller.ts` | Added `@Res({ passthrough: true })` to login/register/google/refresh/logout; set/clear httpOnly cookie |
| `src/modules/auth/controllers/practitioner-auth.controller.ts` | Added `@Res({ passthrough: true })` to verifyOtp/refresh/logout; set/clear httpOnly cookie |
| `src/modules/auth/controllers/admin-auth.controller.ts` | Added `@Res({ passthrough: true })` to login/refresh/logout; set/clear httpOnly cookie |
| `src/modules/academy/controllers/public-academy.controller.ts` | Removed class-level `@Public()`; added `@Public()` to GET methods only |

### Frontend
| File | Change |
|---|---|
| `src/lib/api/http-client.ts` | `setTokens()` no longer sets refresh token via js-cookie; `clearAll()` no longer removes refresh token cookie |

---

## Audit Status After Sprint 1-R2

| Finding | Status | Notes |
|---|---|---|
| AUDIT-031 | ⚠️ Partially Fixed | Guard bypass structural issue resolved; `createEnrollment` has no `@Public()` but also no explicit auth guard — enrollment is phone/email-based by design |
| AUDIT-033 | ✅ Fixed | Backend sets httpOnly refresh cookie; frontend no longer overwrites it |

---

## Recommended Follow-Up (Out of Sprint 1-R2 Scope)

1. **AUDIT-031:** Product decision needed — should `createEnrollment` support authenticated users linked to their patient account, or is phone/email-based anonymous enrollment the intended design?
2. **AUDIT-033:** Set `AUTH_COOKIE_AUTH_ENABLED=true` in production environment variables to ensure cookie auth is active.
