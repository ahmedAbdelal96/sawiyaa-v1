import type {
  CreateSupportTicketInput,
  SupportTicketItemDataResponse,
  SupportTicketListDataResponse,
} from "@/modules/support/domain/support.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

type ListSupportTicketsQuery = {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  priority?: string;
};

export async function createSupportTicketRequest(payload: CreateSupportTicketInput) {
  const response = await httpClient.post<SupportTicketItemDataResponse>(
    "/patients/me/support/tickets",
    payload,
  );
  return unwrapApiData(response.data);
}

export async function listSupportTicketsRequest(query: ListSupportTicketsQuery = {}) {
  const response = await httpClient.get<SupportTicketListDataResponse>(
    "/patients/me/support/tickets",
    { params: query },
  );
  return unwrapApiData(response.data);
}

export async function getSupportTicketRequest(ticketId: string) {
  const response = await httpClient.get<SupportTicketItemDataResponse>(
    `/patients/me/support/tickets/${ticketId}`,
  );
  return unwrapApiData(response.data);
}

export async function addSupportTicketMessageRequest(ticketId: string, message: string) {
  const response = await httpClient.post<SupportTicketItemDataResponse>(
    `/patients/me/support/tickets/${ticketId}/messages`,
    { message },
  );
  return unwrapApiData(response.data);
}
