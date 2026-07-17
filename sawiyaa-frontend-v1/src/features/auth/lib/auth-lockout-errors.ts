import { toAppError } from "@/lib/api/errors";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export type AuthLockoutFlow =
  | "patient"
  | "admin"
  | "practitioner-password"
  | "practitioner-otp";

function normalizeToken(value?: string | null): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isInvalidCredentials(appCode?: string | null, messageKey?: string | null) {
  const token = normalizeToken(appCode) || normalizeToken(messageKey);
  return token.includes("invalidcredentials");
}

function isTemporarilyLocked(appCode?: string | null, messageKey?: string | null, statusCode?: number) {
  const token = normalizeToken(appCode) || normalizeToken(messageKey);
  return statusCode === 429 || token.includes("logintemporarilylocked");
}

function isSupersededChallenge(appCode?: string | null, messageKey?: string | null) {
  const token = normalizeToken(appCode) || normalizeToken(messageKey);
  return token.includes("otpchallengesuperseded");
}

function resolveMinutes(retryAfterSeconds?: number | null): number | null {
  if (typeof retryAfterSeconds !== "number" || !Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return null;
  }

  return Math.max(1, Math.ceil(retryAfterSeconds / 60));
}

function sanitizeAttemptCount(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(value));
}

export function getAuthLockoutErrorMessage(
  error: unknown,
  flow: AuthLockoutFlow,
  t: TranslateFn,
): string {
  const appError = toAppError(error);
  const codeToken = appError.code ?? null;
  const messageKeyToken = appError.messageKey ?? null;
  const attemptsRemaining = sanitizeAttemptCount(appError.remainingAttempts);
  const minutes = resolveMinutes(appError.retryAfterSeconds);

  if (isTemporarilyLocked(codeToken, messageKeyToken, appError.statusCode)) {
    if (flow === "practitioner-otp") {
      return minutes
        ? t("lockout.practitionerOtpTemporarilyLocked", { minutes })
        : t("lockout.practitionerOtpTemporarilyLockedFallback");
    }

    if (flow === "practitioner-password") {
      return minutes
        ? t("lockout.practitionerLoginTemporarilyLockedWithSupport", { minutes })
        : t("lockout.practitionerLoginTemporarilyLockedFallback");
    }

    return minutes
      ? t("lockout.loginTemporarilyLocked", { minutes })
      : t("lockout.loginTemporarilyLockedFallback");
  }

  if (flow === "practitioner-otp" && isSupersededChallenge(codeToken, messageKeyToken)) {
    return t("lockout.practitionerOtpSuperseded");
  }

  if (isInvalidCredentials(codeToken, messageKeyToken)) {
    if (flow === "practitioner-otp") {
      if (attemptsRemaining === 1) {
        return t("lockout.practitionerOtpInvalidCredentialsOne");
      }

      if (attemptsRemaining && attemptsRemaining > 1) {
        return t("lockout.practitionerOtpInvalidCredentials", {
          count: attemptsRemaining,
        });
      }
    } else {
      if (attemptsRemaining === 1) {
        return t("lockout.invalidCredentialsOne");
      }

      if (attemptsRemaining && attemptsRemaining > 1) {
        return t("lockout.invalidCredentials", {
          count: attemptsRemaining,
        });
      }
    }
  }

  if (flow === "practitioner-otp") {
    return t("otpError");
  }

  return t("loginError");
}
