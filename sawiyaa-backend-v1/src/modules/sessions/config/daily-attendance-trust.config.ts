/**
 * Provider-security policy for Daily attendance evidence.
 *
 * These values are deliberately infrastructure policy, not editable business
 * configuration. They protect lifecycle authority from clock abuse and replay.
 */
export const DAILY_ATTENDANCE_MAX_FUTURE_SKEW_SECONDS = 5 * 60;
export const DAILY_ATTENDANCE_MAX_REPLAY_AGE_SECONDS = 24 * 60 * 60;

export const DAILY_ATTENDANCE_TRUST_POLICY = {
  maxFutureSkewSeconds: DAILY_ATTENDANCE_MAX_FUTURE_SKEW_SECONDS,
  maxReplayAgeSeconds: DAILY_ATTENDANCE_MAX_REPLAY_AGE_SECONDS,
} as const;
