import { isAxiosError } from "axios";
import { toAppError } from "@/lib/api/errors";

export type NormalizedFormError = {
  message: string;
  fieldErrors: Record<string, string>;
  requestId?: string;
  statusCode?: number;
  code?: string;
};

type ApiErrorPayload = {
  message?: string | string[];
  messageKey?: string;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  requestId?: string;
  errors?: unknown;
  details?: unknown;
  data?: unknown;
};

const FIELD_MATCHERS: Array<{ field: string; patterns: RegExp[] }> = [
  {
    field: "title",
    patterns: [/\btitle\b/i, /\barticle title\b/i, /\bheadline\b/i],
  },
  {
    field: "categoryId",
    patterns: [/\bcategory\b/i, /\bcategory id\b/i, /\bmain specialty\b/i],
  },
  {
    field: "specialtyId",
    patterns: [/\bspecialty\b/i, /\bsub-specialty\b/i, /\bsub specialty\b/i],
  },
  {
    field: "content",
    patterns: [/\bcontent\b/i, /\bbody\b/i, /\barticle body\b/i],
  },
  {
    field: "coverImageUrl",
    patterns: [/\bcover image\b/i, /\bimage url\b/i, /\bcover\b/i],
  },
];

export function normalizeFormError(
  error: unknown,
  fallbackMessage = "We couldn't save the changes. Please review the form and try again.",
): NormalizedFormError {
  const appError = toAppError(error);
  const payload = readApiErrorPayload(error);
  const fieldErrors = mapValidationErrors(payload?.errors ?? payload?.details);
  const requestId = readRequestId(payload) ?? appError.referenceId;
  const statusCode = payload?.statusCode ?? appError.statusCode;
  const code = payload?.errorCode ?? payload?.error ?? appError.code;
  const message = resolveMessage(appError.message, payload, fallbackMessage);

  return {
    message,
    fieldErrors,
    requestId,
    statusCode,
    code,
  };
}

export function mapValidationErrors(input: unknown): Record<string, string> {
  if (!input) {
    return {};
  }

  const mapped: Record<string, string> = {};

  const push = (field: string, message: string) => {
    if (!field || !message || mapped[field]) {
      return;
    }
    mapped[field] = message;
  };

  const visit = (value: unknown, fieldHint?: string) => {
    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, fieldHint));
      return;
    }

    if (typeof value === "string") {
      const inferredFields = inferFieldsFromMessage(value, fieldHint);
      if (inferredFields.length === 0) {
        return;
      }

      inferredFields.forEach((field) => push(field, value));
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const candidate = value as Record<string, unknown>;

    if (typeof candidate.field === "string" && candidate.message) {
      visit(candidate.message, candidate.field);
      return;
    }

    if (typeof candidate.fieldName === "string" && candidate.message) {
      visit(candidate.message, candidate.fieldName);
      return;
    }

    if (typeof candidate.key === "string" && candidate.message) {
      visit(candidate.message, candidate.key);
      return;
    }

    if (typeof candidate.message === "string") {
      visit(candidate.message, fieldHint);
      return;
    }

    if (Array.isArray(candidate.message)) {
      visit(candidate.message, fieldHint);
      return;
    }

    if (typeof candidate.messages === "string") {
      visit(candidate.messages, fieldHint);
      return;
    }

    if (Array.isArray(candidate.messages)) {
      visit(candidate.messages, fieldHint);
      return;
    }

    if (candidate.constraints && typeof candidate.constraints === "object") {
      const messages = Object.values(candidate.constraints).filter(
        (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
      );
      const inferredFields = inferFieldsFromMessage(messages.join(", "), fieldHint);
      const targetFields = inferredFields.length > 0 ? inferredFields : fieldHint ? [fieldHint] : [];
      if (targetFields.length > 0) {
        const message = messages[0] ?? "Invalid value";
        targetFields.forEach((field) => push(field, message));
      }
      return;
    }

    for (const [key, nestedValue] of Object.entries(candidate)) {
      if (["statusCode", "errorCode", "error", "messageKey", "requestId"].includes(key)) {
        continue;
      }

      if (typeof nestedValue === "string" || Array.isArray(nestedValue)) {
        visit(nestedValue, key);
      } else if (nestedValue && typeof nestedValue === "object") {
        const nestedCandidate = nestedValue as Record<string, unknown>;
        if (typeof nestedCandidate.message === "string" || Array.isArray(nestedCandidate.message)) {
          visit(nestedCandidate.message, key);
          continue;
        }
        if (nestedCandidate.constraints && typeof nestedCandidate.constraints === "object") {
          visit(nestedCandidate.constraints, key);
          continue;
        }
        visit(nestedValue, key);
      }
    }
  };

  visit(input);

  return mapped;
}

function resolveMessage(
  appMessage: string,
  payload: ApiErrorPayload | null,
  fallbackMessage: string,
): string {
  const payloadMessage = normalizeMessageValue(payload?.message);

  if (payloadMessage) {
    return payloadMessage;
  }

  if (appMessage.trim()) {
    return appMessage.trim();
  }

  const messageKey = typeof payload?.messageKey === "string" ? payload.messageKey.trim() : "";
  if (messageKey) {
    return fallbackMessage;
  }

  return fallbackMessage;
}

function normalizeMessageValue(message: string | string[] | undefined): string {
  if (!message) {
    return "";
  }

  if (Array.isArray(message)) {
    return message
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(", ");
  }

  return message.trim();
}

function readApiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (!isAxiosError(error)) {
    if (error && typeof error === "object") {
      const candidate = error as Record<string, unknown>;
      return extractPayloadFromRecord(candidate) ?? (candidate as ApiErrorPayload);
    }
    return null;
  }

  const raw = error.response?.data;
  if (!raw || typeof raw !== "object") {
    return {
      statusCode: error.response?.status,
      errorCode: error.code,
      message: error.message,
    };
  }

  return extractPayloadFromRecord(raw as Record<string, unknown>) ?? (raw as ApiErrorPayload);
}

function hasMeaningfulErrorFields(value: unknown): value is ApiErrorPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return Boolean(
    typeof candidate.message === "string" ||
      Array.isArray(candidate.message) ||
      typeof candidate.messageKey === "string" ||
      typeof candidate.error === "string" ||
      typeof candidate.errorCode === "string" ||
      typeof candidate.requestId === "string" ||
      typeof candidate.statusCode === "number" ||
      candidate.errors !== undefined ||
      candidate.details !== undefined,
  );
}

function extractPayloadFromRecord(value: Record<string, unknown>): ApiErrorPayload | null {
  if (hasMeaningfulErrorFields(value)) {
    return value as ApiErrorPayload;
  }

  const nested = value.data;
  if (nested && typeof nested === "object" && hasMeaningfulErrorFields(nested)) {
    return nested as ApiErrorPayload;
  }

  return null;
}

function readRequestId(payload: ApiErrorPayload | null): string | undefined {
  if (!payload) {
    return undefined;
  }

  if (typeof payload.requestId === "string" && payload.requestId.trim()) {
    return payload.requestId.trim();
  }

  const nested = payload.data as Record<string, unknown> | undefined;
  if (nested && typeof nested.requestId === "string" && nested.requestId.trim()) {
    return nested.requestId.trim();
  }

  return undefined;
}

function inferFieldsFromMessage(message: string, fieldHint?: string): string[] {
  const normalizedMessage = message.toLowerCase();
  const hits = new Set<string>();

  if (fieldHint && FIELD_MATCHERS.some((entry) => entry.field === fieldHint)) {
    hits.add(fieldHint);
  }

  for (const entry of FIELD_MATCHERS) {
    if (entry.patterns.some((pattern) => pattern.test(normalizedMessage))) {
      hits.add(entry.field);
    }
  }

  if (hits.size > 0) {
    return Array.from(hits);
  }

  if (fieldHint && FIELD_MATCHERS.some((entry) => entry.field === fieldHint)) {
    return [fieldHint];
  }

  return [];
}
