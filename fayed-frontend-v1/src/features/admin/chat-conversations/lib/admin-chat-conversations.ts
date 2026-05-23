import type {
  AdminChatConversationLockOwner,
  AdminChatConversationPreviewType,
  AdminChatConversationStatus,
} from "../types/admin-chat-conversations.types";

type ToneClass = "primary" | "success" | "warning" | "danger" | "neutral";

export function formatChatConversationDateTime(value: string | null, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatChatConversationDate(value: string | null, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatChatConversationTime(value: string | null, locale: string) {
  if (!value) return "-";

  return new Date(value).toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatChatConversationFileSize(size: number | null, locale: string) {
  if (!size || size <= 0) return locale.startsWith("ar") ? "غير محدد" : "Unknown";

  const units = ["B", "KB", "MB", "GB"];
  let nextValue = size;
  let unitIndex = 0;

  while (nextValue >= 1024 && unitIndex < units.length - 1) {
    nextValue /= 1024;
    unitIndex += 1;
  }

  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: nextValue >= 10 ? 0 : 1,
  }).format(nextValue);

  return `${formatted} ${units[unitIndex]}`;
}

export function getChatConversationPreviewTypeTone(
  previewType: AdminChatConversationPreviewType,
): ToneClass {
  switch (previewType) {
    case "NO_MESSAGES":
      return "neutral";
    case "TEXT_MESSAGE":
      return "primary";
    case "ATTACHMENT":
      return "warning";
    case "TEXT_WITH_ATTACHMENT":
      return "success";
  }
}

export function getChatConversationStatusTone(status: AdminChatConversationStatus): ToneClass {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "SENDING_DISABLED":
      return "warning";
    case "CLOSED_BY_PRACTITIONER":
      return "danger";
    case "ARCHIVED":
      return "neutral";
  }
}

export function getChatConversationClosedByTone(
  closedBy: AdminChatConversationLockOwner | null,
): ToneClass {
  switch (closedBy) {
    case "ADMIN":
      return "warning";
    case "PRACTITIONER":
      return "danger";
    default:
      return "neutral";
  }
}
