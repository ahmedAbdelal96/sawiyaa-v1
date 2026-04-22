"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ensureGeneralChatSocketConnected,
  getGeneralChatSocket,
} from "@/features/chat/realtime/general-chat-socket.client";
import type {
  CareChatConversationResponse,
  CareChatMessage,
  CareChatParticipantRole,
  SendCareChatMessageInput,
} from "../types/care-chat.types";

function notifyUnreadSummaryDirty() {
  window.dispatchEvent(new CustomEvent("unified-messages:unread-summary:dirty"));
}

export type CareChatRealtimeMessage = CareChatMessage & {
  localStatus: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  clientMessageId?: string;
};

type UseCareChatRealtimeInput = {
  conversationId: string | null;
  serverMessages: CareChatMessage[];
  currentUserId?: string | null;
  currentUserRole: CareChatParticipantRole;
  refetchConversation: () => Promise<unknown> | unknown;
  sendViaRest: (payload: SendCareChatMessageInput) => Promise<CareChatConversationResponse>;
  pollIntervalMs?: number;
};

type BasicAck =
  | { ok: true; conversationId: string; item?: unknown; clientMessageId?: string }
  | { ok: false; code?: string; message?: string };

type CareMessageEvent = {
  conversationId: string;
  item: CareChatMessage;
};

type CareDeliveredEvent = {
  conversationId: string;
  messageId: string;
  deliveredAt: string;
};

type CareReadEvent = {
  conversationId: string;
  lastReadMessageId: string;
  readAt: string;
  userId: string;
};

type CareTypingEvent = {
  conversationId: string;
  userId: string;
};

function toRealtimeMessage(item: CareChatMessage): CareChatRealtimeMessage {
  const localStatus =
    item.status === "READ" ? "READ" : item.status === "DELIVERED" ? "DELIVERED" : "SENT";

  return {
    ...item,
    localStatus,
  };
}

function createClientMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createOptimisticMessage(input: {
  message: string;
  currentUserId?: string | null;
  currentUserRole: CareChatParticipantRole;
  clientMessageId: string;
}): CareChatRealtimeMessage {
  const now = new Date().toISOString();
  return {
    id: `temp:${input.clientMessageId}`,
    senderUserId: input.currentUserId ?? null,
    senderRole: input.currentUserRole,
    message: input.message,
    status: "SENT",
    deliveredAt: null,
    readAt: null,
    createdAt: now,
    localStatus: "SENDING",
    clientMessageId: input.clientMessageId,
  };
}

function replaceOrInsert(
  current: CareChatRealtimeMessage[],
  incoming: CareChatRealtimeMessage,
) {
  const byId = current.findIndex((entry) => entry.id === incoming.id);
  if (byId >= 0) {
    const clone = [...current];
    clone[byId] = incoming;
    return clone;
  }

  return [...current, incoming];
}

export function useCareChatRealtime({
  conversationId,
  serverMessages,
  currentUserId,
  currentUserRole,
  refetchConversation,
  sendViaRest,
  pollIntervalMs = 10_000,
}: UseCareChatRealtimeInput) {
  const [pendingMessages, setPendingMessages] = useState<CareChatRealtimeMessage[]>([]);
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
  const refetchConversationRef = useRef(refetchConversation);
  const sendViaRestRef = useRef(sendViaRest);

  useEffect(() => {
    activeConversationRef.current = conversationId;
    if (!conversationId) {
      lastReadSignalRef.current = null;
      inflightReadSignalRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    refetchConversationRef.current = refetchConversation;
  }, [refetchConversation]);

  useEffect(() => {
    sendViaRestRef.current = sendViaRest;
  }, [sendViaRest]);

  useEffect(() => {
    if (!conversationId) return;

    const socket = ensureGeneralChatSocketConnected();
    if (!socket) return;

    const joinConversation = () => {
      socket.emit("chat:care:join", { conversationId }, (response: BasicAck) => {
        if (!response?.ok) {
          setSocketError(response?.message ?? "CARE_CHAT_JOIN_FAILED");
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

    const handleNewMessage = (event: CareMessageEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      setPendingMessages((current) =>
        replaceOrInsert(current, toRealtimeMessage(event.item)),
      );
    };

    const handleDelivered = (event: CareDeliveredEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;

      setPendingMessages((current) =>
        current.map((entry) =>
          entry.id === event.messageId
            ? {
                ...entry,
                status: "DELIVERED",
                deliveredAt: event.deliveredAt,
                localStatus: "DELIVERED",
              }
            : entry,
        ),
      );
    };

    const handleRead = (event: CareReadEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      if (!currentUserId) return;

      setPendingMessages((current) => {
        const lastReadIndex = current.findIndex((entry) => entry.id === event.lastReadMessageId);
        if (lastReadIndex < 0) return current;

        return current.map((entry, index) => {
          if (index > lastReadIndex) return entry;
          if (entry.senderUserId !== currentUserId) return entry;
          if (entry.localStatus === "SENDING" || entry.localStatus === "FAILED") {
            return entry;
          }

          return {
            ...entry,
            status: "READ",
            deliveredAt: entry.deliveredAt ?? event.readAt,
            readAt: event.readAt,
            localStatus: "READ",
          };
        });
      });

      void refetchConversationRef.current();
    };

    const clearRemoteTyping = () => {
      setIsPeerTyping(false);
      if (remoteTypingTimeoutRef.current) {
        window.clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = null;
      }
    };

    const handleTypingStart = (event: CareTypingEvent) => {
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

    const handleTypingStop = (event: CareTypingEvent) => {
      const activeConversationId = activeConversationRef.current;
      if (!activeConversationId) return;
      if (event.conversationId !== activeConversationId) return;
      if (currentUserId && event.userId === currentUserId) return;
      clearRemoteTyping();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chat:care:newMessage", handleNewMessage);
    socket.on("chat:care:delivered", handleDelivered);
    socket.on("chat:care:read", handleRead);
    socket.on("chat:care:typing:start", handleTypingStart);
    socket.on("chat:care:typing:stop", handleTypingStop);

    if (socket.connected) {
      joinConversation();
    }

    return () => {
      socket.emit("chat:care:leave", { conversationId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("chat:care:newMessage", handleNewMessage);
      socket.off("chat:care:delivered", handleDelivered);
      socket.off("chat:care:read", handleRead);
      socket.off("chat:care:typing:start", handleTypingStart);
      socket.off("chat:care:typing:stop", handleTypingStop);
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
        socket.emit("chat:care:typing:stop", { conversationId });
      }
      typingSentRef.current = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (isSocketConnected) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refetchConversationRef.current();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [conversationId, isSocketConnected, pollIntervalMs]);

  const messages = useMemo(() => {
    const serverItems = serverMessages.map(toRealtimeMessage);
    const serverIds = new Set(serverItems.map((entry) => entry.id));
    const lanePending = pendingMessages.filter((entry) => !serverIds.has(entry.id));
    return [...serverItems, ...lanePending];
  }, [pendingMessages, serverMessages]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    const socket = getGeneralChatSocket();
    if (!socket?.connected) return;

    const isFromCurrentUser = (entry: CareChatRealtimeMessage) => {
      if (entry.senderUserId && currentUserId) {
        return entry.senderUserId === currentUserId;
      }
      return entry.senderRole === currentUserRole;
    };

    const latestVisibleIncoming = [...messages].reverse().find((entry) => {
      if (entry.id.startsWith("temp:")) return false;
      return !isFromCurrentUser(entry);
    });

    if (!latestVisibleIncoming?.id) return;

    const signalKey = `${conversationId}:${latestVisibleIncoming.id}`;
    if (lastReadSignalRef.current === signalKey) return;
    if (inflightReadSignalRef.current === signalKey) return;

    const now = Date.now();
    if (now - lastReadAttemptAtRef.current < 1500) return;
    lastReadAttemptAtRef.current = now;
    inflightReadSignalRef.current = signalKey;

    socket.emit(
      "chat:care:markRead",
      {
        conversationId,
        lastReadMessageId: latestVisibleIncoming.id,
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
          setSocketError(response?.message ?? "CARE_CHAT_MARK_READ_FAILED");
        }
      },
    );
  }, [conversationId, currentUserId, currentUserRole, isSocketConnected, messages]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!conversationId) {
        throw new Error("CARE_CHAT_CONVERSATION_REQUIRED");
      }

      const cleanMessage = message.trim();
      if (!cleanMessage) return;

      const clientMessageId = createClientMessageId();
      const optimistic = createOptimisticMessage({
        message: cleanMessage,
        currentUserId,
        currentUserRole,
        clientMessageId,
      });

      setPendingMessages((current) => [...current, optimistic]);

      const socket = getGeneralChatSocket();
      if (socket?.connected) {
        const ack = await new Promise<BasicAck>((resolve) => {
          socket.timeout(10_000).emit(
            "chat:care:send",
            { conversationId, clientMessageId, message: cleanMessage },
            (error: Error | null, response: BasicAck) => {
              if (error) {
                resolve({ ok: false, message: error.message });
                return;
              }
              resolve(response);
            },
          );
        });

        if (ack?.ok && ack.item) {
          const item = ack.item as CareChatMessage;
          setPendingMessages((current) =>
            replaceOrInsert(
              current.filter((entry) => entry.clientMessageId !== clientMessageId),
              toRealtimeMessage(item),
            ),
          );
          return;
        }
      }

      try {
        const result = await sendViaRestRef.current({ message: cleanMessage });
        const item = result.item.messages[result.item.messages.length - 1];
        if (!item) {
          throw new Error("CARE_CHAT_MESSAGE_NOT_FOUND");
        }

        setPendingMessages((current) =>
          replaceOrInsert(
            current.filter((entry) => entry.clientMessageId !== clientMessageId),
            toRealtimeMessage(item),
          ),
        );
      } catch (error) {
        setPendingMessages((current) =>
          current.map((entry) =>
            entry.clientMessageId === clientMessageId ? { ...entry, localStatus: "FAILED" } : entry,
          ),
        );
        throw error;
      } finally {
        void refetchConversationRef.current();
      }
    },
    [
      conversationId,
      currentUserId,
      currentUserRole,
    ],
  );

  const reportTypingActivity = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      const socket = getGeneralChatSocket();
      if (!socket?.connected) return;

      const emitStop = () => {
        if (!typingSentRef.current) return;
        socket.emit("chat:care:typing:stop", { conversationId });
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
        socket.emit("chat:care:typing:start", { conversationId });
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
