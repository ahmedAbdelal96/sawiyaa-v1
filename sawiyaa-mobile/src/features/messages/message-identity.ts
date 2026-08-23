import type { CanonicalMessage, CanonicalMessageAttachment } from "./types";
import { createMobileUuid } from "../../lib/mobile-uuid";

function createClientMessageId(): string {
  return createMobileUuid();
}

export type MessageSendDescriptor = {
  clientMessageId: string;
  conversationId: string;
  text: string;
  attachments?: CanonicalMessageAttachment[];
};

function resolveStoredFileId(fileUrl: string, fallback: string) {
  const candidate = fileUrl.split(/[?#]/, 1)[0].split("/").pop();
  return candidate && candidate.length > 0 ? candidate : fallback;
}

export function normalizeCanonicalMessage(message: CanonicalMessage): CanonicalMessage {
  if (!message.attachments?.length) {
    return message;
  }

  return {
    ...message,
    attachments: message.attachments.map((attachment) => ({
      ...attachment,
      id: resolveStoredFileId(attachment.fileUrl, attachment.id),
    })),
  };
}

export function buildMessageSendPayload(descriptor: MessageSendDescriptor) {
  return {
    message: descriptor.text,
    clientMessageId: descriptor.clientMessageId,
    ...(descriptor.attachments?.length ? { attachments: descriptor.attachments.map((attachment) => ({
      fileId: attachment.id,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      originalName: attachment.originalName,
    })) } : {}),
  };
}

export function createMessageSendDescriptor(
  conversationId: string,
  text: string,
  attachments?: CanonicalMessageAttachment[],
): MessageSendDescriptor {
  return {
    clientMessageId: createClientMessageId(),
    conversationId,
    text,
    attachments,
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
