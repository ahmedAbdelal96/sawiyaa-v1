/**
 * Named throttle policy definitions.
 * Each entry maps a policy key (set by @ThrottlePolicy decorator) to its rate-limit window and cap.
 * Limits are enforced by ThrottlePolicyGuard using an in-memory store (Redis-replaceable).
 *
 * Strategy: IP-based keying for anonymous routes; user-ID keying when a JWT userId is available.
 */

export interface ThrottlePolicyLimit {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Sliding window duration in milliseconds. */
  windowMs: number;
}

export const THROTTLE_POLICIES: Record<string, ThrottlePolicyLimit> = {
  // ── Patient auth ──────────────────────────────────────────────
  'auth-patient-google': { limit: 10, windowMs: 15 * 60_000 },
  'auth-patient-register': { limit: 5, windowMs: 60 * 60_000 },
  'auth-patient-login': { limit: 10, windowMs: 15 * 60_000 },
  'auth-patient-refresh': { limit: 30, windowMs: 15 * 60_000 },
  'auth-patient-forgot-password': { limit: 5, windowMs: 60 * 60_000 },
  'auth-patient-verify-password-reset-otp': { limit: 5, windowMs: 60 * 60_000 },
  'auth-patient-confirm-password-reset': { limit: 5, windowMs: 60 * 60_000 },
  'auth-patient-reset-password': { limit: 5, windowMs: 60 * 60_000 },

  // ── Practitioner auth ─────────────────────────────────────────
  'auth-practitioner-register': { limit: 5, windowMs: 60 * 60_000 },
  'auth-practitioner-login': { limit: 10, windowMs: 15 * 60_000 },
  'auth-practitioner-otp-verify': { limit: 5, windowMs: 15 * 60_000 },
  'auth-practitioner-refresh': { limit: 30, windowMs: 15 * 60_000 },
  'auth-practitioner-forgot-password': { limit: 5, windowMs: 60 * 60_000 },
  'auth-practitioner-verify-password-reset-otp': {
    limit: 5,
    windowMs: 60 * 60_000,
  },
  'auth-practitioner-confirm-password-reset': {
    limit: 5,
    windowMs: 60 * 60_000,
  },
  'auth-practitioner-reset-password': { limit: 5, windowMs: 60 * 60_000 },

  // ── Admin auth ────────────────────────────────────────────────
  'auth-admin-login': { limit: 10, windowMs: 15 * 60_000 },
  'auth-admin-refresh': { limit: 30, windowMs: 15 * 60_000 },
  'auth-admin-step-up-verify': { limit: 5, windowMs: 15 * 60_000 },
  // Gateway mutations verify a password server-side.  This prevents repeated
  // guesses from reaching the password verifier indefinitely.
  'admin-payment-gateway-control-password-confirmation': {
    limit: 5,
    windowMs: 15 * 60_000,
  },

  // Public forms / abuse-prone mutations
  'academy-public-enrollment': { limit: 10, windowMs: 15 * 60_000 },

  // Admin user management (security-sensitive)
  'admin-users-create': { limit: 10, windowMs: 15 * 60_000 },
  'admin-users-sensitive-mutation': { limit: 30, windowMs: 15 * 60_000 },
};
