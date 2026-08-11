import { describe, expect, it } from "vitest";
import { buildSessionLaneItems, filterVisibleCanonicalConversations } from "./session-lane-items";
import type { CanonicalConversation } from "../types/messages-shell.types";

function conversation(overrides: Partial<CanonicalConversation>): CanonicalConversation {
  return {
    id: "conversation-1", conversationId: "conversation-1", supportTicketId: null,
    type: "SESSION", title: "Session chat", subject: null, contextLabel: "Session", contextId: "session-1",
    sessionCode: "S-1", sessionStatus: "COMPLETED", sessionScheduledStartAt: "2026-08-10T12:00:00.000Z",
    status: "OPEN", isResolved: false, isReadOnly: true, canSend: false,
    sendDisabledReason: "SESSION_NOT_SENDABLE", unreadCount: 0, lastMessage: null, participants: [],
    otherParty: { userId: "u-2", displayName: "Dr. Test", avatarUrl: null, publicRoleLabel: "Practitioner" },
    supportQueueState: null, createdAt: "2026-08-10T12:00:00.000Z", updatedAt: "2026-08-10T12:00:00.000Z",
    lastActivityAt: "2026-08-10T12:00:00.000Z", ...overrides,
  };
}

describe("buildSessionLaneItems", () => {
  it("filters empty read-only session conversations from the canonical workspace list", () => {
    const rows = [
      conversation({ conversationId: "with-message", lastMessage: { id: "m1" } as CanonicalConversation["lastMessage"] }),
      conversation({ conversationId: "writable-empty", lastMessage: null, canSend: true }),
      conversation({ conversationId: "read-only-empty", lastMessage: null, canSend: false }),
      conversation({ conversationId: "support-empty", type: "SUPPORT", lastMessage: null, canSend: false }),
    ];

    expect(filterVisibleCanonicalConversations(rows).map((item) => item.conversationId)).toEqual([
      "with-message",
      "writable-empty",
      "support-empty",
    ]);
  });

  it("shows message-bearing and writable sessions, but not empty read-only sessions", () => {
    const items = buildSessionLaneItems("patient", [
      conversation({ conversationId: "empty-read-only" }),
      conversation({ conversationId: "historical", lastMessage: { id: "message-1" } as CanonicalConversation["lastMessage"] }),
      conversation({ conversationId: "active-empty", sessionStatus: "READY_TO_JOIN", canSend: true, isReadOnly: false }),
      conversation({ conversationId: "support", type: "SUPPORT" }),
    ]);
    expect(items.map((item) => item.id)).toEqual(["active-empty", "historical"]);
  });

  it("keeps the list bounded and uses conversation IDs", () => {
    const rows = Array.from({ length: 8 }, (_, index) => conversation({
      conversationId: `conversation-${index}`, contextId: `session-${index}`,
      lastMessage: { id: `message-${index}` } as CanonicalConversation["lastMessage"],
    }));
    const items = buildSessionLaneItems("practitioner", rows);
    expect(items).toHaveLength(6);
    expect(items[0].id).toBe("conversation-0");
    expect(items[0].href).toContain("session-0");
  });
});
