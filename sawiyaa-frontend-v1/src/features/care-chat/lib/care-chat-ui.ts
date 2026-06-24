import { toAppError } from "@/lib/api/errors";
import type {
  CareChatActivityState,
  CareChatConversationStatus,
  CareChatParticipantRole,
  CareChatRequestStatus,
} from "../types/care-chat.types";

export const CARE_CHAT_REQUEST_STATUS_STYLES: Record<CareChatRequestStatus, string> = {
  PENDING: "bg-warning-50 text-warning-700 dark:bg-warning-500/12 dark:text-warning-300",
  APPROVED: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  REJECTED: "bg-error-50 text-error-700 dark:bg-error-500/12 dark:text-error-400",
  EXPIRED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55",
  CANCELLED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55",
  REVOKED: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
};

export const CARE_CHAT_ACTIVITY_STYLES: Record<CareChatActivityState, string> = {
  ACTIVE: "bg-primary-light text-text-brand dark:bg-primary/12 dark:text-primary-light",
  EXPIRED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55",
  REVOKED: "bg-surface-tertiary text-text-secondary dark:bg-white/10 dark:text-white/60",
  CLOSED: "bg-surface-tertiary text-text-muted dark:bg-white/10 dark:text-white/55",
};

export function formatCareChatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !locale.startsWith("ar"),
  });
}

export function getCareChatRequestStateKey(status: CareChatRequestStatus) {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "EXPIRED":
      return "expired";
    case "CANCELLED":
      return "cancelled";
    case "REVOKED":
      return "revoked";
    case "PENDING":
    default:
      return "pending";
  }
}

export function getCareChatConversationStateKey(status: CareChatConversationStatus) {
  switch (status) {
    case "OPEN":
      return "open";
    case "CLOSED":
      return "closed";
    case "EXPIRED":
      return "expired";
    case "SUSPENDED":
      return "suspended";
    case "PENDING":
    default:
      return "pending";
  }
}

export function getCareChatSenderAlignment(
  role: CareChatParticipantRole,
  scope: "patient" | "practitioner" | "admin",
) {
  if (scope === "patient") return role === "PATIENT";
  if (scope === "practitioner") return role === "PRACTITIONER";
  return role === "ADMIN" || role === "SUPPORT_AGENT";
}

export function getCareChatErrorKey(error: unknown) {
  const appError = toAppError(error);
  switch (appError.code) {
    case "activeRequestAlreadyExists":
      return "common.errors.activeRequestAlreadyExists";
    case "requestNotFound":
      return "common.errors.requestNotFound";
    case "conversationNotFound":
      return "common.errors.conversationNotFound";
    case "invalidLinkedSession":
      return "common.errors.invalidLinkedSession";
    case "requestExpired":
      return "common.errors.requestExpired";
    case "invalidApprovalDecisionTransition":
      return "common.errors.invalidApprovalDecisionTransition";
    case "invalidRevokeTransition":
      return "common.errors.invalidRevokeTransition";
    case "conversationInactiveForSend":
      return "common.errors.conversationInactiveForSend";
    case "patientProfileNotFound":
      return "common.errors.patientProfileNotFound";
    case "practitionerProfileNotFound":
      return "common.errors.practitionerProfileNotFound";
    case "practitionerNotFound":
      return "common.errors.practitionerNotFound";
    default:
      return "common.errors.generic";
  }
}
