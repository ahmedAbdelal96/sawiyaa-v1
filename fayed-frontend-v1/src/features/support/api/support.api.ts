import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AddSupportMessageRequest,
  AdminSupportListParams,
  AdminSupportTicketResponse,
  AssignSupportTicketRequest,
  CreateSupportTicketRequest,
  SupportTicketResponse,
  SupportTicketsListParams,
  SupportTicketsListResponse,
  UpdateSupportTicketStatusRequest,
} from "../types/support.types";

export async function createPatientSupportTicket(
  payload: CreateSupportTicketRequest,
): Promise<SupportTicketResponse> {
  const response = await httpClient.post<ApiPayload<SupportTicketResponse>>(
    "/patients/me/support/tickets",
    payload,
  );
  return extractData(response.data);
}

export async function getPatientSupportTickets(
  params: SupportTicketsListParams = {},
): Promise<SupportTicketsListResponse> {
  const response = await httpClient.get<ApiPayload<SupportTicketsListResponse>>(
    "/patients/me/support/tickets",
    {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
        category: params.category,
        priority: params.priority,
      },
    },
  );
  return extractData(response.data);
}

export async function getPatientSupportTicket(
  ticketId: string,
): Promise<SupportTicketResponse> {
  const response = await httpClient.get<ApiPayload<SupportTicketResponse>>(
    `/patients/me/support/tickets/${ticketId}`,
  );
  return extractData(response.data);
}

export async function addPatientSupportMessage(
  ticketId: string,
  payload: AddSupportMessageRequest,
): Promise<SupportTicketResponse> {
  const response = await httpClient.post<ApiPayload<SupportTicketResponse>>(
    `/patients/me/support/tickets/${ticketId}/messages`,
    payload,
  );
  return extractData(response.data);
}

export async function createPractitionerSupportTicket(
  payload: CreateSupportTicketRequest,
): Promise<SupportTicketResponse> {
  const response = await httpClient.post<ApiPayload<SupportTicketResponse>>(
    "/practitioners/me/support/tickets",
    payload,
  );
  return extractData(response.data);
}

export async function getPractitionerSupportTickets(
  params: SupportTicketsListParams = {},
): Promise<SupportTicketsListResponse> {
  const response = await httpClient.get<ApiPayload<SupportTicketsListResponse>>(
    "/practitioners/me/support/tickets",
    {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
        category: params.category,
        priority: params.priority,
      },
    },
  );
  return extractData(response.data);
}

export async function getPractitionerSupportTicket(
  ticketId: string,
): Promise<SupportTicketResponse> {
  const response = await httpClient.get<ApiPayload<SupportTicketResponse>>(
    `/practitioners/me/support/tickets/${ticketId}`,
  );
  return extractData(response.data);
}

export async function addPractitionerSupportMessage(
  ticketId: string,
  payload: AddSupportMessageRequest,
): Promise<SupportTicketResponse> {
  const response = await httpClient.post<ApiPayload<SupportTicketResponse>>(
    `/practitioners/me/support/tickets/${ticketId}/messages`,
    payload,
  );
  return extractData(response.data);
}

// Admin support API

export async function getAdminSupportTickets(
  params: AdminSupportListParams = {},
): Promise<SupportTicketsListResponse> {
  const response = await httpClient.get<ApiPayload<SupportTicketsListResponse>>(
    "/admin/support/tickets",
    {
      params: {
        page: params.page,
        limit: params.limit,
        status: params.status,
        category: params.category,
        priority: params.priority,
        assignedToMe: params.assignedToMe,
      },
    },
  );
  return extractData(response.data);
}

export async function getAdminSupportTicket(
  ticketId: string,
): Promise<AdminSupportTicketResponse> {
  const response = await httpClient.get<ApiPayload<AdminSupportTicketResponse>>(
    `/admin/support/tickets/${ticketId}`,
  );
  return extractData(response.data);
}

export async function addAdminSupportMessage(
  ticketId: string,
  payload: AddSupportMessageRequest,
): Promise<AdminSupportTicketResponse> {
  const response = await httpClient.post<ApiPayload<AdminSupportTicketResponse>>(
    `/admin/support/tickets/${ticketId}/messages`,
    payload,
  );
  return extractData(response.data);
}

export async function addAdminInternalNote(
  ticketId: string,
  payload: AddSupportMessageRequest,
): Promise<AdminSupportTicketResponse> {
  const response = await httpClient.post<ApiPayload<AdminSupportTicketResponse>>(
    `/admin/support/tickets/${ticketId}/internal-notes`,
    payload,
  );
  return extractData(response.data);
}

export async function updateAdminSupportTicketStatus(
  ticketId: string,
  payload: UpdateSupportTicketStatusRequest,
): Promise<AdminSupportTicketResponse> {
  const response = await httpClient.patch<ApiPayload<AdminSupportTicketResponse>>(
    `/admin/support/tickets/${ticketId}/status`,
    payload,
  );
  return extractData(response.data);
}

export async function assignAdminSupportTicket(
  ticketId: string,
  payload: AssignSupportTicketRequest,
): Promise<AdminSupportTicketResponse> {
  const response = await httpClient.patch<ApiPayload<AdminSupportTicketResponse>>(
    `/admin/support/tickets/${ticketId}/assign`,
    payload,
  );
  return extractData(response.data);
}
