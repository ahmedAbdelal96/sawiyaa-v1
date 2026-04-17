import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientJourneyQueryKeys } from "@/features/patient-journey/constants/query-keys";
import {
  addAdminInternalNote,
  addAdminSupportMessage,
  addPatientSupportMessage,
  addPractitionerSupportMessage,
  assignAdminSupportTicket,
  createPatientSupportTicket,
  createPractitionerSupportTicket,
  getAdminSupportTicket,
  getAdminSupportTickets,
  getPatientSupportTicket,
  getPatientSupportTickets,
  getPractitionerSupportTicket,
  getPractitionerSupportTickets,
  updateAdminSupportTicketStatus,
} from "../api/support.api";
import {
  adminSupportQueryKeys,
  practitionerSupportQueryKeys,
  supportQueryKeys,
} from "../constants/query-keys";
import type {
  AddSupportMessageRequest,
  AdminSupportListParams,
  AssignSupportTicketRequest,
  CreateSupportTicketRequest,
  SupportTicketsListParams,
  UpdateSupportTicketStatusRequest,
} from "../types/support.types";

export function usePatientSupportTickets(params: SupportTicketsListParams = {}) {
  return useQuery({
    queryKey: supportQueryKeys.ticketsList(params),
    queryFn: () => getPatientSupportTickets(params),
    staleTime: 60_000,
  });
}

export function usePatientSupportTicket(ticketId: string | null) {
  return useQuery({
    queryKey: supportQueryKeys.ticket(ticketId ?? ""),
    queryFn: () => getPatientSupportTicket(ticketId!),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
  });
}

export function useCreatePatientSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupportTicketRequest) => createPatientSupportTicket(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: supportQueryKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.all });
      queryClient.setQueryData(supportQueryKeys.ticket(data.item.id), data);
    },
  });
}

export function useAddPatientSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddSupportMessageRequest) =>
      addPatientSupportMessage(ticketId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(supportQueryKeys.ticket(ticketId), data);
      queryClient.invalidateQueries({ queryKey: supportQueryKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.all });
    },
  });
}

export function usePractitionerSupportTickets(params: SupportTicketsListParams = {}) {
  return useQuery({
    queryKey: practitionerSupportQueryKeys.ticketsList(params),
    queryFn: () => getPractitionerSupportTickets(params),
    staleTime: 60_000,
  });
}

export function usePractitionerSupportTicket(ticketId: string | null) {
  return useQuery({
    queryKey: practitionerSupportQueryKeys.ticket(ticketId ?? ""),
    queryFn: () => getPractitionerSupportTicket(ticketId!),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
  });
}

export function useCreatePractitionerSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSupportTicketRequest) =>
      createPractitionerSupportTicket(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: practitionerSupportQueryKeys.tickets() });
      queryClient.setQueryData(
        practitionerSupportQueryKeys.ticket(data.item.id),
        data,
      );
    },
  });
}

export function useAddPractitionerSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddSupportMessageRequest) =>
      addPractitionerSupportMessage(ticketId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(practitionerSupportQueryKeys.ticket(ticketId), data);
      queryClient.invalidateQueries({
        queryKey: practitionerSupportQueryKeys.tickets(),
      });
    },
  });
}

// Admin support hooks

export function useAdminSupportTickets(params: AdminSupportListParams = {}) {
  return useQuery({
    queryKey: adminSupportQueryKeys.ticketsList(params),
    queryFn: () => getAdminSupportTickets(params),
    staleTime: 60_000,
  });
}

export function useAdminSupportTicket(ticketId: string | null) {
  return useQuery({
    queryKey: adminSupportQueryKeys.ticket(ticketId ?? ""),
    queryFn: () => getAdminSupportTicket(ticketId!),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
  });
}

export function useAddAdminSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddSupportMessageRequest) =>
      addAdminSupportMessage(ticketId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSupportQueryKeys.ticket(ticketId), data);
      queryClient.invalidateQueries({ queryKey: adminSupportQueryKeys.tickets() });
    },
  });
}

export function useAddAdminInternalNote(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddSupportMessageRequest) =>
      addAdminInternalNote(ticketId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSupportQueryKeys.ticket(ticketId), data);
      queryClient.invalidateQueries({ queryKey: adminSupportQueryKeys.tickets() });
    },
  });
}

export function useUpdateAdminSupportTicketStatus(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSupportTicketStatusRequest) =>
      updateAdminSupportTicketStatus(ticketId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSupportQueryKeys.ticket(ticketId), data);
      queryClient.invalidateQueries({ queryKey: adminSupportQueryKeys.tickets() });
    },
  });
}

export function useAssignAdminSupportTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignSupportTicketRequest) =>
      assignAdminSupportTicket(ticketId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(adminSupportQueryKeys.ticket(ticketId), data);
      queryClient.invalidateQueries({ queryKey: adminSupportQueryKeys.tickets() });
    },
  });
}
