import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../auth/query-auth";
import {
  createOrGetGeneralChatConversation,
  getMyGeneralChatConversationDetail,
  getMyGeneralChatUnreadSummary,
  listMyGeneralChatConversations,
  listMyGeneralChatMessages,
  markGeneralChatConversationRead,
  openSessionGeneralChat,
  sendGeneralChatMessage,
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
    queryKey: generalChatQueryKeys.unreadSummary(role),
    queryFn: getMyGeneralChatUnreadSummary,
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
