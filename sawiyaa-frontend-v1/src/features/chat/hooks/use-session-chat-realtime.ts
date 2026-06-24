"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GeneralChatMessageItem,
  SendGeneralChatMessageInput,
  SendGeneralChatMessageResponse,
} from "../types/general-chat.types";
import {
  ensureGeneralChatSocketConnected,
  getGeneralChatSocket,
} from "../realtime/general-chat-socket.client";

function notifyUnreadSummaryDirty() {
  window.dispatchEvent(new CustomEvent("unified-messages:unread-summary:dirty"));
}

export type SessionChatRealtimeMessage = GeneralChatMessageItem & {
  localStatus: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  clientMessageId?: string;
};

type UseSessionChatRealtimeInput = {
  conversationId: string | null;
  serverMessages: GeneralChatMessageItem[];
  refetchMessages: () => Promise<unknown> | unknown;
  sendViaRest: (
    payload: SendGeneralChatMessageInput,
  ) => Promise<SendGeneralChatMessageResponse>;
  currentUserId?: string | null;
  pollIntervalMs?: number;
};

type BasicAck =
  | {
      ok: true;
      conversationId: string;
    }
  | {
      ok: false;
      code?: string;
      message?: string;
    };

type SendAck =
  | {
      ok: true;
      conversationId: string;
      clientMessageId?: string;
      item: GeneralChatMessageItem;
    }
  | {
      ok: false;
      code?: string;
      message?: string;
    };

type NewMessageEvent = {
  conversationId: string;
  item: GeneralChatMessageItem;
};

type DeliveredEvent = {
  conversationId: string;
  messageId: string;
  deliveredAt: string;
};

type ReadEvent = {
  conversationId: string;
  lastReadMessageId: string;
  readAt: string;
  userId: string;
};

type TypingEvent = {
  conversationId: string;
  userId: string;
};

type LocalPendingMessage = SessionChatRealtimeMessage & {
  conversationId: string;
};

function toSentMessage(item: GeneralChatMessageItem): SessionChatRealtimeMessage {
  const localStatus =
    item.status === "READ"
      ? "READ"
      : item.status === "DELIVERED"
        ? "DELIVERED"
        : "SENT";
  return {
    ...item,
    localStatus,
  };
}

function createClientMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createOptimisticMessage(
  conversationId: string,
  payload: SendGeneralChatMessageInput,
  clientMessageId: string,
): LocalPendingMessage {
  const now = new Date().toISOString();
  return {
    messageId: `temp:${clientMessageId}`,
    conversationId,
    senderUserId: null,
    senderIdentity: null,
    messageType: "TEXT",
    status: "SENT",
    contentText: payload.message,
    sentAt: now,
    deliveredAt: null,
    readAt: null,
    attachments:
      payload.attachments?.map((item) => ({
        fileId: item.fileId,
        fileUrl: item.fileUrl,
        mimeType: item.mimeType,
        fileSize: item.fileSize ?? null,
        originalName: item.originalName ?? null,
      })) ?? [],
    conversationLatestActivityAt: now,
    localStatus: "SENDING",
    clientMessageId,
  };
}

function replaceOrInsert(
  current: LocalPendingMessage[],
  incoming: LocalPendingMessage,
) {
  const byMessageId = current.findIndex((entry) => entry.messageId === incoming.messageId);
  if (byMessageId >= 0) {
    const clone = [...current];
    clone[byMessageId] = incoming;
    return clone;
  }

  return [incoming, ...current];
}

export function useSessionChatRealtime({
  conversationId,
  serverMessages,
  refetchMessages,
  sendViaRest,
  currentUserId,
  pollIntervalMs = 4000,
}: UseSessionChatRealtimeInput) {
  const [pendingMessages, setPendingMessages] = useState<LocalPendingMessage[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(
    () => Boolean(getGeneralChatSocket()?.connected),
  );
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const activeConversationRef = useRef<string | null>(conversationId);
  const lastReadSignalRef = useRef<string | null>(null);
  const inflightReadSignalRef = useRef<string | null>(null);
  const lastReadAttemptAtRef = useRef<number>(0);
  const remoteTypingTimeoutRef = useRef<number | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const typingSentRef = useRef(false);
  const lastTypingEmitAtRef = useRef(0);
  const refetchMessagesRef = useRef(refetchMessages);
  const sendViaRestRef = useRef(sendViaRest);

  useEffect(() => {
    activeConversationRef.current = conversationId;
    if (!conversationId) {
      lastReadSignalRef.current = null;
      inflightReadSignalRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    refetchMessagesRef.current = refetchMessages;
  }, [refetchMessages]);

  useEffect(() => {
    sendViaRestRef.current = sendViaRest;
  }, [sendViaRest]);

  useEffect(() => {
    if (!conversationId) return;

    const socket = ensureGeneralChatSocketConnected();
    if (!socket) return;

    const joinConversation = () => {
      socket.emit("chat:join", { conversationId }, (response: BasicAck) => {
        if (!response?.ok) {
          setSocketError(response?.message ?? "JOIN_FAILED");
        } else {
          setSocketError(null);
        }
      });
    };

    const handleConnect = () => {
      setIsSocketConnected(true);
      setSocketError(null);
      joinConversation();
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleConnectError = () => {
      setIsSocketConnected(false);
      setSocketError("CONNECT_ERROR");
    };

    const handleNewMessage = (event: NewMessageEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      setPendingMessages((current) =>
        replaceOrInsert(current, {
          ...toSentMessage(event.item),
          conversationId: event.conversationId,
        }),
      );
    };

    const handleDelivered = (event: DeliveredEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;

      setPendingMessages((current) =>
        current.map((entry) =>
          entry.messageId === event.messageId
            ? {
                ...entry,
                status: "DELIVERED",
                deliveredAt: event.deliveredAt,
                localStatus: "DELIVERED" as const,
              }
            : entry,
        ),
      );
    };

    const handleRead = (event: ReadEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      if (!currentUserId) return;

      setPendingMessages((current) => {
        const lastReadIndex = current.findIndex(
          (entry) => entry.messageId === event.lastReadMessageId,
        );
        if (lastReadIndex < 0) return current;

        return current.map((entry, index) => {
          if (index < lastReadIndex) return entry;
          if (entry.senderUserId !== currentUserId) return entry;
          if (entry.localStatus === "SENDING" || entry.localStatus === "FAILED") {
            return entry;
          }

          return {
            ...entry,
            status: "READ",
            deliveredAt: entry.deliveredAt ?? event.readAt,
            readAt: event.readAt,
            localStatus: "READ" as const,
          };
        });
      });

      void refetchMessagesRef.current();
    };

    const clearRemoteTyping = () => {
      setIsPeerTyping(false);
      if (remoteTypingTimeoutRef.current) {
        window.clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = null;
      }
    };

    const handleTypingStart = (event: TypingEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      if (currentUserId && event.userId === currentUserId) return;

      setIsPeerTyping(true);
      if (remoteTypingTimeoutRef.current) {
        window.clearTimeout(remoteTypingTimeoutRef.current);
      }
      remoteTypingTimeoutRef.current = window.setTimeout(() => {
        setIsPeerTyping(false);
        remoteTypingTimeoutRef.current = null;
      }, 4000);
    };

    const handleTypingStop = (event: TypingEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      if (currentUserId && event.userId === currentUserId) return;
      clearRemoteTyping();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chat:newMessage", handleNewMessage);
    socket.on("chat:delivered", handleDelivered);
    socket.on("chat:read", handleRead);
    socket.on("chat:typing:start", handleTypingStart);
    socket.on("chat:typing:stop", handleTypingStop);

    if (socket.connected) {
      joinConversation();
    }

    return () => {
      socket.emit("chat:leave", { conversationId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("chat:newMessage", handleNewMessage);
      socket.off("chat:delivered", handleDelivered);
      socket.off("chat:read", handleRead);
      socket.off("chat:typing:start", handleTypingStart);
      socket.off("chat:typing:stop", handleTypingStop);
      clearRemoteTyping();
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      const socket = getGeneralChatSocket();
      if (socket?.connected && conversationId && typingSentRef.current) {
        socket.emit("chat:typing:stop", { conversationId });
      }
      typingSentRef.current = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (isSocketConnected) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refetchMessagesRef.current();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [conversationId, isSocketConnected, pollIntervalMs]);

  const sendMessage = useCallback(
    async (payload: SendGeneralChatMessageInput) => {
      if (!conversationId) {
        throw new Error("CONVERSATION_REQUIRED");
      }

      const clientMessageId = createClientMessageId();
      const optimistic = createOptimisticMessage(
        conversationId,
        payload,
        clientMessageId,
      );

      setPendingMessages((current) => [optimistic, ...current]);

      const socket = getGeneralChatSocket();
      if (socket?.connected) {
        const ack = await new Promise<SendAck>((resolve) => {
          socket.timeout(10_000).emit(
            "chat:send",
            {
              conversationId,
              clientMessageId,
              message: payload.message,
              attachments: payload.attachments ?? [],
            },
            (error: Error | null, response: SendAck) => {
              if (error) {
                resolve({
                  ok: false,
                  message: error.message,
                });
                return;
              }
              resolve(response);
            },
          );
        });

        if (ack?.ok) {
          setPendingMessages((current) =>
            replaceOrInsert(
              current.filter((entry) => entry.clientMessageId !== clientMessageId),
              {
                ...toSentMessage(ack.item),
                conversationId,
              },
            ),
          );
          return ack.item;
        }
      }

      try {
        const rest = await sendViaRestRef.current(payload);
        setPendingMessages((current) =>
          replaceOrInsert(
            current.filter((entry) => entry.clientMessageId !== clientMessageId),
            {
              ...toSentMessage(rest.item),
              conversationId,
            },
          ),
        );
        return rest.item;
      } catch (error) {
        setPendingMessages((current) =>
          current.map((entry) =>
            entry.clientMessageId === clientMessageId
              ? { ...entry, localStatus: "FAILED" as const }
              : entry,
          ),
        );
        throw error;
      }
    },
    [conversationId],
  );

  const reportTypingActivity = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      const socket = getGeneralChatSocket();
      if (!socket?.connected) return;

      const emitStop = () => {
        if (!typingSentRef.current) return;
        socket.emit("chat:typing:stop", { conversationId });
        typingSentRef.current = false;
      };

      if (!isTyping) {
        if (typingStopTimerRef.current) {
          window.clearTimeout(typingStopTimerRef.current);
          typingStopTimerRef.current = null;
        }
        emitStop();
        return;
      }

      const now = Date.now();
      const shouldEmitStart =
        !typingSentRef.current || now - lastTypingEmitAtRef.current >= 2000;
      if (shouldEmitStart) {
        socket.emit("chat:typing:start", { conversationId });
        typingSentRef.current = true;
        lastTypingEmitAtRef.current = now;
      }

      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      typingStopTimerRef.current = window.setTimeout(() => {
        emitStop();
        typingStopTimerRef.current = null;
      }, 1400);
    },
    [conversationId],
  );

  const messages = useMemo(() => {
    const serverItems = serverMessages.map(toSentMessage);
    const serverIds = new Set(serverItems.map((entry) => entry.messageId));
    const lanePending = pendingMessages.filter(
      (entry) =>
        entry.conversationId === conversationId && !serverIds.has(entry.messageId),
    );

    return [...lanePending, ...serverItems];
  }, [conversationId, pendingMessages, serverMessages]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const socket = getGeneralChatSocket();
    if (!socket?.connected) return;

    const latestVisibleIncoming = messages.find(
      (entry) =>
        entry.senderUserId !== null &&
        entry.senderUserId !== currentUserId &&
        !entry.messageId.startsWith("temp:"),
    );

    if (!latestVisibleIncoming?.messageId) return;

    const signalKey = `${conversationId}:${latestVisibleIncoming.messageId}`;
    if (lastReadSignalRef.current === signalKey) return;
    if (inflightReadSignalRef.current === signalKey) return;

    const now = Date.now();
    if (now - lastReadAttemptAtRef.current < 1500) return;
    lastReadAttemptAtRef.current = now;
    inflightReadSignalRef.current = signalKey;

    socket.emit(
      "chat:markRead",
      {
        conversationId,
        lastReadMessageId: latestVisibleIncoming.messageId,
      },
      (response: BasicAck) => {
        if (response?.ok) {
          lastReadSignalRef.current = signalKey;
          inflightReadSignalRef.current = null;
          notifyUnreadSummaryDirty();
          return;
        }
        if (!response?.ok) {
          inflightReadSignalRef.current = null;
          setSocketError(response?.message ?? "MARK_READ_FAILED");
        }
      },
    );
  }, [conversationId, currentUserId, isSocketConnected, messages]);

  return useMemo(
    () => ({
      messages,
      isSocketConnected,
      isPeerTyping,
      socketError,
      sendMessage,
      reportTypingActivity,
    }),
    [
      isPeerTyping,
      isSocketConnected,
      messages,
      reportTypingActivity,
      sendMessage,
      socketError,
    ],
  );
}
