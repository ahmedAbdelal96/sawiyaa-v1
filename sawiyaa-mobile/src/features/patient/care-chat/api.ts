import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CareChatConversationDetailsDto,
  CareChatMessageDto,
  CareChatRequestItemDto,
  CareChatRequestListResponseData,
  CreateCareChatRequestPayload,
  ListCareChatRequestsQuery,
} from "./types";

export async function listMyCareChatRequests(
  query?: ListCareChatRequestsQuery,
) {
  const response = await apiClient.get("/patients/me/care-chat/requests", {
    params: query,
  });
  return extractApiData<CareChatRequestListResponseData>(response);
}

export async function getMyCareChatRequest(requestId: string) {
  const response = await apiClient.get(
    `/patients/me/care-chat/requests/${requestId}`,
  );
  return extractApiData<{ item: CareChatRequestItemDto }>(response);
}

export async function createCareChatRequest(
  payload: CreateCareChatRequestPayload,
) {
  const response = await apiClient.post(
    "/patients/me/care-chat/requests",
    payload,
  );
  return extractApiData<{ item: CareChatRequestItemDto }>(response);
}

export async function getCareChatConversation(conversationId: string) {
  const response = await apiClient.get(
    `/patients/me/care-chat/conversations/${conversationId}`,
  );
  return extractApiData<{ item: CareChatConversationDetailsDto }>(response);
}

export async function sendCareChatMessage(
  conversationId: string,
  message: string,
) {
  const response = await apiClient.post(
    `/patients/me/care-chat/conversations/${conversationId}/messages`,
    { message },
  );
  return extractApiData<{ item: CareChatMessageDto }>(response);
}
