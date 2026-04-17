import {
  createCareChatRequestRequest,
  getCareChatConversationRequest,
  getCareChatRequestRequest,
  listCareChatRequestsRequest,
  sendCareChatMessageRequest,
} from "@/modules/care-chat/api/care-chat.api";
import type { CreateCareChatRequestInput } from "@/modules/care-chat/domain/care-chat.types";

export const careChatService = {
  async createRequest(payload: CreateCareChatRequestInput) {
    const response = await createCareChatRequestRequest(payload);
    return response.item;
  },

  async listRequests() {
    return listCareChatRequestsRequest({
      page: 1,
      limit: 20,
    });
  },

  async getRequest(requestId: string) {
    const response = await getCareChatRequestRequest(requestId);
    return response.item;
  },

  async getConversation(conversationId: string) {
    const response = await getCareChatConversationRequest(conversationId);
    return response.item;
  },

  async sendMessage(conversationId: string, message: string) {
    const response = await sendCareChatMessageRequest(conversationId, message);
    return response.item;
  },
};
