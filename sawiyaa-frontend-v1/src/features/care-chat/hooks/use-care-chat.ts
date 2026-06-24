import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCareChatQueryKeys,
  careChatQueryKeys,
  practitionerCareChatQueryKeys,
} from "../constants/query-keys";
import {
  createPatientCareChatRequest,
  decideAdminCareChatRequest,
  getAdminCareChatConversation,
  getAdminCareChatRequest,
  getAdminCareChatRequests,
  getPatientCareChatConversation,
  getPatientCareChatRequest,
  getPatientCareChatRequests,
  getPractitionerCareChatConversation,
  getPractitionerCareChatRequest,
  getPractitionerCareChatRequests,
  revokeAdminCareChatRequest,
  sendPatientCareChatMessage,
  sendPractitionerCareChatMessage,
} from "../api/care-chat.api";
import type {
  CareChatListParams,
  CreateCareChatRequestInput,
  DecideCareChatRequestInput,
  RevokeCareChatRequestInput,
  SendCareChatMessageInput,
} from "../types/care-chat.types";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { isAdminRole } from "@/lib/auth/roles";

export function usePatientCareChatRequests(
  params: CareChatListParams = {},
  enabled = true,
) {
  return useQuery({
    queryKey: careChatQueryKeys.requestsList(params),
    queryFn: () => getPatientCareChatRequests(params),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientCareChatRequest(requestId: string | null) {
  return useQuery({
    queryKey: careChatQueryKeys.request(requestId ?? ""),
    queryFn: () => getPatientCareChatRequest(requestId!),
    enabled: Boolean(requestId),
    staleTime: 30_000,
  });
}

export function useCreatePatientCareChatRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCareChatRequestInput) =>
      createPatientCareChatRequest(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: careChatQueryKeys.requests() });
      queryClient.setQueryData(careChatQueryKeys.request(data.item.id), data);
    },
  });
}

export function usePatientCareChatConversation(conversationId: string | null) {
  return useQuery({
    queryKey: careChatQueryKeys.conversation(conversationId ?? ""),
    queryFn: () => getPatientCareChatConversation(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 5_000,
  });
}

export function useSendPatientCareChatMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendCareChatMessageInput) =>
      sendPatientCareChatMessage(conversationId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(careChatQueryKeys.conversation(conversationId), data);
      queryClient.invalidateQueries({ queryKey: careChatQueryKeys.requests() });
    },
  });
}

export function usePractitionerCareChatRequests(params: CareChatListParams = {}) {
  return useQuery({
    queryKey: practitionerCareChatQueryKeys.requestsList(params),
    queryFn: () => getPractitionerCareChatRequests(params),
    staleTime: 30_000,
  });
}

export function usePractitionerCareChatRequest(requestId: string | null) {
  return useQuery({
    queryKey: practitionerCareChatQueryKeys.request(requestId ?? ""),
    queryFn: () => getPractitionerCareChatRequest(requestId!),
    enabled: Boolean(requestId),
    staleTime: 30_000,
  });
}

export function usePractitionerCareChatConversation(conversationId: string | null) {
  return useQuery({
    queryKey: practitionerCareChatQueryKeys.conversation(conversationId ?? ""),
    queryFn: () => getPractitionerCareChatConversation(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 5_000,
  });
}

export function useSendPractitionerCareChatMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendCareChatMessageInput) =>
      sendPractitionerCareChatMessage(conversationId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        practitionerCareChatQueryKeys.conversation(conversationId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: practitionerCareChatQueryKeys.requests(),
      });
    },
  });
}

export function useAdminCareChatRequests(
  params: CareChatListParams = {},
  options?: { enabled?: boolean },
) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminCareChatQueryKeys.requestsList(params),
    queryFn: () => getAdminCareChatRequests(params),
    enabled: isAdminRole(role) && (options?.enabled ?? true),
    staleTime: 15_000,
  });
}

export function useAdminCareChatRequest(requestId: string | null) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminCareChatQueryKeys.request(requestId ?? ""),
    queryFn: () => getAdminCareChatRequest(requestId!),
    enabled: isAdminRole(role) && Boolean(requestId),
    staleTime: 15_000,
  });
}

export function useDecideAdminCareChatRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DecideCareChatRequestInput) =>
      decideAdminCareChatRequest(requestId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminCareChatQueryKeys.requests() });
      queryClient.invalidateQueries({ queryKey: careChatQueryKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: practitionerCareChatQueryKeys.requests(),
      });
      queryClient.setQueryData(adminCareChatQueryKeys.request(requestId), {
        item: data.item,
      });
    },
  });
}

export function useRevokeAdminCareChatRequest(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RevokeCareChatRequestInput) =>
      revokeAdminCareChatRequest(requestId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminCareChatQueryKeys.requests() });
      queryClient.invalidateQueries({ queryKey: careChatQueryKeys.requests() });
      queryClient.invalidateQueries({
        queryKey: practitionerCareChatQueryKeys.requests(),
      });
      queryClient.setQueryData(adminCareChatQueryKeys.request(requestId), data);
    },
  });
}

export function useAdminCareChatConversation(conversationId: string | null) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminCareChatQueryKeys.conversation(conversationId ?? ""),
    queryFn: () => getAdminCareChatConversation(conversationId!),
    enabled: isAdminRole(role) && Boolean(conversationId),
    staleTime: 15_000,
  });
}
