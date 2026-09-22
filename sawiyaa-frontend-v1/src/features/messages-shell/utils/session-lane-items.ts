import type {
  CanonicalConversation,
  UnifiedMessagingLaneItem,
  UnifiedMessagingRole,
  UnifiedSessionChatStatus,
} from "../types/messages-shell.types";

export function filterVisibleCanonicalConversations(rows: CanonicalConversation[]) {
  return rows.filter(
    (item) => item.type !== "SESSION" || Boolean(item.lastMessage) || item.canSend,
  );
}

function getSessionPriority(item: CanonicalConversation) {
  if (item.canSend && item.sessionStatus === "IN_PROGRESS") return 3;
  if (item.canSend) return 2;
  if (item.lastMessage) return 1;
  return 0;
}

function mapSessionChatStatus(item: CanonicalConversation): UnifiedSessionChatStatus {
  const knownStatuses: UnifiedSessionChatStatus[] = [
    "DRAFT",
    "PENDING_PAYMENT",
    "PENDING_PRACTITIONER_CONFIRMATION",
    "UPCOMING",
    "READY_TO_JOIN",
    "IN_PROGRESS",
    "AWAITING_COMPLETION_CONFIRMATION",
    "AWAITING_ADMIN_RESOLUTION",
    "COMPLETED",
    "CANCELLED",
    "PATIENT_NO_SHOW",
    "PRACTITIONER_NO_SHOW",
    "BOTH_NO_SHOW",
    "EXPIRED",
  ];
  if (item.sessionStatus && knownStatuses.includes(item.sessionStatus as UnifiedSessionChatStatus)) {
    return item.sessionStatus as UnifiedSessionChatStatus;
  }
  if (item.canSend) return "READY_TO_JOIN";
  return "COMPLETED";
}

export function buildSessionLaneItems(
  role: Exclude<UnifiedMessagingRole, "admin">,
  rows: CanonicalConversation[],
): UnifiedMessagingLaneItem[] {
  return filterVisibleCanonicalConversations(rows)
    .filter((item) => item.type === "SESSION")
    .sort((a, b) => {
      const priorityDelta = getSessionPriority(b) - getSessionPriority(a);
      if (priorityDelta !== 0) return priorityDelta;
      const aAt = a.sessionScheduledStartAt ? new Date(a.sessionScheduledStartAt).getTime() : 0;
      const bAt = b.sessionScheduledStartAt ? new Date(b.sessionScheduledStartAt).getTime() : 0;
      return bAt - aAt;
    })
    .slice(0, 6)
    .map((item) => ({
      id: item.conversationId,
      title: item.otherParty?.displayName ?? "Session chat",
      note: `Session #${item.sessionCode ?? item.contextId}`,
      href: role === "patient"
        ? `/patient/sessions/${item.contextId}/chat`
        : `/practitioner/sessions/${item.contextId}/chat`,
      // Keep the canonical backend status; the launcher localizes it at the
      // presentation boundary instead of leaking enum text to users.
      status: item.sessionStatus ?? item.status,
      sessionStatus: mapSessionChatStatus(item),
      isSessionPriority: item.canSend,
      at: item.sessionScheduledStartAt ?? item.lastActivityAt,
      hasUnread: item.unreadCount > 0,
      unreadCount: item.unreadCount,
    }));
}
