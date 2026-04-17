import {
  addSupportTicketMessageRequest,
  createSupportTicketRequest,
  getSupportTicketRequest,
  listSupportTicketsRequest,
} from "@/modules/support/api/support.api";
import type { CreateSupportTicketInput } from "@/modules/support/domain/support.types";

export const supportService = {
  async createTicket(payload: CreateSupportTicketInput) {
    const response = await createSupportTicketRequest(payload);
    return response.item;
  },

  async listTickets() {
    return listSupportTicketsRequest({
      page: 1,
      limit: 20,
    });
  },

  async getTicket(ticketId: string) {
    const response = await getSupportTicketRequest(ticketId);
    return response.item;
  },

  async addMessage(ticketId: string, message: string) {
    const response = await addSupportTicketMessageRequest(ticketId, message);
    return response.item;
  },
};
