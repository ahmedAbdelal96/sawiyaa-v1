import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  createCareChatRequest,
  getCareChatConversation,
  getMyCareChatRequest,
  listMyCareChatRequests,
  sendCareChatMessage,
} from "./api";
import type {
  CreateCareChatRequestPayload,
  ListCareChatRequestsQuery,
} from "./types";

const careChatKeys = {
  all: ["patient-care-chat"] as const,
  list: (query?: ListCareChatRequestsQuery) =>
    [...careChatKeys.all, "list", query ?? {}] as const,
  request: (id: string) => [...careChatKeys.all, "request", id] as const,
  conversation: (id: string) =>
    [...careChatKeys.all, "conversation", id] as const,
};

export function useMyCareChatRequests(query?: ListCareChatRequestsQuery) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: careChatKeys.list(query),
    queryFn: () => listMyCareChatRequests(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useMyCareChatRequest(requestId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

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

export function useCareChatConversation(conversationId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

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

export function useCreateCareChatRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCareChatRequestPayload) =>
      createCareChatRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: careChatKeys.all });
    },
  });
}

export function useSendCareChatMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      sendCareChatMessage(conversationId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: careChatKeys.conversation(conversationId),
      });
    },
  });
}
