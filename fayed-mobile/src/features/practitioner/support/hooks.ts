import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  addSupportMessage,
  getMySupportTicket,
  listMySupportTickets,
} from "./api";
import type { ListSupportTicketsQuery } from "./types";

const supportKeys = {
  all: ["practitioner-support"] as const,
  list: (query?: ListSupportTicketsQuery) =>
    [...supportKeys.all, "list", query ?? {}] as const,
  detail: (id: string) => [...supportKeys.all, "detail", id] as const,
};

export function usePractitionerSupportTickets(query?: ListSupportTicketsQuery) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: supportKeys.list(query),
    queryFn: () => listMySupportTickets(query),
    enabled,
    staleTime: 30_000,
  });
}

export function usePractitionerSupportTicket(ticketId: string | null) {
  const enabled = useAuthenticatedQueryEnabled("practitioner");

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

export function useAddPractitionerSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => addSupportMessage(ticketId, message),
    onSuccess: (data) => {
      queryClient.setQueryData(supportKeys.detail(ticketId), data.item);
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
  });
}

