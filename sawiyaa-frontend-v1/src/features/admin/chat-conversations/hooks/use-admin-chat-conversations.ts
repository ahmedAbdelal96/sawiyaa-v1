import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import {
  disableAdminChatConversation,
  enableAdminChatConversation,
  getAdminChatConversation,
  listAdminChatConversations,
  listAdminChatConversationMessages,
} from "../api/admin-chat-conversations.api";
import { adminChatConversationsQueryKeys } from "../constants/query-keys";
import type {
  AdminChatConversationDisableInput,
  AdminChatConversationEnableInput,
  AdminChatConversationListQuery,
} from "../types/admin-chat-conversations.types";

export function useAdminChatConversationsList(
  query: AdminChatConversationListQuery,
  options?: { enabled?: boolean },
) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminChatConversationsQueryKeys.list(query),
    queryFn: () => listAdminChatConversations(query),
    enabled: isAdminRole(role) && (options?.enabled ?? true),
    staleTime: 15_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminChatConversation(conversationId?: string) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminChatConversationsQueryKeys.detail(conversationId ?? ""),
    queryFn: () => getAdminChatConversation(conversationId as string),
    enabled: isAdminRole(role) && Boolean(conversationId),
    staleTime: 15_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminChatConversationMessages(
  conversationId?: string,
  params: { page: number; limit: number } = { page: 1, limit: 50 },
) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminChatConversationsQueryKeys.messages(
      conversationId ?? "",
      params.page,
      params.limit,
    ),
    queryFn: () => listAdminChatConversationMessages(conversationId as string, params),
    enabled: isAdminRole(role) && Boolean(conversationId),
    staleTime: 10_000,
    gcTime: 10 * 60_000,
  });
}

export function useDisableAdminChatConversation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AdminChatConversationDisableInput) =>
      disableAdminChatConversation(conversationId, body),
    onSuccess: (item) => {
      queryClient.setQueryData(adminChatConversationsQueryKeys.detail(conversationId), {
        item,
      });
      queryClient.invalidateQueries({ queryKey: adminChatConversationsQueryKeys.all });
    },
  });
}

export function useEnableAdminChatConversation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: AdminChatConversationEnableInput) =>
      enableAdminChatConversation(conversationId, body),
    onSuccess: (item) => {
      queryClient.setQueryData(adminChatConversationsQueryKeys.detail(conversationId), {
        item,
      });
      queryClient.invalidateQueries({ queryKey: adminChatConversationsQueryKeys.all });
    },
  });
}
