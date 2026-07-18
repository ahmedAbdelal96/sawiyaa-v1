import type { CanonicalMessage } from "./types";

function createClientMessageId(): string {
  const runtimeCrypto = globalThis.crypto as Crypto & { randomUUID?: () => string } | undefined;
  if (runtimeCrypto?.randomUUID) {
    return runtimeCrypto.randomUUID();
  }

  const randomPart = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2))
    .join("")
    .slice(0, 32);
  return `msg_${randomPart}`;
}

export type MessageSendDescriptor = {
  clientMessageId: string;
  conversationId: string;
  text: string;
};

export function buildMessageSendPayload(descriptor: MessageSendDescriptor) {
  return {
    message: descriptor.text,
    clientMessageId: descriptor.clientMessageId,
  };
}

export function createMessageSendDescriptor(
  conversationId: string,
  text: string,
): MessageSendDescriptor {
  return {
    clientMessageId: createClientMessageId(),
    conversationId,
    text,
  };
}

export function findMessageIdentityIndex(
  messages: CanonicalMessage[],
  incoming: CanonicalMessage,
): number {
  return messages.findIndex((message) =>
    (incoming.clientMessageId && message.clientMessageId === incoming.clientMessageId) ||
    message.id === incoming.id,
  );
}

export function reconcileCanonicalMessage(
  messages: CanonicalMessage[],
  incoming: CanonicalMessage,
): CanonicalMessage[] {
  const existingIndex = findMessageIdentityIndex(messages, incoming);
  if (existingIndex === -1) {
    return [...messages, incoming];
  }

  const next = [...messages];
  next[existingIndex] = incoming;
  return next;
}
