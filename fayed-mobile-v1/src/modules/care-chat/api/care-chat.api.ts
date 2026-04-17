import type {
  CareChatConversationDataResponse,
  CareChatRequestItemDataResponse,
  CareChatRequestListDataResponse,
  CreateCareChatRequestInput,
} from "@/modules/care-chat/domain/care-chat.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

type ListCareChatRequestsQuery = {
  page?: number;
  limit?: number;
  status?: string;
};

export async function createCareChatRequestRequest(payload: CreateCareChatRequestInput) {
  const response = await httpClient.post<CareChatRequestItemDataResponse>(
    "/patients/me/care-chat/requests",
    payload,
  );
  return unwrapApiData(response.data);
}

export async function listCareChatRequestsRequest(query: ListCareChatRequestsQuery = {}) {
  const response = await httpClient.get<CareChatRequestListDataResponse>(
    "/patients/me/care-chat/requests",
    { params: query },
  );
  return unwrapApiData(response.data);
}

export async function getCareChatRequestRequest(requestId: string) {
  const response = await httpClient.get<CareChatRequestItemDataResponse>(
    `/patients/me/care-chat/requests/${requestId}`,
  );
  return unwrapApiData(response.data);
}

export async function getCareChatConversationRequest(conversationId: string) {
  const response = await httpClient.get<CareChatConversationDataResponse>(
    `/patients/me/care-chat/conversations/${conversationId}`,
  );
  return unwrapApiData(response.data);
}

export async function sendCareChatMessageRequest(conversationId: string, message: string) {
  const response = await httpClient.post<CareChatConversationDataResponse>(
    `/patients/me/care-chat/conversations/${conversationId}/messages`,
    { message },
  );
  return unwrapApiData(response.data);
}
