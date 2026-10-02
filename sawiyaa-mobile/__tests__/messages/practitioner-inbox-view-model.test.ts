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
    title: "Internal conversation title",
    subject: null,
    contextLabel: "SESSION_CONVERSATION",
    contextId: "session-internal-id",
    status: "OPEN",
    isResolved: false,
    isReadOnly: false,
    canSend: true,
    sendDisabledReason: null,
    unreadCount: 2,
    lastMessage: {
      id: "message-1",
      conversationId: "conversation-1",
      sender: {
        userId: "patient-1",
        displayName: "Mona Hassan",
        avatarUrl: null,
        publicRoleLabel: "Patient",
      },
      body: "I am ready for the session.",
      messageType: "TEXT",
      sentAt: "2026-08-16T10:00:00.000Z",
      status: "SENT",
      deliveredAt: null,
      readAt: null,
    },
    participants: [],
    otherParty: {
      userId: "patient-1",
      displayName: "Mona Hassan",
      avatarUrl: null,
      publicRoleLabel: "Patient",
    },
    supportQueueState: null,
    createdAt: "2026-08-16T09:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
    lastActivityAt: "2026-08-16T10:00:00.000Z",
    ...overrides,
  };
}

describe("practitioner unified inbox view model", () => {
  it("prioritizes the human counterpart and safe context over internal conversation data", () => {
    const item = mapCanonicalConversationToInboxItem(
      conversation(),
      "practitioner",
      "en",
      t,
    );

    expect(item.title).toBe("Mona Hassan");
    expect(item.subtitle).toBe("Session");
    expect(item.preview).toBe("I am ready for the session.");
    expect(item.unreadCount).toBe(2);
    expect(item.title).not.toContain("conversation-1");
    expect(item.subtitle).not.toContain("SESSION_CONVERSATION");
    expect(item.destinationRoute).toBe("/(practitioner)/messages/conversation-1");
  });

  it("keeps authoritative latest-activity ordering without promoting unread items artificially", () => {
    const olderUnread = conversation({
      conversationId: "older-unread",
      id: "older-unread",
      unreadCount: 5,
      lastActivityAt: "2026-08-16T09:00:00.000Z",
    });
    const newerRead = conversation({
      conversationId: "newer-read",
      id: "newer-read",
      unreadCount: 0,
      lastActivityAt: "2026-08-16T11:00:00.000Z",
    });

    const items = sortCanonicalConversationsForInbox(
      [olderUnread, newerRead],
      "practitioner",
      "en",
      t,
    );

    expect(items.map((item) => item.id)).toEqual(["newer-read", "older-unread"]);
    expect(items[1]?.unreadCount).toBe(5);
  });

  it("uses the concise empty-preview copy when no latest message exists", () => {
    const item = mapCanonicalConversationToInboxItem(
      conversation({ lastMessage: null, unreadCount: 0 }),
      "practitioner",
      "en",
      t,
    );

    expect(item.preview).toBe("No messages yet");
  });
});
