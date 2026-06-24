import { isAxiosError } from "axios";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type BookingErrorContext = "appointment" | "package";

type ApiErrorPayload = {
  errorCode?: string;
  error?: string;
  messageKey?: string;
  message?: string | string[];
  data?: {
    errorCode?: string;
    error?: string;
    messageKey?: string;
    message?: string;
  };
};

const APPOINTMENT_SELECTION_ERROR_KEYS = new Set([
  "session_unavailable_time_window",
  "session_practitioner_time_conflict",
  "session_patient_time_conflict",
  "sessions.errors.unavailabletimewindow",
  "sessions.errors.practitionertimeconflict",
  "sessions.errors.patienttimeconflict",
]);

const PACKAGE_SELECTION_ERROR_KEYS = new Set([
  "package_purchase_invalid_slot_count",
  "package_purchase_invalid_slot_start_at",
  "package_purchase_duplicate_slot",
  "package_purchase_overlapping_slots",
  "package_purchase_timezone_resolution_failed",
  "packagepurchases.errors.invalidslotcount",
  "packagepurchases.errors.invalidslotstartat",
  "packagepurchases.errors.duplicateslot",
  "packagepurchases.errors.overlappingslots",
  "packagepurchases.errors.timezoneresolutionfailed",
]);

const GENERIC_TIMEOUT_CODES = new Set(["econnaborted", "request_timeout"]);

export function getBookingErrorMessage(
  error: unknown,
  t: TranslateFn,
  context: BookingErrorContext,
) {
  const tokens = readErrorTokens(error);

  if (tokens.some((value) => GENERIC_TIMEOUT_CODES.has(value))) {
    return t(
      context === "appointment"
        ? "patientSessionsFlow.confirmation.errors.timeout"
        : "packagePurchases.create.errors.timeout",
    );
  }

  const selectionErrorDetected =
    context === "appointment"
      ? tokens.some((value) => APPOINTMENT_SELECTION_ERROR_KEYS.has(value))
      : tokens.some((value) => PACKAGE_SELECTION_ERROR_KEYS.has(value)) ||
        tokens.some((value) => APPOINTMENT_SELECTION_ERROR_KEYS.has(value));

  if (selectionErrorDetected) {
    return t(
      context === "appointment"
        ? "patientSessionsFlow.confirmation.errors.unavailableSelection"
        : "packagePurchases.create.errors.unavailableSelection",
    );
  }

  return t(
    context === "appointment"
      ? "patientSessionsFlow.confirmation.errors.generic"
      : "packagePurchases.create.errors.generic",
  );
}

function readErrorTokens(error: unknown): string[] {
  const tokens: string[] = [];

  if (isAxiosError(error)) {
    tokens.push(...extractTokens(error.response?.data));
    if (error.code) {
      tokens.push(error.code);
    }
  }

  return tokens
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.toLowerCase());
}

function extractTokens(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as ApiErrorPayload;

  const nestedTokens = extractTokens(candidate.data);
  const rawMessage =
    typeof candidate.messageKey === "string"
      ? candidate.messageKey
      : typeof candidate.errorCode === "string"
        ? candidate.errorCode
        : typeof candidate.error === "string"
          ? candidate.error
          : typeof candidate.message === "string"
            ? candidate.message
            : "";

  const directTokens = rawMessage ? [rawMessage] : [];

  if (Array.isArray(candidate.message)) {
    directTokens.push(...candidate.message);
  }

  return [...directTokens, ...nestedTokens];
}
