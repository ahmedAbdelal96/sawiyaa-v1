import { useMutation, useQuery } from "@tanstack/react-query";

import { careChatService } from "@/modules/care-chat/application/care-chat.service";
import type {
  CareChatConversationItem,
  CreateCareChatRequestInput,
} from "@/modules/care-chat/domain/care-chat.types";
import { queryClient } from "@/networking/query/query-client";

export function useCareChatRequests() {
  return useQuery({
    queryKey: ["care-chat", "requests"],
    queryFn: () => careChatService.listRequests(),
  });
}

export function useCareChatRequest(requestId: string) {
  return useQuery({
    enabled: Boolean(requestId),
    queryKey: ["care-chat", "request", requestId],
    queryFn: () => careChatService.getRequest(requestId),
  });
}

export function useCreateCareChatRequest() {
  return useMutation({
    mutationFn: (payload: CreateCareChatRequestInput) => careChatService.createRequest(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["care-chat", "requests"] });
      await queryClient.invalidateQueries({ queryKey: ["journey", "summary"] });
    },
  });
}

export function useCareChatConversation(conversationId: string) {
  return useQuery({
    enabled: Boolean(conversationId),
    queryKey: ["care-chat", "conversation", conversationId],
    queryFn: () => careChatService.getConversation(conversationId),
  });
}

export function useSendCareChatMessage(conversationId: string) {
  return useMutation({
    mutationFn: (message: string) => careChatService.sendMessage(conversationId, message),
    onMutate: async (message) => {
      await queryClient.cancelQueries({
        queryKey: ["care-chat", "conversation", conversationId],
      });
      const previousConversation = queryClient.getQueryData<CareChatConversationItem>([
        "care-chat",
        "conversation",
        conversationId,
      ]);
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        senderRole: "PATIENT" as const,
        message,
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      queryClient.setQueryData(
        ["care-chat", "conversation", conversationId],
        (current: CareChatConversationItem | undefined) =>
          current
            ? {
                ...current,
                messages: [...current.messages, optimisticMessage],
              }
            : current,
      );

      return { previousConversation };
    },
    onError: (_error, _message, context) => {
      if (context?.previousConversation) {
        queryClient.setQueryData(
          ["care-chat", "conversation", conversationId],
          context.previousConversation,
        );
      }
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(["care-chat", "conversation", conversationId], conversation);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["care-chat", "conversation", conversationId],
      });
    },
  });
}
