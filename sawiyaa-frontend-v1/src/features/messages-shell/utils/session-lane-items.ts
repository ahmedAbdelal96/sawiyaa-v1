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
  if (item.sessionStatus === "IN_PROGRESS") return "IN_PROGRESS";
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
      status: item.sessionStatus?.replaceAll("_", " ") ?? item.status,
      sessionStatus: mapSessionChatStatus(item),
      isSessionPriority: item.canSend,
      at: item.sessionScheduledStartAt ?? item.lastActivityAt,
      hasUnread: item.unreadCount > 0,
      unreadCount: item.unreadCount,
    }));
}
