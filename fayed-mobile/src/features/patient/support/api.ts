import { apiClient, extractApiData } from "../../../lib/api";
import type {
  CreateSupportTicketPayload,
  ListSupportTicketsQuery,
  SupportTicketDetailsDto,
  SupportTicketListResponseData,
} from "./types";

export async function listMySupportTickets(query?: ListSupportTicketsQuery) {
  const response = await apiClient.get("/patients/me/support/tickets", {
    params: query,
  });
  return extractApiData<SupportTicketListResponseData>(response);
}

export async function getMySupportTicket(ticketId: string) {
  const response = await apiClient.get(
    `/patients/me/support/tickets/${ticketId}`,
  );
  return extractApiData<{ item: SupportTicketDetailsDto }>(response);
}

export async function createSupportTicket(payload: CreateSupportTicketPayload) {
  const response = await apiClient.post(
    "/patients/me/support/tickets",
    payload,
  );
  return extractApiData<{ item: SupportTicketDetailsDto }>(response);
}

export async function addSupportMessage(ticketId: string, message: string) {
  const response = await apiClient.post(
    `/patients/me/support/tickets/${ticketId}/messages`,
    { message },
  );
  return extractApiData<{ item: SupportTicketDetailsDto }>(response);
}
