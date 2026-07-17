import { isAxiosError } from "axios";

type TranslateFn = (
  key: string,
  options?: Record<string, string | number | Date>,
) => string;

export type AuthLockoutFlow =
  | "patient"
  | "admin"
  | "practitioner-password"
  | "practitioner-otp";

type ApiErrorPayload = {
  errorCode?: string;
  error?: string;
  messageKey?: string;
  message?: string | string[];
  remainingAttempts?: number;
  maxAttempts?: number;
  lockedUntil?: string | null;
  retryAfterSeconds?: number | null;
  data?: ApiErrorPayload;
};

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

function readFirstStringField(payload: unknown, key: string): string | null {
  const queue: unknown[] = [payload];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const candidate = current as Record<string, unknown>;
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    for (const nested of Object.values(candidate)) {
      if (nested && typeof nested === "object") {
        queue.push(nested);
      }
    }
  }

  return null;
}

function readPayload(payload: unknown): ApiErrorPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  return payload as ApiErrorPayload;
}

function readNestedLockoutMetadata(payload: unknown): {
  messageKey?: string;
  remainingAttempts?: number | null;
  maxAttempts?: number | null;
  lockedUntil?: string | null;
  retryAfterSeconds?: number | null;
} {
  const queue: unknown[] = [payload];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const candidate = readPayload(current);
    if (!candidate) {
      continue;
    }

    const messageKey =
      typeof candidate.messageKey === "string" && candidate.messageKey.trim()
        ? candidate.messageKey.trim()
        : undefined;
    const remainingAttempts =
      typeof candidate.remainingAttempts === "number" &&
      Number.isFinite(candidate.remainingAttempts)
        ? candidate.remainingAttempts
        : candidate.remainingAttempts === null
          ? null
          : undefined;
    const maxAttempts =
      typeof candidate.maxAttempts === "number" && Number.isFinite(candidate.maxAttempts)
        ? candidate.maxAttempts
        : candidate.maxAttempts === null
          ? null
          : undefined;
    const lockedUntil =
      typeof candidate.lockedUntil === "string"
        ? candidate.lockedUntil
        : candidate.lockedUntil === null
          ? null
          : undefined;
    const retryAfterSeconds =
      typeof candidate.retryAfterSeconds === "number" &&
      Number.isFinite(candidate.retryAfterSeconds)
        ? candidate.retryAfterSeconds
        : candidate.retryAfterSeconds === null
          ? null
          : undefined;

    if (
      messageKey ||
      remainingAttempts !== undefined ||
      maxAttempts !== undefined ||
      lockedUntil !== undefined ||
      retryAfterSeconds !== undefined
    ) {
      return {
        messageKey,
        remainingAttempts,
        maxAttempts,
        lockedUntil,
        retryAfterSeconds,
      };
    }

    for (const value of Object.values(candidate)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return {};
}

export function getAuthLockoutErrorMessage(
  error: unknown,
  flow: AuthLockoutFlow,
  t: TranslateFn,
) {
  const response = isAxiosError(error) ? error.response : undefined;
  const payload = readPayload(response?.data);
  const metadata = readNestedLockoutMetadata(payload ?? error);
  const codeToken =
    readFirstStringField(payload ?? error, "errorCode") ??
    readFirstStringField(payload ?? error, "error");
  const messageKeyToken =
    metadata.messageKey ?? readFirstStringField(payload ?? error, "messageKey");
  const attemptsRemaining = sanitizeAttemptCount(metadata.remainingAttempts);
  const minutes = resolveMinutes(metadata.retryAfterSeconds);

  if (isTemporarilyLocked(codeToken, messageKeyToken, response?.status)) {
    if (flow === "practitioner-otp") {
      return minutes
        ? t("auth.lockout.practitionerOtpTemporarilyLocked", { minutes })
        : t("auth.lockout.practitionerOtpTemporarilyLockedFallback");
    }

    if (flow === "practitioner-password") {
      return minutes
        ? t("auth.lockout.practitionerLoginTemporarilyLockedWithSupport", { minutes })
        : t("auth.lockout.practitionerLoginTemporarilyLockedFallback");
    }

    return minutes
      ? t("auth.lockout.loginTemporarilyLocked", { minutes })
      : t("auth.lockout.loginTemporarilyLockedFallback");
  }

  if (flow === "practitioner-otp" && isSupersededChallenge(codeToken, messageKeyToken)) {
    return t("auth.lockout.practitionerOtpSuperseded");
  }

  if (isInvalidCredentials(codeToken, messageKeyToken)) {
    if (flow === "practitioner-otp") {
      if (attemptsRemaining === 1) {
        return t("auth.lockout.practitionerOtpInvalidCredentialsOne");
      }

      if (attemptsRemaining && attemptsRemaining > 1) {
        return t("auth.lockout.practitionerOtpInvalidCredentials", {
          count: attemptsRemaining,
        });
      }
    } else {
      if (attemptsRemaining === 1) {
        return t("auth.lockout.invalidCredentialsOne");
      }

      if (attemptsRemaining && attemptsRemaining > 1) {
        return t("auth.lockout.invalidCredentials", {
          count: attemptsRemaining,
        });
      }
    }
  }

  if (flow === "practitioner-otp") {
    return t("auth.otpError");
  }

  return t("auth.loginError");
}
