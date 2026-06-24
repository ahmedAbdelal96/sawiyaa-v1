import type { StatusTone } from "../../../components/ui/SharedPrimitives";
import type {
  CareChatConversationDetailsDto,
  CareChatRequestItemDto,
  CareChatRequestStatus,
} from "./types";

export type CareChatListFilter = "all" | "new" | "active" | "closed";
export type CareChatRequestDisplayState = "new" | "active" | "closed";

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const INTERNAL_ID_RE = /\b(gc_[A-Za-z0-9_-]{8,}|[A-Za-z0-9_-]{24,})\b/g;

const CLOSED_REQUEST_STATUSES: CareChatRequestStatus[] = [
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
  "REVOKED",
];

export function getCareChatRequestDisplayState(
  status: CareChatRequestStatus,
): CareChatRequestDisplayState {
  if (status === "PENDING") return "new";
  if (status === "APPROVED") return "active";
  return "closed";
}

export function getCareChatRequestStatusTone(
  status: CareChatRequestStatus,
): StatusTone {
  switch (getCareChatRequestDisplayState(status)) {
    case "new":
      return "warning";
    case "active":
      return "success";
    case "closed":
    default:
      return "default";
  }
}

export function getCareChatRequestFilter(
  status: CareChatRequestStatus,
): Exclude<CareChatListFilter, "all"> {
  return getCareChatRequestDisplayState(status);
}

export function isClosedCareChatRequestStatus(status: CareChatRequestStatus) {
  return CLOSED_REQUEST_STATUSES.includes(status);
}

export function getCareChatRequestUpdatedAt(
  item: CareChatRequestItemDto,
): string {
  return (
    item.approvedAt ??
    item.reviewedAt ??
    item.rejectedAt ??
    item.revokedAt ??
    item.expiresAt ??
    item.requestedAt
  );
}

export function getCareChatRequestRoute(item: CareChatRequestItemDto) {
  return `/(practitioner)/care-chat/request/${item.id}`;
}

export function getCareChatRequestSessionLabel(
  item: CareChatRequestItemDto,
) {
  return item.relatedSessionId ? "مرتبطة بجلسة" : null;
}

export function sanitizeCareChatText(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return trimmed
    .replace(UUID_RE, "…")
    .replace(INTERNAL_ID_RE, "…")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCareChatRequestPreview(
  item: CareChatRequestItemDto,
  locale: string,
) {
  const safeReason = sanitizeCareChatText(item.reason);
  if (safeReason) {
    return safeReason;
  }

  return locale.startsWith("ar")
    ? "لا يوجد سبب مذكور."
    : "No reason provided.";
}

export function getCareChatSummaryCounts(items: CareChatRequestItemDto[]) {
  return items.reduce(
    (acc, item) => {
      const state = getCareChatRequestDisplayState(item.status);
      acc[state] += 1;
      return acc;
    },
    { new: 0, active: 0, closed: 0 },
  );
}

export function getCareChatConversationTargetLabel(
  conversation: CareChatConversationDetailsDto,
) {
  return conversation.relatedSessionId ? "مرتبطة بجلسة" : null;
}
