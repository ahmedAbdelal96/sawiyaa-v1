import { isAxiosError } from "axios";

type MaybeErrorPayload = {
  error?: string;
  message?: string | string[];
  data?: {
    message?: string;
  };
};

function readErrorText(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as MaybeErrorPayload | undefined;

    if (typeof payload?.data?.message === "string" && payload.data.message.trim()) {
      return payload.data.message;
    }

    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload?.message) && payload.message[0]) {
      return String(payload.message[0]);
    }

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }

    if (error.code === "ECONNABORTED") {
      return "Request timed out.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "";
}

export function isInvalidPaymentReturnUrlError(error: unknown): boolean {
  const normalized = readErrorText(error).trim().toLowerCase();

  return (
    normalized.includes("payment_invalid_return_url") ||
    normalized.includes("invalid return url")
  );
}

export function logPaymentInitiationError(scope: string, error: unknown) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.error(`[${scope}] payment initiation failed`, error);
  }
}
