import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import {
  closeGeneralChatConversation,
  getSessionGeneralChatConversation,
  getGeneralChatMessages,
  openSessionGeneralChat,
  sendGeneralChatMessage,
  uploadGeneralChatAttachment,
} from "../api/general-chat.api";
import type { ListGeneralChatMessagesParams } from "../types/general-chat.types";

export const generalChatQueryKeys = {
  all: ["general-chat"] as const,
  sessionConversation: (sessionId: string, locale: string) =>
    [
      ...generalChatQueryKeys.all,
      "session-conversation",
      sessionId,
      locale,
    ] as const,
  messages: (conversationId: string, params?: ListGeneralChatMessagesParams) =>
    [
      ...generalChatQueryKeys.all,
      "messages",
      conversationId,
      params ?? {},
    ] as const,
};

export function useOpenSessionGeneralChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const locale = useLocale();

  return useMutation({
    mutationFn: async () => openSessionGeneralChat(sessionId!),
    onSuccess: (data) => {
      if (sessionId) {
        queryClient.setQueryData(
          generalChatQueryKeys.sessionConversation(sessionId, locale),
          data,
        );
      }
    },
  });
}

export function useSessionGeneralChatConversation(sessionId: string | null) {
  const locale = useLocale();

  return useQuery({
    queryKey: generalChatQueryKeys.sessionConversation(sessionId ?? "", locale),
    queryFn: () => getSessionGeneralChatConversation(sessionId!),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 5_000,
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
    mutationFn: (file: File) =>
      uploadGeneralChatAttachment(conversationId!, file),
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
