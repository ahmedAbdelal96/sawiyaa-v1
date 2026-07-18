import { useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../auth/query-auth";
import { ensureUnifiedMessagesSocketConnected, getUnifiedMessagesSocket } from "./realtime-socket";
import type { CanonicalMessage } from "./types";
import {
  buildMessageSendPayload,
  createMessageSendDescriptor,
  reconcileCanonicalMessage,
} from "./message-identity";
import {
  createOrGetGeneralChatConversation,
  getMyGeneralChatConversationDetail,
  listMyGeneralChatConversations,
  listMyGeneralChatMessages,
  markGeneralChatConversationRead,
  openSessionGeneralChat,
  sendGeneralChatMessage,
  listCanonicalConversations,
  getCanonicalConversation,
  listCanonicalMessages,
  sendCanonicalMessage,
  markCanonicalConversationRead,
  getCanonicalUnreadSummary,
} from "./api";
import { generalChatQueryKeys } from "./query-keys";
import type {
  CreateGeneralChatConversationInput,
  ListGeneralChatConversationsParams,
  ListGeneralChatMessagesParams,
  MessagesRole,
  SendGeneralChatMessageInput,
} from "./types";

const DEFAULT_CONVERSATION_PAGE_SIZE = 20;
const DEFAULT_MESSAGE_PAGE_SIZE = 25;

function getNextPageParam(page: { pagination?: { page: number; totalPages: number } }) {
  const currentPage = page.pagination?.page ?? 1;
  const totalPages = page.pagination?.totalPages ?? 1;

  if (currentPage >= totalPages) {
    return undefined;
  }

  return currentPage + 1;
}

export function useGeneralChatUnreadSummary(
  role: MessagesRole,
  enabled = true,
  options?: { refetchInterval?: number | false },
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);

  return useQuery({
    queryKey: generalChatQueryKeys.canonicalUnreadSummary(),
    queryFn: async () => {
      const res = await getCanonicalUnreadSummary();
      return {
        item: {
          ...res.item,
          totalUnreadMessages: res.item.unreadCount,
        },
      };
    },
    enabled: enabled && authEnabled,
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? false,
    refetchOnWindowFocus: false,
  });
}

export function useInfiniteGeneralChatConversations(
  role: MessagesRole,
  params?: Omit<ListGeneralChatConversationsParams, "page"> & { pageSize?: number },
  enabled = true,
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);
  const limit = params?.pageSize ?? params?.limit ?? DEFAULT_CONVERSATION_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: generalChatQueryKeys.conversations(role, { limit }),
    queryFn: ({ pageParam = 1 }) =>
      listMyGeneralChatConversations({
        page: pageParam,
        limit,
      }),
    enabled: enabled && authEnabled,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useGeneralChatConversation(
  role: MessagesRole,
  conversationId: string | null,
  enabled = true,
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);

  return useQuery({
    queryKey: generalChatQueryKeys.conversation(role, conversationId ?? ""),
    queryFn: () => getMyGeneralChatConversationDetail(conversationId!),
    enabled: enabled && authEnabled && Boolean(conversationId),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });
}

export function useInfiniteGeneralChatMessages(
  role: MessagesRole,
  conversationId: string | null,
  params?: Omit<ListGeneralChatMessagesParams, "page"> & { pageSize?: number },
  enabled = true,
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);
  const limit = params?.pageSize ?? params?.limit ?? DEFAULT_MESSAGE_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: generalChatQueryKeys.messages(role, conversationId ?? "", { limit }),
    queryFn: ({ pageParam = 1 }) =>
      listMyGeneralChatMessages(conversationId!, {
        page: pageParam,
        limit,
      }),
    enabled: enabled && authEnabled && Boolean(conversationId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useSendGeneralChatMessageMutation(
  role: MessagesRole,
  conversationId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendGeneralChatMessageInput) =>
      sendGeneralChatMessage(conversationId!, payload),
    onSuccess: async () => {
      if (!conversationId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.role(role) }),
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.conversation(role, conversationId) }),
      ]);
    },
  });
}

export function useMarkGeneralChatConversationReadMutation(
  role: MessagesRole,
  conversationId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markGeneralChatConversationRead(conversationId!),
    onSuccess: async () => {
      if (!conversationId) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.role(role) }),
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.conversation(role, conversationId) }),
      ]);
    },
  });
}

export function useOpenSessionGeneralChatMutation(role: MessagesRole) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => openSessionGeneralChat(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.role(role) });
    },
  });
}

export function useCreateGeneralChatConversationMutation(role: MessagesRole) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGeneralChatConversationInput) =>
      createOrGetGeneralChatConversation(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.role(role) });
    },
  });
}

export function useGeneralChatResumeRefresh(
  role: MessagesRole,
  conversationId?: string | null,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const refreshChatQueries = async () => {
      const tasks = [
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.role(role) }),
      ];

      if (conversationId) {
        tasks.push(
          queryClient.invalidateQueries({
            queryKey: generalChatQueryKeys.conversation(role, conversationId),
          }),
        );
      }

      await Promise.all(tasks);
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackgrounded = appStateRef.current !== "active";
      appStateRef.current = nextState;

      if (nextState === "active" && wasBackgrounded) {
        void refreshChatQueries();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [conversationId, enabled, queryClient, role]);
}

export function useCanonicalConversations(
  role: MessagesRole,
  params?: { page?: number; limit?: number },
  enabled = true,
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);
  return useQuery({
    queryKey: generalChatQueryKeys.canonicalConversations(),
    queryFn: () => listCanonicalConversations(params),
    enabled: enabled && authEnabled,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useCanonicalConversation(
  role: MessagesRole,
  conversationId: string | null,
  enabled = true,
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);
  return useQuery({
    queryKey: generalChatQueryKeys.canonicalConversation(conversationId ?? ""),
    queryFn: () => getCanonicalConversation(conversationId!),
    enabled: enabled && authEnabled && Boolean(conversationId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });
}

export function useInfiniteCanonicalMessages(
  role: MessagesRole,
  conversationId: string | null,
  params?: { pageSize?: number },
  enabled = true,
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);
  const limit = params?.pageSize ?? DEFAULT_MESSAGE_PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: generalChatQueryKeys.canonicalMessages(conversationId ?? ""),
    queryFn: ({ pageParam = 1 }) =>
      listCanonicalMessages(conversationId!, {
        page: pageParam,
        limit,
      }),
    enabled: enabled && authEnabled && Boolean(conversationId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => getNextPageParam(lastPage),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useSendCanonicalMessageMutation(
  role: MessagesRole,
  conversationId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { message: string; clientMessageId: string }) =>
      sendCanonicalMessage(conversationId!, payload),
    onSuccess: async () => {
      if (!conversationId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() }),
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalMessages(conversationId) }),
      ]);
    },
  });
}

export function useMarkCanonicalConversationReadMutation(
  role: MessagesRole,
  conversationId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { lastReadMessageId: string }) =>
      markCanonicalConversationRead(conversationId!, payload),
    onSuccess: async () => {
      if (!conversationId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() }),
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversation(conversationId) }),
        queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalUnreadSummary() }),
      ]);
    },
  });
}

export function useCanonicalUnreadSummary(
  role: MessagesRole,
  enabled = true,
  options?: { refetchInterval?: number | false },
) {
  const authEnabled = useAuthenticatedQueryEnabled(role);
  return useQuery({
    queryKey: generalChatQueryKeys.canonicalUnreadSummary(),
    queryFn: getCanonicalUnreadSummary,
    enabled: enabled && authEnabled,
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval ?? false,
    refetchOnWindowFocus: false,
  });
}

export function useUnifiedMessages({ conversationId, currentUserId }: UseUnifiedMessagesProps) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<CanonicalMessage[]>([]);
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
    queryKey: generalChatQueryKeys.canonicalMessages(conversationId ?? ""),
    queryFn: () => listCanonicalMessages(conversationId!, { page: 1, limit: 30 }),
    enabled: Boolean(conversationId),
    staleTime: 5000,
  });

  // Reset local state when conversation changes
  useEffect(() => {
    setMessages([]);
    messagesMap.current = {};
    pendingMessagesRef.current = {};
    lastSubmittedCursorRef.current = null;
    setPage(1);
    setHasMore(true);
  }, [conversationId]);

  // Sync initial query data into local state
  useEffect(() => {
    if (messagesQuery.data?.items) {
      const items = [...messagesQuery.data.items].reverse(); // oldest first for chronological layout
      const deduped: CanonicalMessage[] = [];
      const tempMap: Record<string, boolean> = {};
      for (const msg of items) {
        if (tempMap[msg.id] || (msg.clientMessageId && tempMap[msg.clientMessageId])) continue;
        tempMap[msg.id] = true;
        if (msg.clientMessageId) tempMap[msg.clientMessageId] = true;
        deduped.push({ ...msg, deliveryState: "sent" });
      }
      setMessages((previous) => {
        const pending = previous.filter((message) =>
          message.deliveryState === "sending" || message.deliveryState === "failed",
        );
        return pending.reduce(reconcileCanonicalMessage, deduped);
      });
      messagesMap.current = tempMap;
      setHasMore(messagesQuery.data.pagination.page < messagesQuery.data.pagination.totalPages);
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
      void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalMessages(conversationId) });
      void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() });
    };

    const handleDisconnect = () => {
      setIsOffline(true);
      setMessages((prev) => prev.map((message) =>
        message.deliveryState === "sending"
          ? { ...message, deliveryState: "failed" }
          : message,
      ));
    };

    const handleNewMessage = (data: { conversationId: string; clientMessageId?: string; item: CanonicalMessage }) => {
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
      // Invalidate conversations list query
      void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() });
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
      void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() });
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

  // 6. Typing notifications
  const sendTypingNotification = useCallback((active: boolean) => {
    const socket = getUnifiedMessagesSocket();
    if (socket?.connected && conversationId) {
      socket.emit(active ? "messages:typing:start" : "messages:typing:stop", { conversationId });
    }
  }, [conversationId]);

  // 3.5 AppState change handling
  useEffect(() => {
    if (!conversationId) return;

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active") {
        const socket = ensureUnifiedMessagesSocketConnected();
        if (socket?.connected) {
          socket.emit("messages:join", { conversationId });
        }
        void messagesQuery.refetch();
        void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() });
        void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalUnreadSummary() });
      } else {
        sendTypingNotification(false);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [conversationId, messagesQuery, queryClient, sendTypingNotification]);

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
      void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() });
    } catch (err) {
      console.error("Failed to mark conversation as read", err);
      if (lastSubmittedCursorRef.current === lastReadMessageId) {
        lastSubmittedCursorRef.current = null;
      }
    }
  }, [conversationId, queryClient]);

  // 5. Send message action (uses Socket messages:send event)
  const sendWithDescriptor = useCallback(async (descriptor: ReturnType<typeof createMessageSendDescriptor>) => {
    const { clientMessageId } = descriptor;
    const socket = getUnifiedMessagesSocket();

    const markFailed = (code?: string) => {
      setMessages((prev) => prev.map((message) =>
        message.clientMessageId === clientMessageId
          ? { ...message, deliveryState: "failed", deliveryErrorCode: code }
          : message,
      ));
    };

    const accept = (item: CanonicalMessage) => {
      const canonical = { ...item, clientMessageId: item.clientMessageId ?? clientMessageId, deliveryState: "sent" as const };
      setMessages((prev) => reconcileCanonicalMessage(prev, canonical));
      messagesMap.current[canonical.id] = true;
      messagesMap.current[clientMessageId] = true;
      delete pendingMessagesRef.current[clientMessageId];
      void queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.canonicalConversations() });
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
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        callback();
      };
      const timeout = setTimeout(() => {
        void sendHttp().then(
          () => settle(resolve),
          (error) => settle(() => { markFailed(error?.code); reject(error); }),
        );
      }, 8000);

      socket.emit(
        "messages:send",
        { conversationId, ...buildMessageSendPayload(descriptor) },
        (response: { ok: boolean; code?: string; message?: string; item?: CanonicalMessage }) => {
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
    const optimistic: CanonicalMessage = {
      id: `optimistic:${descriptor.clientMessageId}`,
      conversationId,
      clientMessageId: descriptor.clientMessageId,
      sender: {
        userId: currentUserId ?? "current-user",
        displayName: "",
        avatarUrl: null,
        publicRoleLabel: "Patient",
      },
      body: descriptor.text,
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
    setMessages((prev) => [...prev, optimistic]);
    await sendWithDescriptor(descriptor);
  }, [conversationId, currentUserId, sendWithDescriptor]);

  const retryMessage = useCallback(async (clientMessageId: string) => {
    const pending = pendingMessagesRef.current[clientMessageId];
    if (!pending) return;
    setMessages((prev) => prev.map((message) =>
      message.clientMessageId === clientMessageId
        ? { ...message, deliveryState: "sending", deliveryErrorCode: undefined }
        : message,
    ));
    await sendWithDescriptor(pending.descriptor);
  }, [sendWithDescriptor]);

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

interface UseUnifiedMessagesProps {
  conversationId: string | null;
  currentUserId?: string | null;
}


