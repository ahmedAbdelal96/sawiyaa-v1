import type { MessagingMessage } from "@/features/messages-shell/types/messages-shell.types";

export type MessageSendDescriptor = {
  clientMessageId: string;
  conversationId: string;
  message: string;
};

function createClientMessageId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2))
    .join("")
    .slice(0, 32);
  return `msg_${randomPart}`;
}

export function createMessageSendDescriptor(
  conversationId: string,
  message: string,
): MessageSendDescriptor {
  return {
    clientMessageId: createClientMessageId(),
    conversationId,
    message,
  };
}

export function buildMessageSendPayload(descriptor: MessageSendDescriptor) {
  return {
    message: descriptor.message,
    clientMessageId: descriptor.clientMessageId,
    attachments: [],
  };
}

export function findMessageIdentityIndex(
  messages: MessagingMessage[],
  incoming: MessagingMessage,
) {
  return messages.findIndex((message) =>
    (incoming.clientMessageId && message.clientMessageId === incoming.clientMessageId) ||
    message.id === incoming.id,
  );
}

export function reconcileCanonicalMessage(
  messages: MessagingMessage[],
  incoming: MessagingMessage,
) {
  const existingIndex = findMessageIdentityIndex(messages, incoming);
  if (existingIndex === -1) return [...messages, incoming];

  const next = [...messages];
  next[existingIndex] = incoming;
  return next;
}
