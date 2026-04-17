import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AdminCareChatRequestItem,
  CareChatConversationResponse,
  CareChatDecisionResponse,
  CareChatListParams,
  CareChatListResponse,
  CareChatRequestItem,
  CareChatRequestResponse,
  CreateCareChatRequestInput,
  DecideCareChatRequestInput,
  RevokeCareChatRequestInput,
  SendCareChatMessageInput,
} from "../types/care-chat.types";

export async function createPatientCareChatRequest(payload: CreateCareChatRequestInput) {
  const response = await httpClient.post<ApiPayload<CareChatRequestResponse>>(
    "/patients/me/care-chat/requests",
    payload,
  );
  return extractData(response.data);
}

export async function getPatientCareChatRequests(
  params: CareChatListParams = {},
): Promise<CareChatListResponse<CareChatRequestItem>> {
  const response = await httpClient.get<ApiPayload<CareChatListResponse<CareChatRequestItem>>>(
    "/patients/me/care-chat/requests",
    { params },
  );
  return extractData(response.data);
}

export async function getPatientCareChatRequest(
  requestId: string,
): Promise<CareChatRequestResponse<CareChatRequestItem>> {
  const response = await httpClient.get<ApiPayload<CareChatRequestResponse<CareChatRequestItem>>>(
    `/patients/me/care-chat/requests/${requestId}`,
  );
  return extractData(response.data);
}

export async function getPatientCareChatConversation(
  conversationId: string,
): Promise<CareChatConversationResponse> {
  const response = await httpClient.get<ApiPayload<CareChatConversationResponse>>(
    `/patients/me/care-chat/conversations/${conversationId}`,
  );
  return extractData(response.data);
}

export async function sendPatientCareChatMessage(
  conversationId: string,
  payload: SendCareChatMessageInput,
): Promise<CareChatConversationResponse> {
  const response = await httpClient.post<ApiPayload<CareChatConversationResponse>>(
    `/patients/me/care-chat/conversations/${conversationId}/messages`,
    payload,
  );
  return extractData(response.data);
}

export async function getPractitionerCareChatRequests(
  params: CareChatListParams = {},
): Promise<CareChatListResponse<CareChatRequestItem>> {
  const response = await httpClient.get<ApiPayload<CareChatListResponse<CareChatRequestItem>>>(
    "/practitioners/me/care-chat/requests",
    { params },
  );
  return extractData(response.data);
}

export async function getPractitionerCareChatRequest(
  requestId: string,
): Promise<CareChatRequestResponse<CareChatRequestItem>> {
  const response = await httpClient.get<ApiPayload<CareChatRequestResponse<CareChatRequestItem>>>(
    `/practitioners/me/care-chat/requests/${requestId}`,
  );
  return extractData(response.data);
}

export async function getPractitionerCareChatConversation(
  conversationId: string,
): Promise<CareChatConversationResponse> {
  const response = await httpClient.get<ApiPayload<CareChatConversationResponse>>(
    `/practitioners/me/care-chat/conversations/${conversationId}`,
  );
  return extractData(response.data);
}

export async function sendPractitionerCareChatMessage(
  conversationId: string,
  payload: SendCareChatMessageInput,
): Promise<CareChatConversationResponse> {
  const response = await httpClient.post<ApiPayload<CareChatConversationResponse>>(
    `/practitioners/me/care-chat/conversations/${conversationId}/messages`,
    payload,
  );
  return extractData(response.data);
}

export async function getAdminCareChatRequests(
  params: CareChatListParams = {},
): Promise<CareChatListResponse<AdminCareChatRequestItem>> {
  const response = await httpClient.get<ApiPayload<CareChatListResponse<AdminCareChatRequestItem>>>(
    "/admin/care-chat/requests",
    { params },
  );
  return extractData(response.data);
}

export async function getAdminCareChatRequest(
  requestId: string,
): Promise<CareChatRequestResponse<AdminCareChatRequestItem>> {
  const response = await httpClient.get<ApiPayload<CareChatRequestResponse<AdminCareChatRequestItem>>>(
    `/admin/care-chat/requests/${requestId}`,
  );
  return extractData(response.data);
}

export async function decideAdminCareChatRequest(
  requestId: string,
  payload: DecideCareChatRequestInput,
): Promise<CareChatDecisionResponse> {
  const response = await httpClient.patch<ApiPayload<CareChatDecisionResponse>>(
    `/admin/care-chat/requests/${requestId}/decision`,
    payload,
  );
  return extractData(response.data);
}

export async function revokeAdminCareChatRequest(
  requestId: string,
  payload: RevokeCareChatRequestInput,
): Promise<CareChatRequestResponse<AdminCareChatRequestItem>> {
  const response = await httpClient.patch<
    ApiPayload<CareChatRequestResponse<AdminCareChatRequestItem>>
  >(`/admin/care-chat/requests/${requestId}/revoke`, payload);
  return extractData(response.data);
}

export async function getAdminCareChatConversation(
  conversationId: string,
): Promise<CareChatConversationResponse> {
  const response = await httpClient.get<ApiPayload<CareChatConversationResponse>>(
    `/admin/care-chat/conversations/${conversationId}`,
  );
  return extractData(response.data);
}
