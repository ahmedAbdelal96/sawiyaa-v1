"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AddSupportMessageRequest,
  SupportMessage,
  SupportMessageSenderRole,
} from "../types/support.types";
import {
  ensureGeneralChatSocketConnected,
  getGeneralChatSocket,
} from "@/features/chat/realtime/general-chat-socket.client";

function notifyUnreadSummaryDirty() {
  window.dispatchEvent(new CustomEvent("unified-messages:unread-summary:dirty"));
}

export type SupportRealtimeMessage = SupportMessage & {
  localStatus: "SENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  clientMessageId?: string;
};

type MessageStatusOverride = {
  status?: SupportMessage["status"];
  deliveredAt?: string | null;
  readAt?: string | null;
};

type UseSupportChatRealtimeInput = {
  ticketId: string | null;
  serverMessages: SupportMessage[];
  currentUserId?: string | null;
  currentUserRole: SupportMessageSenderRole;
  refetchTicket: () => Promise<unknown> | unknown;
  sendViaRest: (payload: AddSupportMessageRequest) => Promise<unknown>;
  pollIntervalMs?: number;
};

type BasicAck =
  | { ok: true; conversationId: string; item?: unknown; clientMessageId?: string }
  | { ok: false; code?: string; message?: string };

type SupportMessageEvent = {
  ticketId: string;
  item: SupportMessage;
};

type SupportDeliveredEvent = {
  ticketId: string;
  messageId: string;
  deliveredAt: string;
};

type SupportReadEvent = {
  ticketId: string;
  lastReadMessageId: string;
  readAt: string;
  userId: string;
};

type SupportTypingEvent = {
  ticketId: string;
  userId: string;
};

function toRealtimeMessage(item: SupportMessage): SupportRealtimeMessage {
  // Be tolerant: some backend paths may fill deliveredAt/readAt before the status field is refetched.
  const localStatus =
    item.status === "READ" || Boolean(item.readAt)
      ? "READ"
      : item.status === "DELIVERED" || Boolean(item.deliveredAt)
        ? "DELIVERED"
        : "SENT";

  return {
    ...item,
    localStatus,
  };
}

function applyOverride(
  item: SupportMessage,
  override: MessageStatusOverride | undefined,
): SupportMessage {
  if (!override) return item;
  return {
    ...item,
    status: (override.status ?? item.status) as SupportMessage["status"],
    deliveredAt: override.deliveredAt ?? item.deliveredAt,
    readAt: override.readAt ?? item.readAt,
  };
}

function createClientMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createOptimisticMessage(input: {
  message: string;
  currentUserId?: string | null;
  currentUserRole: SupportMessageSenderRole;
  clientMessageId: string;
}): SupportRealtimeMessage {
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
  current: SupportRealtimeMessage[],
  incoming: SupportRealtimeMessage,
) {
  const byId = current.findIndex((entry) => entry.id === incoming.id);
  if (byId >= 0) {
    const clone = [...current];
    clone[byId] = incoming;
    return clone;
  }

  return [...current, incoming];
}

export function useSupportChatRealtime({
  ticketId,
  serverMessages,
  currentUserId,
  currentUserRole,
  refetchTicket,
  sendViaRest,
  pollIntervalMs = 10_000,
}: UseSupportChatRealtimeInput) {
  const [pendingMessages, setPendingMessages] = useState<SupportRealtimeMessage[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, MessageStatusOverride>>(
    {},
  );
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(
    () => Boolean(getGeneralChatSocket()?.connected),
  );
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [socketError, setSocketError] = useState<string | null>(null);
  const activeTicketRef = useRef<string | null>(ticketId);
  const lastReadSignalRef = useRef<string | null>(null);
  const inflightReadSignalRef = useRef<string | null>(null);
  const lastReadAttemptAtRef = useRef<number>(0);
  const authRecoveryRef = useRef<{ ticketId: string; at: number } | null>(null);
  const serverMessagesRef = useRef<SupportMessage[]>(serverMessages);
  const overridesRef = useRef<Record<string, MessageStatusOverride>>(statusOverrides);
  const pendingMessagesRef = useRef<SupportRealtimeMessage[]>(pendingMessages);
  const remoteTypingTimeoutRef = useRef<number | null>(null);
  const typingStopTimerRef = useRef<number | null>(null);
  const typingSentRef = useRef(false);
  const lastTypingEmitAtRef = useRef(0);
  const refetchTicketRef = useRef(refetchTicket);
  const sendViaRestRef = useRef(sendViaRest);

  useEffect(() => {
    activeTicketRef.current = ticketId;
    if (!ticketId) {
      lastReadSignalRef.current = null;
      inflightReadSignalRef.current = null;
    }
  }, [ticketId]);

  useEffect(() => {
    serverMessagesRef.current = serverMessages;
  }, [serverMessages]);

  useEffect(() => {
    overridesRef.current = statusOverrides;
  }, [statusOverrides]);

  useEffect(() => {
    pendingMessagesRef.current = pendingMessages;
  }, [pendingMessages]);

  useEffect(() => {
    refetchTicketRef.current = refetchTicket;
  }, [refetchTicket]);

  useEffect(() => {
    sendViaRestRef.current = sendViaRest;
  }, [sendViaRest]);

  useEffect(() => {
    if (!ticketId) return;

    const socket = ensureGeneralChatSocketConnected();
    if (!socket) return;

    const joinTicket = () => {
      socket.emit("chat:support:join", { ticketId }, (response: BasicAck) => {
        if (!response?.ok) {
          setSocketError(response?.message ?? "SUPPORT_JOIN_FAILED");

          if (response?.code === "AUTH_REQUIRED") {
            const now = Date.now();
            const previous = authRecoveryRef.current;
            if (!previous || previous.ticketId !== ticketId || now - previous.at > 5000) {
              authRecoveryRef.current = { ticketId, at: now };
              lastReadSignalRef.current = null;
              try {
                socket.disconnect();
              } finally {
                ensureGeneralChatSocketConnected();
              }
            }
          }
        } else {
          setSocketError(null);
          // Join can trigger delivered transitions on the backend; force-refresh the ticket to avoid
          // stale cached message status when the component mounts after events were emitted.
          void refetchTicketRef.current();
          notifyUnreadSummaryDirty();
        }
      });
    };

    const handleConnect = () => {
      setIsSocketConnected(true);
      setSocketError(null);
      joinTicket();
    };

    const handleDisconnect = () => {
      setIsSocketConnected(false);
    };

    const handleConnectError = () => {
      setIsSocketConnected(false);
      setSocketError("CONNECT_ERROR");
    };

    const handleNewMessage = (event: SupportMessageEvent) => {
      const activeTicketId = activeTicketRef.current;
      if (!activeTicketId) return;
      if (event.ticketId !== activeTicketId) return;

      // Best-effort dedupe: if we have an optimistic message with the same text that is still pending,
      // remove it when the server broadcasts the stored message.
      setPendingMessages((current) => {
        const matchIndex = current.findIndex(
          (entry) =>
            entry.id.startsWith("temp:") &&
            (entry.localStatus === "SENDING" || entry.localStatus === "FAILED") &&
            entry.message.trim() === event.item.message.trim() &&
            Date.now() - new Date(entry.createdAt).getTime() <= 30_000,
        );
        if (matchIndex < 0) return current;
        const clone = [...current];
        clone.splice(matchIndex, 1);
        return clone;
      });

      setPendingMessages((current) =>
        replaceOrInsert(current, toRealtimeMessage(event.item)),
      );
    };

    const handleDelivered = (event: SupportDeliveredEvent) => {
      const activeTicketId = activeTicketRef.current;
      if (!activeTicketId) return;
      if (event.ticketId !== activeTicketId) return;

      // Persist as an override so it applies even when the message moves from pending -> server list.
      setStatusOverrides((current) => ({
        ...current,
        [event.messageId]: {
          ...(current[event.messageId] ?? {}),
          status: "DELIVERED",
          deliveredAt: event.deliveredAt,
        },
      }));

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

    const handleRead = (event: SupportReadEvent) => {
      const activeTicketId = activeTicketRef.current;
      if (!activeTicketId) return;
      if (event.ticketId !== activeTicketId) return;
      if (!currentUserId) return;

      const serverSnapshot = serverMessagesRef.current;
      const overridesSnapshot = overridesRef.current;
      const pendingSnapshot = pendingMessagesRef.current;

      // Apply read cursor to both pending + server messages via overrides.
      const merged = [
        ...serverSnapshot.map((item) =>
          toRealtimeMessage(applyOverride(item, overridesSnapshot[item.id])),
        ),
        ...pendingSnapshot,
      ];

      const lastReadIndex = merged.findIndex((entry) => entry.id === event.lastReadMessageId);
      if (lastReadIndex >= 0) {
        const overrides: Record<string, MessageStatusOverride> = {};
        for (let index = 0; index <= lastReadIndex; index += 1) {
          const entry = merged[index];
          if (entry.id.startsWith("temp:")) continue;
          if (entry.senderUserId !== currentUserId) continue;
          if (entry.localStatus === "SENDING" || entry.localStatus === "FAILED") continue;
          overrides[entry.id] = {
            status: "READ",
            deliveredAt: entry.deliveredAt ?? event.readAt,
            readAt: event.readAt,
          };
        }
        setStatusOverrides((current) => ({ ...current, ...overrides }));
      }

      setPendingMessages((current) => {
        const currentMerged = [
          ...serverSnapshot.map((item) =>
            toRealtimeMessage(applyOverride(item, overridesSnapshot[item.id])),
          ),
          ...current,
        ];
        const cursorIndex = currentMerged.findIndex(
          (entry) => entry.id === event.lastReadMessageId,
        );
        if (cursorIndex < 0) return current;

        const cursorIds = new Set(
          currentMerged.slice(0, cursorIndex + 1).map((entry) => entry.id),
        );

        return current.map((entry) => {
          if (!cursorIds.has(entry.id)) return entry;
          if (entry.senderUserId !== currentUserId) return entry;
          if (entry.localStatus === "SENDING" || entry.localStatus === "FAILED") return entry;
          return {
            ...entry,
            status: "READ",
            deliveredAt: entry.deliveredAt ?? event.readAt,
            readAt: event.readAt,
            localStatus: "READ",
          };
        });
      });

      void refetchTicketRef.current();
    };

    const clearRemoteTyping = () => {
      setIsPeerTyping(false);
      if (remoteTypingTimeoutRef.current) {
        window.clearTimeout(remoteTypingTimeoutRef.current);
        remoteTypingTimeoutRef.current = null;
      }
    };

    const handleTypingStart = (event: SupportTypingEvent) => {
      const activeTicketId = activeTicketRef.current;
      if (!activeTicketId) return;
      if (event.ticketId !== activeTicketId) return;
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

    const handleTypingStop = (event: SupportTypingEvent) => {
      const activeTicketId = activeTicketRef.current;
      if (!activeTicketId) return;
      if (event.ticketId !== activeTicketId) return;
      if (currentUserId && event.userId === currentUserId) return;
      clearRemoteTyping();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("chat:support:newMessage", handleNewMessage);
    socket.on("chat:support:delivered", handleDelivered);
    socket.on("chat:support:read", handleRead);
    socket.on("chat:support:typing:start", handleTypingStart);
    socket.on("chat:support:typing:stop", handleTypingStop);

    if (socket.connected) {
      joinTicket();
    }

    return () => {
      socket.emit("chat:support:leave", { ticketId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("chat:support:newMessage", handleNewMessage);
      socket.off("chat:support:delivered", handleDelivered);
      socket.off("chat:support:read", handleRead);
      socket.off("chat:support:typing:start", handleTypingStart);
      socket.off("chat:support:typing:stop", handleTypingStop);
      clearRemoteTyping();
    };
  }, [currentUserId, ticketId]);

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        window.clearTimeout(typingStopTimerRef.current);
      }
      const socket = getGeneralChatSocket();
      if (socket?.connected && ticketId && typingSentRef.current) {
        socket.emit("chat:support:typing:stop", { ticketId });
      }
      typingSentRef.current = false;
    };
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    if (isSocketConnected) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refetchTicketRef.current();
    }, pollIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [isSocketConnected, pollIntervalMs, ticketId]);

  const messages = useMemo(() => {
    const serverItems = serverMessages.map((item) =>
      toRealtimeMessage(applyOverride(item, statusOverrides[item.id])),
    );
    const serverIds = new Set(serverItems.map((entry) => entry.id));
    const lanePending = pendingMessages.filter((entry) => !serverIds.has(entry.id));
    return [...serverItems, ...lanePending];
  }, [pendingMessages, serverMessages, statusOverrides]);

  useEffect(() => {
    if (!ticketId || !currentUserId) return;
    const socket = getGeneralChatSocket();
    if (!socket?.connected) return;

    const isFromCurrentUser = (entry: SupportRealtimeMessage) => {
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

    const signalKey = `${ticketId}:${latestVisibleIncoming.id}`;
    if (lastReadSignalRef.current === signalKey) return;
    if (inflightReadSignalRef.current === signalKey) return;

    const now = Date.now();
    if (now - lastReadAttemptAtRef.current < 1500) return;
    lastReadAttemptAtRef.current = now;
    inflightReadSignalRef.current = signalKey;

    socket.emit(
      "chat:support:markRead",
      {
        ticketId,
        lastReadMessageId: latestVisibleIncoming.id,
      },
      (response: BasicAck) => {
        if (response?.ok) {
          lastReadSignalRef.current = signalKey;
          inflightReadSignalRef.current = null;
          notifyUnreadSummaryDirty();
          return;
        }

        inflightReadSignalRef.current = null;
        setSocketError(response?.message ?? "SUPPORT_MARK_READ_FAILED");

        // If we somehow emitted before the socket finished authenticating (or auth expired),
        // attempt a single quick reconnect recovery and let the effect retry naturally.
        if (response?.code === "AUTH_REQUIRED") {
          const now = Date.now();
          const previous = authRecoveryRef.current;
          if (!previous || previous.ticketId !== ticketId || now - previous.at > 5000) {
            authRecoveryRef.current = { ticketId, at: now };
            lastReadSignalRef.current = null;
            inflightReadSignalRef.current = null;
            try {
              socket.disconnect();
            } finally {
              ensureGeneralChatSocketConnected();
            }
          }
        }
      },
    );
  }, [currentUserId, currentUserRole, isSocketConnected, messages, ticketId]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!ticketId) {
        throw new Error("SUPPORT_TICKET_REQUIRED");
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

      const socket = ensureGeneralChatSocketConnected();
      if (socket?.connected) {
        const ack = await new Promise<BasicAck>((resolve) => {
          socket.timeout(10_000).emit(
            "chat:support:send",
            { ticketId, clientMessageId, message: cleanMessage },
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
          const item = ack.item as SupportMessage;
          setPendingMessages((current) =>
            replaceOrInsert(
              current.filter((entry) => entry.clientMessageId !== clientMessageId),
              toRealtimeMessage(item),
            ),
          );
          return;
        }

        // Do not automatically fall back to REST on socket failure/timeouts because that can create duplicates.
        // Instead mark the optimistic entry as failed; user can retry and we also refetch for safety.
        const ackMessage = ack && !ack.ok ? ack.message : null;
        setSocketError(ackMessage ?? "SUPPORT_SEND_FAILED");
        setPendingMessages((current) =>
          current.map((entry) =>
            entry.clientMessageId === clientMessageId
              ? { ...entry, localStatus: "FAILED" }
              : entry,
          ),
        );
        void refetchTicketRef.current();
        return;
      }

      try {
        await sendViaRestRef.current({ message: cleanMessage });
        // REST returns the full ticket; we refetch and remove the optimistic placeholder to avoid duplicates.
        setPendingMessages((current) =>
          current.filter((entry) => entry.clientMessageId !== clientMessageId),
        );
      } catch (error) {
        setPendingMessages((current) =>
          current.map((entry) =>
            entry.clientMessageId === clientMessageId
              ? { ...entry, localStatus: "FAILED" }
              : entry,
          ),
        );
        throw error;
      } finally {
        void refetchTicketRef.current();
      }
    },
    [currentUserId, currentUserRole, ticketId],
  );

  const reportTypingActivity = useCallback(
    (isTyping: boolean) => {
      if (!ticketId) return;
      const socket = getGeneralChatSocket();
      if (!socket?.connected) return;

      const emitStop = () => {
        if (!typingSentRef.current) return;
        socket.emit("chat:support:typing:stop", { ticketId });
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
        socket.emit("chat:support:typing:start", { ticketId });
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
    [ticketId],
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
