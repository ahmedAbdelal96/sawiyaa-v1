import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getCareChatConversation,
  getMyCareChatRequest,
  listMyCareChatRequests,
  sendCareChatMessage,
} from "./api";
import type { ListCareChatRequestsQuery } from "./types";

const careChatKeys = {
  all: ["practitioner-care-chat"] as const,
  list: (query?: ListCareChatRequestsQuery) =>
    [...careChatKeys.all, "list", query ?? {}] as const,
  request: (id: string) => [...careChatKeys.all, "request", id] as const,
  conversation: (id: string) =>
    [...careChatKeys.all, "conversation", id] as const,
};

export function usePractitionerCareChatRequests(query?: ListCareChatRequestsQuery) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: careChatKeys.list(query),
    queryFn: () => listMyCareChatRequests(query),
    enabled,
    staleTime: 30_000,
  });
}

export function usePractitionerCareChatRequest(requestId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: careChatKeys.request(requestId ?? ""),
    queryFn: async () => {
      const res = await getMyCareChatRequest(requestId!);
      return res.item;
    },
    enabled: enabled && Boolean(requestId),
    staleTime: 20_000,
  });
}

export function usePractitionerCareChatConversation(conversationId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: careChatKeys.conversation(conversationId ?? ""),
    queryFn: async () => {
      const res = await getCareChatConversation(conversationId!);
      return res.item;
    },
    enabled: enabled && Boolean(conversationId),
    staleTime: 15_000,
  });
}

export function useSendPractitionerCareChatMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => sendCareChatMessage(conversationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: careChatKeys.conversation(conversationId),
      });
    },
  });
}

