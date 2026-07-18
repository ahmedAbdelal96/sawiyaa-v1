"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCanonicalMessages,
  markCanonicalConversationRead,
  sendCanonicalMessage,
} from "@/features/messages-shell/api/messages-shell.api";
import {
  ensureUnifiedMessagesSocketConnected,
  getUnifiedMessagesSocket,
} from "../realtime/unified-messages-socket.client";
import type { MessagingMessage } from "@/features/messages-shell/types/messages-shell.types";
import {
  buildMessageSendPayload,
  createMessageSendDescriptor,
  reconcileCanonicalMessage,
} from "../lib/message-identity";

interface UseUnifiedMessagesProps {
  conversationId: string | null;
  currentUserId: string | null;
  currentUserRole?: "Patient" | "Practitioner" | "Support team" | "Admin";
}

export function useUnifiedMessages({ conversationId, currentUserId, currentUserRole = "Admin" }: UseUnifiedMessagesProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<MessagingMessage[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesMap = useRef<Record<string, boolean>>({});
  const pendingMessagesRef = useRef<Record<string, { descriptor: ReturnType<typeof createMessageSendDescriptor> }>>({});
  const lastSubmittedCursorRef = useRef<string | null>(null);

  // 1. Fetch initial page of messages when conversation changes
  const messagesQuery = useQuery({
    queryKey: ["canonical-messages", conversationId],
    queryFn: () => listCanonicalMessages(conversationId!, { page: 1, limit: 30 }),
    enabled: Boolean(conversationId),
    staleTime: 5000,
  });

  // Reset local state when conversation changes
  useEffect(() => {
    queueMicrotask(() => {
      setMessages([]);
      messagesMap.current = {};
      pendingMessagesRef.current = {};
      lastSubmittedCursorRef.current = null;
      setPage(1);
      setHasMore(true);
    });
  }, [conversationId]);

  // Sync initial query data into local state
  useEffect(() => {
    if (messagesQuery.data?.items) {
      const items = [...messagesQuery.data.items].reverse(); // oldest first for chronological layout
      const deduped: MessagingMessage[] = [];
      const tempMap: Record<string, boolean> = {};

      for (const msg of items) {
        if (tempMap[msg.id] || (msg.clientMessageId && tempMap[msg.clientMessageId])) continue;
        tempMap[msg.id] = true;
        if (msg.clientMessageId) tempMap[msg.clientMessageId] = true;
        deduped.push({ ...msg, deliveryState: "sent" });
      }
      queueMicrotask(() => {
        setMessages((previous) => {
          const pending = previous.filter((message) =>
            message.deliveryState === "sending" || message.deliveryState === "failed",
          );
          return pending.reduce(reconcileCanonicalMessage, deduped);
        });
        messagesMap.current = tempMap;
        setHasMore(messagesQuery.data.pagination.page < messagesQuery.data.pagination.totalPages);
      });
    }
  }, [messagesQuery.data, conversationId]);


  // 2. Load more older messages (prepended to history)
  const loadMore = useCallback(async () => {
    if (!conversationId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await listCanonicalMessages(conversationId, { page: nextPage, limit: 30 });
      if (res?.items) {
        const items = [...res.items].reverse();
        setMessages((prev) => {
          const deduped = [...prev];
          for (const msg of items) {
            if (!messagesMap.current[msg.id] && !(msg.clientMessageId && messagesMap.current[msg.clientMessageId])) {
              messagesMap.current[msg.id] = true;
              if (msg.clientMessageId) messagesMap.current[msg.clientMessageId] = true;
              deduped.unshift(msg); // prepend older messages
            }
          }
          return deduped;
        });
        setPage(nextPage);
        setHasMore(res.pagination.page < res.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to load more messages", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, page, isLoadingMore, hasMore]);

  // 3. Realtime Socket subscriptions
  useEffect(() => {
    if (!conversationId) return;

    const socket = ensureUnifiedMessagesSocketConnected();
    if (!socket) return;

    // Join room
    socket.emit("messages:join", { conversationId });

    const handleConnect = () => {
      setIsOffline(false);
      socket.emit("messages:join", { conversationId });
      // Invalidate queries to resync after reconnect
      void queryClient.invalidateQueries({ queryKey: ["canonical-messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
    };

    const handleDisconnect = () => {
      setIsOffline(true);
      setMessages((previous) => previous.map((message) =>
        message.deliveryState === "sending"
          ? { ...message, deliveryState: "failed" }
          : message,
      ));
    };

    const handleNewMessage = (data: { conversationId: string; clientMessageId?: string; item: MessagingMessage }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) => {
        const item = data.item.clientMessageId
          ? data.item
          : { ...data.item, clientMessageId: data.clientMessageId };
        const canonical = { ...item, deliveryState: "sent" as const };
        if (canonical.clientMessageId) {
          delete pendingMessagesRef.current[canonical.clientMessageId];
        }
        if (messagesMap.current[canonical.id] || (canonical.clientMessageId && messagesMap.current[canonical.clientMessageId])) {
          return reconcileCanonicalMessage(prev, canonical);
        }
        messagesMap.current[canonical.id] = true;
        if (canonical.clientMessageId) messagesMap.current[canonical.clientMessageId] = true;
        return reconcileCanonicalMessage(prev, canonical);
      });
      // Invalidate conversation query to update lastMessage in sidebar list
      void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
    };

    const handleReadUpdate = (data: { conversationId: string; lastReadMessageId: string; unreadCount: number }) => {
      if (data.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === data.lastReadMessageId) {
            return { ...msg, readAt: new Date().toISOString() };
          }
          return msg;
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
    };

    const handleTypingStart = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setIsTyping(false);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("messages:new", handleNewMessage);
    socket.on("messages:read", handleReadUpdate);
    socket.on("messages:typing:start", handleTypingStart);
    socket.on("messages:typing:stop", handleTypingStop);

    return () => {
      socket.emit("messages:leave", { conversationId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("messages:new", handleNewMessage);
      socket.off("messages:read", handleReadUpdate);
      socket.off("messages:typing:start", handleTypingStart);
      socket.off("messages:typing:stop", handleTypingStop);
    };
  }, [conversationId, queryClient]);

  // 4. Mark Read action
  const markRead = useCallback(async (lastReadMessageId: string) => {
    if (!conversationId || !lastReadMessageId) return;
    if (lastSubmittedCursorRef.current === lastReadMessageId) return;
    
    lastSubmittedCursorRef.current = lastReadMessageId;
    try {
      await markCanonicalConversationRead(conversationId, { lastReadMessageId });
      // Emit markRead to notify others
      const socket = getUnifiedMessagesSocket();
      if (socket?.connected) {
        socket.emit("messages:markRead", { conversationId, lastReadMessageId });
      }
      void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
    } catch (err) {
      console.error("Failed to mark conversation as read", err);
      if (lastSubmittedCursorRef.current === lastReadMessageId) {
        lastSubmittedCursorRef.current = null;
      }
    }
  }, [conversationId, queryClient]);

  const sendWithDescriptor = useCallback(async (descriptor: ReturnType<typeof createMessageSendDescriptor>) => {
    const { clientMessageId } = descriptor;
    const socket = getUnifiedMessagesSocket();

    const markFailed = (code?: string) => {
      setMessages((previous) => previous.map((message) =>
        message.clientMessageId === clientMessageId
          ? { ...message, deliveryState: "failed", deliveryErrorCode: code }
          : message,
      ));
    };

    const accept = (item: MessagingMessage) => {
      const canonical = {
        ...item,
        clientMessageId: item.clientMessageId ?? clientMessageId,
        deliveryState: "sent" as const,
      };
      setMessages((previous) => reconcileCanonicalMessage(previous, canonical));
      messagesMap.current[canonical.id] = true;
      messagesMap.current[clientMessageId] = true;
      delete pendingMessagesRef.current[clientMessageId];
      void queryClient.invalidateQueries({ queryKey: ["canonical-conversations"] });
    };

    const sendHttp = async () => {
      const response = await sendCanonicalMessage(
        conversationId!,
        buildMessageSendPayload(descriptor),
      );
      if (!response?.item) throw new Error("SEND_FAILED");
      accept(response.item);
    };

    if (!socket?.connected) {
      try {
        await sendHttp();
      } catch (error) {
        markFailed((error as { code?: string })?.code);
        throw error;
      }
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        void sendHttp().then(
          () => settle(resolve),
          (error) => settle(() => { markFailed((error as { code?: string })?.code); reject(error); }),
        );
      }, 8000);
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        callback();
      };

      socket.emit(
        "messages:send",
        { conversationId, ...buildMessageSendPayload(descriptor) },
        (response: { ok: boolean; code?: string; message?: string; item?: MessagingMessage }) => {
          if (response?.ok && response?.item) {
            settle(() => { accept(response.item!); resolve(); });
            return;
          }
          settle(() => {
            markFailed(response?.code);
            reject(Object.assign(new Error("SEND_FAILED"), { code: response?.code }));
          });
        },
      );
    });
  }, [conversationId, queryClient]);

  const sendMessage = useCallback(async (text: string) => {
    if (!conversationId || !text.trim()) return;
    const descriptor = createMessageSendDescriptor(conversationId, text.trim());
    const optimistic: MessagingMessage = {
      id: `optimistic:${descriptor.clientMessageId}`,
      clientMessageId: descriptor.clientMessageId,
      sender: {
        userId: currentUserId ?? "current-user",
        displayName: "",
        avatarUrl: null,
        publicRoleLabel: currentUserRole,
      },
      body: descriptor.message,
      messageType: "TEXT",
      sentAt: new Date().toISOString(),
      status: "SENT",
      deliveryState: "sending",
      deliveredAt: null,
      readAt: null,
      attachments: [],
    };
    messagesMap.current[optimistic.id] = true;
    messagesMap.current[descriptor.clientMessageId] = true;
    pendingMessagesRef.current[descriptor.clientMessageId] = { descriptor };
    setMessages((previous) => [...previous, optimistic]);
    await sendWithDescriptor(descriptor);
  }, [conversationId, currentUserId, currentUserRole, sendWithDescriptor]);

  const retryMessage = useCallback(async (clientMessageId: string) => {
    const pending = pendingMessagesRef.current[clientMessageId];
    if (!pending) return;
    setMessages((previous) => previous.map((message) =>
      message.clientMessageId === clientMessageId
        ? { ...message, deliveryState: "sending", deliveryErrorCode: undefined }
        : message,
    ));
    await sendWithDescriptor(pending.descriptor);
  }, [sendWithDescriptor]);

  // 6. Typing notifications
  const sendTypingNotification = useCallback((active: boolean) => {
    const socket = getUnifiedMessagesSocket();
    if (socket?.connected && conversationId) {
      socket.emit(active ? "messages:typing:start" : "messages:typing:stop", { conversationId });
    }
  }, [conversationId]);

  return {
    messages,
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    isOffline,
    isTyping,
    loadMore,
    hasMore,
    isLoadingMore,
    sendMessage,
    retryMessage,
    markRead,
    sendTypingNotification,
  };
}
