import type { CareChatListParams } from "../types/care-chat.types";

export const careChatQueryKeys = {
  all: ["care-chat"] as const,
  requests: () => [...careChatQueryKeys.all, "requests"] as const,
  requestsList: (params: CareChatListParams = {}) =>
    [...careChatQueryKeys.requests(), "list", params] as const,
  request: (requestId: string) =>
    [...careChatQueryKeys.requests(), "detail", requestId] as const,
  conversations: () => [...careChatQueryKeys.all, "conversations"] as const,
  conversation: (conversationId: string) =>
    [...careChatQueryKeys.conversations(), "detail", conversationId] as const,
};

export const practitionerCareChatQueryKeys = {
  all: ["practitioner-care-chat"] as const,
  requests: () => [...practitionerCareChatQueryKeys.all, "requests"] as const,
  requestsList: (params: CareChatListParams = {}) =>
    [...practitionerCareChatQueryKeys.requests(), "list", params] as const,
  request: (requestId: string) =>
    [...practitionerCareChatQueryKeys.requests(), "detail", requestId] as const,
  conversations: () => [...practitionerCareChatQueryKeys.all, "conversations"] as const,
  conversation: (conversationId: string) =>
    [...practitionerCareChatQueryKeys.conversations(), "detail", conversationId] as const,
};

export const adminCareChatQueryKeys = {
  all: ["admin-care-chat"] as const,
  requests: () => [...adminCareChatQueryKeys.all, "requests"] as const,
  requestsList: (params: CareChatListParams = {}) =>
    [...adminCareChatQueryKeys.requests(), "list", params] as const,
  request: (requestId: string) =>
    [...adminCareChatQueryKeys.requests(), "detail", requestId] as const,
  conversations: () => [...adminCareChatQueryKeys.all, "conversations"] as const,
  conversation: (conversationId: string) =>
    [...adminCareChatQueryKeys.conversations(), "detail", conversationId] as const,
};
