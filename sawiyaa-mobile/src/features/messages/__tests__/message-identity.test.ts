import {
  buildMessageSendPayload,
  createMessageSendDescriptor,
  findMessageIdentityIndex,
  reconcileCanonicalMessage,
} from "../message-identity";
import type { CanonicalMessage } from "../types";

function message(id: string, clientMessageId?: string, body = "hello"): CanonicalMessage {
  return {
    id,
    conversationId: "conversation-1",
    clientMessageId,
    sender: {
      userId: "user-1",
      displayName: "",
      avatarUrl: null,
      publicRoleLabel: "Patient",
    },
    body,
    messageType: "TEXT",
    sentAt: "2026-07-18T10:00:00.000Z",
    status: "SENT",
    deliveredAt: null,
    readAt: null,
  };
}

describe("message identity reconciliation", () => {
  it("creates one stable id for a logical send descriptor", () => {
    const descriptor = createMessageSendDescriptor("conversation-1", "hello");
    expect(descriptor.clientMessageId).toMatch(/^(msg_[a-z0-9]+|[0-9a-f-]{36})$/i);
    expect(descriptor.clientMessageId).toBeTruthy();
  });

  it("builds the same keyed payload for Socket.IO and HTTP callers", () => {
    const descriptor = createMessageSendDescriptor("conversation-1", "hello");
    expect(buildMessageSendPayload(descriptor)).toEqual({
      message: "hello",
      clientMessageId: descriptor.clientMessageId,
    });
  });

  it("replaces an optimistic message when the server response has the same client id", () => {
    const optimistic = message("optimistic:client-1", "client-1");
    const canonical = message("server-1", "client-1");
    const result = reconcileCanonicalMessage([optimistic], canonical);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("server-1");
  });

  it("deduplicates an event and ack in either arrival order", () => {
    const canonical = message("server-1", "client-1");
    expect(reconcileCanonicalMessage([canonical], canonical)).toHaveLength(1);
    expect(findMessageIdentityIndex([canonical], message("different-id", "client-1"))).toBe(0);
  });

  it("keeps two identical bodies with different client ids separate", () => {
    const first = message("server-1", "client-1");
    const second = message("server-2", "client-2");
    expect(reconcileCanonicalMessage([first], second)).toHaveLength(2);
  });
});
