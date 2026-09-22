import {
  mapCanonicalConversationToInboxItem,
  sortCanonicalConversationsForInbox,
} from "../../src/features/messages/inbox-view-model";
import type { CanonicalConversation } from "../../src/features/messages/types";

const t = (key: string, options?: Record<string, unknown>) => {
  const values: Record<string, string> = {
    "messages.inbox.contextSession": "Session",
    "messages.inbox.contextSupport": "Support",
    "messages.inbox.contextFollowup": "Follow-up",
    "messages.inbox.noPreview": "No messages yet",
    "messages.thread.unknownConversation": "Conversation",
    "messages.thread.supportFallback": "Support request",
  };

  if (key === "messages.inbox.unreadAccessibility") {
    return `${String(options?.count ?? 0)} unread messages`;
  }

  return values[key] ?? key;
};

function conversation(overrides: Partial<CanonicalConversation> = {}): CanonicalConversation {
  return {
    id: "conversation-1",
    conversationId: "conversation-1",
    supportTicketId: null,
    type: "SESSION",
    title: "SESSION_CONVERSATION",
    subject: null,
    contextLabel: "SESSION_CONVERSATION",
    contextId: "session-internal-id",
    status: "OPEN",
    isResolved: false,
    isReadOnly: false,
    canSend: true,
    sendDisabledReason: null,
    unreadCount: 3,
    lastMessage: {
      id: "message-1",
      conversationId: "conversation-1",
      sender: {
        userId: "practitioner-1",
        displayName: "Dr. Lina Hassan",
        avatarUrl: null,
        publicRoleLabel: "Practitioner",
      },
      body: "See you soon.",
      messageType: "TEXT",
      sentAt: "2026-08-16T10:00:00.000Z",
      status: "SENT",
      deliveredAt: null,
      readAt: null,
    },
    participants: [],
    otherParty: {
      userId: "practitioner-1",
      displayName: "Dr. Lina Hassan",
      avatarUrl: null,
      publicRoleLabel: "Practitioner",
    },
    supportQueueState: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
    lastActivityAt: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

describe("patient one-inbox presentation", () => {
  it("prioritizes the human counterpart and concise session context", () => {
    const item = mapCanonicalConversationToInboxItem(
      conversation(),
      "patient",
      "en",
      t,
    );

    expect(item.title).toBe("Dr. Lina Hassan");
    expect(item.subtitle).toBe("Session");
    expect(item.preview).toBe("See you soon.");
    expect(item.unreadCount).toBe(3);
    expect(item.title).not.toContain("SESSION_CONVERSATION");
    expect(item.destinationRoute).toBe("/(patient)/messages/conversation-1");
  });

  it("keeps support in the same inbox without exposing technical identifiers", () => {
    const item = mapCanonicalConversationToInboxItem(
      conversation({
        conversationId: "support-1",
        id: "support-1",
        type: "SUPPORT",
        title: "support-1",
        subject: "Booking question",
        otherParty: null,
        unreadCount: 0,
      }),
      "patient",
      "en",
      t,
    );

    expect(item.title).toBe("Booking question");
    expect(item.subtitle).toBe("Support");
    expect(item.title).not.toContain("support-1");
    expect(item.destinationRoute).toBe("/(patient)/messages/support-1");
  });

  it("uses backend activity ordering and preserves unread counts", () => {
    const items = sortCanonicalConversationsForInbox(
      [
        conversation({
          conversationId: "older-unread",
          id: "older-unread",
          lastActivityAt: "2026-08-16T09:00:00.000Z",
          unreadCount: 4,
        }),
        conversation({
          conversationId: "newer-read",
          id: "newer-read",
          lastActivityAt: "2026-08-16T11:00:00.000Z",
          unreadCount: 0,
        }),
      ],
      "patient",
      "en",
      t,
    );

    expect(items.map((item) => item.id)).toEqual(["newer-read", "older-unread"]);
    expect(items[1]?.unreadCount).toBe(4);
  });
});
