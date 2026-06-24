import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  GeneralChatMessagesListResponse,
  GeneralChatOpenSessionResponse,
  ListGeneralChatMessagesParams,
  SendGeneralChatMessageInput,
  SendGeneralChatMessageResponse,
  UploadGeneralChatAttachmentResponse,
} from "../types/general-chat.types";

export async function openSessionGeneralChat(
  sessionId: string,
): Promise<GeneralChatOpenSessionResponse> {
  const response = await httpClient.post<ApiPayload<GeneralChatOpenSessionResponse>>(
    `/chat/sessions/${sessionId}/open`,
  );
  return extractData(response.data);
}

export async function getGeneralChatMessages(
  conversationId: string,
  params: ListGeneralChatMessagesParams = {},
): Promise<GeneralChatMessagesListResponse> {
  const response = await httpClient.get<ApiPayload<GeneralChatMessagesListResponse>>(
    `/chat/conversations/${conversationId}/messages`,
    { params },
  );
  return extractData(response.data);
}

export async function sendGeneralChatMessage(
  conversationId: string,
  payload: SendGeneralChatMessageInput,
): Promise<SendGeneralChatMessageResponse> {
  const response = await httpClient.post<ApiPayload<SendGeneralChatMessageResponse>>(
    `/chat/conversations/${conversationId}/messages`,
    payload,
  );
  return extractData(response.data);
}

export async function closeGeneralChatConversation(
  conversationId: string,
): Promise<{ closed: true }> {
  const response = await httpClient.post<ApiPayload<{ closed: true }>>(
    `/chat/conversations/${conversationId}/close`,
  );
  return extractData(response.data);
}

export async function uploadGeneralChatAttachment(
  conversationId: string,
  file: File,
): Promise<UploadGeneralChatAttachmentResponse> {
  const form = new FormData();
  form.append("file", file);

  const response = await httpClient.post<ApiPayload<UploadGeneralChatAttachmentResponse>>(
    `/chat/conversations/${conversationId}/attachments`,
    form,
  );
  return extractData(response.data);
}

