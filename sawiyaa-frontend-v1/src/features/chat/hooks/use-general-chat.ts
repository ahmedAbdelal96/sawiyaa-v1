import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeGeneralChatConversation,
  getGeneralChatMessages,
  openSessionGeneralChat,
  sendGeneralChatMessage,
  uploadGeneralChatAttachment,
} from "../api/general-chat.api";
import type { ListGeneralChatMessagesParams } from "../types/general-chat.types";

export const generalChatQueryKeys = {
  all: ["general-chat"] as const,
  sessionConversation: (sessionId: string) =>
    [...generalChatQueryKeys.all, "session-open", sessionId] as const,
  messages: (conversationId: string, params?: ListGeneralChatMessagesParams) =>
    [...generalChatQueryKeys.all, "messages", conversationId, params ?? {}] as const,
};

export function useOpenSessionGeneralChat(sessionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => openSessionGeneralChat(sessionId!),
    onSuccess: (data) => {
      if (sessionId) {
        queryClient.setQueryData(generalChatQueryKeys.sessionConversation(sessionId), data);
      }
    },
  });
}

export function useGeneralChatMessages(
  conversationId: string | null,
  params?: ListGeneralChatMessagesParams,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: generalChatQueryKeys.messages(conversationId ?? "", params),
    queryFn: () => getGeneralChatMessages(conversationId!, params),
    enabled: Boolean(conversationId),
    staleTime: 5_000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

export function useSendGeneralChatMessage(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof sendGeneralChatMessage>[1]) =>
      sendGeneralChatMessage(conversationId!, payload),
    onSuccess: () => {
      if (!conversationId) return;
      queryClient.invalidateQueries({
        queryKey: generalChatQueryKeys.all,
      });
    },
  });
}

export function useUploadGeneralChatAttachment(conversationId: string | null) {
  return useMutation({
    mutationFn: (file: File) => uploadGeneralChatAttachment(conversationId!, file),
  });
}

export function useCloseGeneralChatConversation(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => closeGeneralChatConversation(conversationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generalChatQueryKeys.all });
    },
  });
}

