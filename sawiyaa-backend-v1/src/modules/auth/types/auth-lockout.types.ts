export const AUTH_LOCKOUT_CONTEXTS = {
  PATIENT_PASSWORD_LOGIN: 'PATIENT_PASSWORD_LOGIN',
  PRACTITIONER_PASSWORD_LOGIN: 'PRACTITIONER_PASSWORD_LOGIN',
  PRACTITIONER_OTP_VERIFY: 'PRACTITIONER_OTP_VERIFY',
  ADMIN_PASSWORD_LOGIN: 'ADMIN_PASSWORD_LOGIN',
} as const;

export type AuthLockoutContext =
  | (typeof AUTH_LOCKOUT_CONTEXTS)[keyof typeof AUTH_LOCKOUT_CONTEXTS]
  | (string & {});

export interface AuthLockoutPolicy {
  maxAttempts: number;
  durationMinutes: number;
}

export interface AuthLockoutState {
  attemptCount: number;
  maxAttempts: number;
  remainingAttempts: number;
  lockedUntil: Date | null;
  retryAfterSeconds: number | null;
  isLocked: boolean;
}
