import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  addSupportMessage,
  createSupportTicket,
  getMySupportTicket,
  listMySupportTickets,
} from "./api";
import type {
  CreateSupportTicketPayload,
  ListSupportTicketsQuery,
} from "./types";

const supportKeys = {
  all: ["patient-support"] as const,
  list: (query?: ListSupportTicketsQuery) =>
    [...supportKeys.all, "list", query ?? {}] as const,
  detail: (id: string) => [...supportKeys.all, "detail", id] as const,
};

export function usePatientSupportTickets(query?: ListSupportTicketsQuery) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: supportKeys.list(query),
    queryFn: () => listMySupportTickets(query),
    enabled,
    staleTime: 30_000,
  });
}

export function usePatientSupportTicket(ticketId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: supportKeys.detail(ticketId ?? ""),
    queryFn: async () => {
      const res = await getMySupportTicket(ticketId!);
      return res.item;
    },
    enabled: enabled && Boolean(ticketId),
    staleTime: 20_000,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupportTicketPayload) =>
      createSupportTicket(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

export function useAddSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => addSupportMessage(ticketId, message),
    onSuccess: (data) => {
      queryClient.setQueryData(supportKeys.detail(ticketId), data.item);
    },
  });
}
