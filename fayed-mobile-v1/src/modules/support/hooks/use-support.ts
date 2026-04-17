import { useMutation, useQuery } from "@tanstack/react-query";

import { supportService } from "@/modules/support/application/support.service";
import type {
  CreateSupportTicketInput,
  SupportTicketDetails,
} from "@/modules/support/domain/support.types";
import { queryClient } from "@/networking/query/query-client";

export function useSupportTickets() {
  return useQuery({
    queryKey: ["support", "tickets"],
    queryFn: () => supportService.listTickets(),
  });
}

export function useSupportTicket(ticketId: string) {
  return useQuery({
    enabled: Boolean(ticketId),
    queryKey: ["support", "ticket", ticketId],
    queryFn: () => supportService.getTicket(ticketId),
  });
}

export function useCreateSupportTicket() {
  return useMutation({
    mutationFn: (payload: CreateSupportTicketInput) => supportService.createTicket(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
      await queryClient.invalidateQueries({ queryKey: ["journey", "summary"] });
    },
  });
}

export function useAddSupportMessage(ticketId: string) {
  return useMutation({
    mutationFn: (message: string) => supportService.addMessage(ticketId, message),
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: ["support", "ticket", ticketId] });
      const previousTicket = queryClient.getQueryData<SupportTicketDetails>([
        "support",
        "ticket",
        ticketId,
      ]);
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        senderRole: "PATIENT" as const,
        message,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["support", "ticket", ticketId],
        (current: SupportTicketDetails | undefined) =>
          current
            ? {
                ...current,
                messages: [...current.messages, optimisticMessage],
                lastMessageAt: optimisticMessage.createdAt,
              }
            : current,
      );

      return { previousTicket };
    },
    onError: (_error, _message, context) => {
      if (context?.previousTicket) {
        queryClient.setQueryData(["support", "ticket", ticketId], context.previousTicket);
      }
    },
    onSuccess: async (ticket) => {
      queryClient.setQueryData(["support", "ticket", ticketId], ticket);
      await queryClient.invalidateQueries({ queryKey: ["support", "ticket", ticketId] });
      await queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
  });
}
