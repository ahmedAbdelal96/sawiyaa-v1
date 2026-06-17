# Sprint 1-R1 Hard Verification — Phase 9a Security First Fix Sprint

**Sprint:** 1-R1 (Rerun 1)
**Phase:** 9a
**Completed:** 2026-06-17
**Purpose:** Independently verify each P0 fix is truly fixed at source level, not just marked fixed in docs.

---

## Critical Findings Summary

| Finding | Verdict | Status |
|---------|---------|--------|
| AUDIT-031 | ❌ BROKEN FIX | Reopened |
| AUDIT-032 | ✅ Correctly fixed | Verified |
| AUDIT-033 | ❌ INEFFECTIVE FIX | Reopened |
| AUDIT-010 | ✅ Correctly fixed | Verified |

**2 of 4 P0 fixes are incomplete/broken. Phase 9b cannot proceed until AUDIT-031 and AUDIT-033 are correctly implemented.**

---

## AUDIT-031 — Academy Enrollment Auth Guard

### Hard Verification Result: ❌ BROKEN FIX — REOPENED

### Evidence

**Guard implementation (`jwt-access-auth.guard.ts`):**
```typescript
canActivate(context: ExecutionContext): boolean {
  const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    context.getHandler(),   // checked FIRST
    context.getClass(),     // checked SECOND (fallback)
  ]);

  if (isPublic) {
    return true;   // ← EARLY EXIT — guard passes without checking JWT
  }

  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  ensureAccessTokenUser(request);  // ← NEVER REACHED when @Public() is set
  return true;
}
```

**Current controller (`public-academy.controller.ts`):**
```typescript
@ApiTags('Academy')
@Public()                          // ← Sets IS_PUBLIC_KEY = true at CLASS level
@Controller('academy')
export class PublicAcademyController {

  @Post('courses/:slug/enrollments')
  @UseGuards(JwtAccessAuthGuard)   // ← Guard is decorated on this method
  @ThrottlePolicy('academy-public-enrollment')
  createEnrollment(...) { ... }
}
```

### Root Cause

`@Public()` on the controller class sets `IS_PUBLIC_KEY = true` in NestJS metadata. `JwtAccessAuthGuard.canActivate()` uses `reflector.getAllAndOverride()`, which checks handler metadata first, then falls back to class metadata. Since the class has `@Public()`, `isPublic` is `true` at the handler level too (the `getAllAndOverride` merges, and class-level `true` wins when handler doesn't override).

The guard returns `true` immediately — `ensureAccessTokenUser()` is never called. The `@UseGuards(JwtAccessAuthGuard)` decorator is present on the method but its logic is entirely bypassed because `@Public()` short-circuits before the guard body executes.

**The `createEnrollment` endpoint is fully unauthenticated — identical to the pre-fix state.**

### Why This Is Worse Than Before

Before Sprint 1, the absence of `@Public()` meant `JwtAccessAuthGuard` would call `ensureAccessTokenUser(request)`, which would throw for unauthenticated requests. After Sprint 1, `@Public()` explicitly marks the endpoint as public, bypassing auth entirely.

### Required Fix

**Option A (preferred):** Remove `@Public()` from the class. Add `@Public()` to each individual GET endpoint. `createEnrollment` requires enrollment token auth (via `AcademyEnrollmentTokenDto`) — this is handled inside the use case, not at the controller level. No JWT guard needed on `createEnrollment` if enrollment token is the intended auth.

**Option B:** Create a custom `AcademyEnrollmentTokenGuard` that validates the enrollment token. Apply it only to `createEnrollment`. Remove `@Public()` from the class. Keep all GET endpoints public.

**Option C:** If JWT is required on `createEnrollment`, remove `@Public()` from the class and apply `@UseGuards(JwtAccessAuthGuard)` at the class level — but this would require JWT for all academy endpoints, which may not be the intended product behavior.

### Validation Command Needed After Fix
```bash
# Unauthenticated POST to enrollment — must return 401/403
curl -X POST http://localhost:3000/api/v1/academy/courses/some-course/enrollments \
  -H "Content-Type: application/json" \
  -d '{"some": "payload"}'
# Expected: 401 or 403 (not 400/500)
```

---

## AUDIT-032 — Public Practitioner DTO Internal UUID Removal

### Hard Verification Result: ✅ CORRECTLY FIXED — VERIFIED

### Evidence

**`PublicPractitionerListItemResponseDto` (lines 49–148):**
- ✅ No `id!: string` field present
- ✅ First field is `slug!: string` (line 54)

**`PublicPractitionerDetailsResponseDto` (lines 150–234):**
- ✅ No `id!: string` field present
- ✅ First field is `slug!: string` (line 152)

**class-transformer serialization:** NestJS controllers using `ClassSerializerInterceptor` or `defaultRouteTransformer` strip properties not defined in the DTO class. The response object sent to clients contains only the DTO's published fields. `id` is not in either DTO, so it is not serialized into the response.

**Frontend SSR mapper (`practitioners-ssr.api.ts`):**
```typescript
export function mapBackendListItemToUi(item: BackendPublicPractitionerListItem): PublicPractitioner {
  return {
    id: item.slug,   // ← id is derived from slug — no backend id consumed
    slug: item.slug,
    ...
  };
}
```
`id` field removed from `BackendPublicPractitionerListItem` type (line 27: starts with `slug: string`, no `id`). The mapper explicitly uses slug as the frontend `id`.

### Conclusion

Public API responses for practitioner list and detail no longer contain internal UUIDs. The `slug` field is the sole public identifier. Propagation to frontend SSR layer is correctly applied.

**Verification:** `✅ TypeScript typecheck passes (frontend and backend)`  
**Status:** Fixed + Verified

---

## AUDIT-033 — Web Refresh Token HttpOnly Cookie

### Hard Verification Result: ❌ INEFFECTIVE FIX — REOPENED

### Critical Rule

> HttpOnly cookies cannot be created by frontend JavaScript. This is a browser-enforced security restriction. If the previous fix only added `httpOnly: true` to a frontend `Cookies.set(...)` / js-cookie call, then AUDIT-033 is NOT truly fixed.

### Evidence

**`http-client.ts` — current state:**
```typescript
const AUTH_COOKIE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  httpOnly: true,   // ← This flag is INEFFECTIVE when set via js-cookie
};
```

**How js-cookie works:** `js-cookie` is a client-side JavaScript library. It creates cookies by setting `document.cookie`, which is a browser JavaScript API. JavaScript can never create `httpOnly` cookies — that attribute can only be set by the server via the `Set-Cookie` HTTP response header.

**Setting `httpOnly: true` in `Cookies.set()` is a no-op from the browser's perspective.** The browser ignores `httpOnly` when `document.cookie` is used to set the cookie. The refresh token remains fully readable via `document.cookie`.

**Backend does not set refresh token via Set-Cookie:**
- `patient-auth.controller.ts` login/refresh/register all return tokens in the **JSON response body**: `{ tokens: { accessToken, refreshToken, ... } }`
- `issue-auth-tokens.use-case.ts` returns tokens in body only
- No `Set-Cookie` header is set anywhere in the auth flow (confirmed by grep of `Set-Cookie|setCookie|setHeader.*cookie` in auth module — zero matches)
- The refresh endpoint reads refresh token from `request.body` (`dto.refreshToken ?? request.authToken`) — not from a cookie

**The refresh token is stored and accessed entirely through client-side JavaScript. XSS can still read it.**

### SSR Gap (Already Documented)

Even if httpOnly were properly set by the backend, SSR server components using `Cookies.get()` would get `undefined` for httpOnly cookies. The `server-http-client.ts` uses a separate mechanism (server-side token reader) which was not changed and is adequate. This gap is documented and not a new finding.

### Why This Is an Architectural Fix Required

1. **Backend must issue the refresh token as an httpOnly cookie** via `Set-Cookie` response header on login/refresh endpoints
2. **Frontend must not overwrite the httpOnly cookie** with `Cookies.set()` (which would strip httpOnly)
3. **Refresh interceptor already uses `credentials: "include"`** — if backend sets httpOnly cookies, the browser sends them automatically
4. **Logout must clear the httpOnly cookie** via a server-side route that sets `Set-Cookie: refreshToken=; Max-Age=0`
5. **Mobile flow must be preserved** — mobile apps consume tokens from response body. Separate mobile vs web token delivery paths may be needed.

### Required Fix (Minimum)

**Backend changes:**
- On login/refresh: set `refreshToken` as httpOnly cookie via `Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/`
- On logout: clear the httpOnly refresh token cookie
- Mobile endpoints: return tokens in body (current behavior) — separate from web cookie flow

**Frontend changes:**
- On web: do NOT call `tokenManager.setTokens()` for refresh token — rely on server-set httpOnly cookie
- OR: after login, if backend sets httpOnly cookie, do not overwrite it with a JS-readable cookie
- The `credentials: "include"` fetch mode already sends cookies automatically — no interceptor change needed
- `getRefreshToken()` from `Cookies.get()` would return `undefined` for httpOnly cookies — callers need review

### Why the Sprint 1 Fix Appears to Work in TypeScript

`js-cookie`'s TypeScript types include `httpOnly` in `CookieAttributes`, so TypeScript accepts `httpOnly: true` without error. But the browser ignores this attribute at runtime when the cookie is set via JavaScript. This is a TypeScript-typed library with a runtime mismatch — the type system cannot catch this class of bug.

**Verification:** ❌ Runtime behavior does not match the type declaration  
**Status:** Fix is ineffective — Reopened

---

## AUDIT-010 — Instant Booking Accept Race Condition

### Hard Verification Result: ✅ CORRECTLY FIXED — VERIFIED

### Evidence

**`accept-instant-booking-request.use-case.ts` (lines 120–129):**
```typescript
// updateMany is the primary race-condition protection. This explicit
// status check is defense-in-depth: if for any reason the claimed row
// is not ACCEPTED (should be impossible under correct transaction
// isolation), we fail fast rather than creating a duplicate session.
if (claimedRequest.status !== InstantBookingRequestStatus.ACCEPTED) {
  throw new ConflictException({
    messageKey: 'instantBooking.errors.requestAlreadyAccepted',
    error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
  });
}
```

The belt-and-suspenders status check is present inside the Prisma transaction, after the atomic `claimPendingRequestForAcceptance` (which uses `updateMany` with count check). The existing P2002 catch (lines 151–160) is also present.

### Analysis

The Phase 3 audit incorrectly claimed "unhandled Prisma exception." The existing atomic `updateMany` correctly prevents concurrent accepts — the loser gets `count=0` and returns `null` (not an exception). The Phase 8 triage correctly identified this as a defense-in-depth gap.

The Sprint 1 fix adds an explicit status verification inside the transaction. Even if the atomic `updateMany` somehow returned a row that wasn't ACCEPTED (theoretically impossible under correct isolation), the check converts it to a `ConflictException`.

**Race condition outcomes after fix:**

| Scenario | Outcome |
|----------|---------|
| First concurrent accept | HTTP 200 + session created |
| Second concurrent (loser) | HTTP 200 + null → `ConflictException` (HTTP 409) |
| Concurrent + unique constraint hit | HTTP 409 `ConflictException` (P2002 caught) |
| Status check fails (belt-and-suspenders) | HTTP 409 `ConflictException` |

No raw 500 errors possible for any race scenario.

**Verification:** ✅ TypeScript typecheck passes  
**Status:** Fixed + Verified

---

## Summary: Truly Fixed vs. Reopened

### ✅ Fixed + Verified (2/4)

- **AUDIT-032** — Internal UUID correctly removed from public DTOs and propagated to frontend
- **AUDIT-010** — Belt-and-suspenders race condition protection correctly implemented

### ❌ Reopened — Fix Incomplete (2/4)

- **AUDIT-031** — `@Public()` on class bypasses method-level `@UseGuards(JwtAccessAuthGuard)`. `createEnrollment` is still fully unauthenticated. Fix is structurally broken.
- **AUDIT-033** — `httpOnly: true` in js-cookie (`Cookies.set()`) is a no-op. JavaScript cannot set httpOnly cookies. Tokens remain readable via XSS. Fix is architecturally ineffective.

---

## Required Before Phase 9b

### AUDIT-031 Fix Correction

Remove `@Public()` from `PublicAcademyController` class. Apply `@Public()` to individual GET method endpoints only:

```typescript
@ApiTags('Academy')
@Controller('academy')   // NO @Public() here
export class PublicAcademyController {

  @Get('courses')        // ← Individual public endpoints get @Public()
  @Public()
  list(...) { ... }

  @Post('courses/:slug/enrollments')   // ← NO @Public(), NO @UseGuards
  @ThrottlePolicy('academy-public-enrollment')  // enrollment token auth in use case
  createEnrollment(...) { ... }
}
```

### AUDIT-033 Fix Correction

Requires backend involvement. Minimum viable fix:
1. Backend login endpoint sets refresh token via `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Path=/`
2. Frontend `tokenManager.setTokens()` does NOT overwrite refresh token for web (conditional on `window` presence, or separate mobile/web flows)
3. Refresh interceptor (`credentials: "include"`) sends httpOnly cookies automatically
4. Logout: server clears the httpOnly cookie

**This sprint (R1) should focus only on the two broken fixes (AUDIT-031, AUDIT-033). Do not address P1/P2/P3 findings.**

---

*Hard verification performed by Sprint 1-R1. Source inspection + architectural analysis. No git commands executed. No DB schema changes made.*
