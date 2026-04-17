import type { AdminSupportListParams, SupportTicketsListParams } from "../types/support.types";

export const supportQueryKeys = {
  all: ["support"] as const,
  tickets: () => [...supportQueryKeys.all, "tickets"] as const,
  ticketsList: (params: SupportTicketsListParams = {}) =>
    [...supportQueryKeys.tickets(), "list", params] as const,
  ticket: (ticketId: string) => [...supportQueryKeys.tickets(), "detail", ticketId] as const,
};

export const practitionerSupportQueryKeys = {
  all: ["practitioner-support"] as const,
  tickets: () => [...practitionerSupportQueryKeys.all, "tickets"] as const,
  ticketsList: (params: SupportTicketsListParams = {}) =>
    [...practitionerSupportQueryKeys.tickets(), "list", params] as const,
  ticket: (ticketId: string) =>
    [...practitionerSupportQueryKeys.tickets(), "detail", ticketId] as const,
};

export const adminSupportQueryKeys = {
  all: ["admin-support"] as const,
  tickets: () => [...adminSupportQueryKeys.all, "tickets"] as const,
  ticketsList: (params: AdminSupportListParams = {}) =>
    [...adminSupportQueryKeys.tickets(), "list", params] as const,
  ticket: (ticketId: string) =>
    [...adminSupportQueryKeys.tickets(), "detail", ticketId] as const,
};
