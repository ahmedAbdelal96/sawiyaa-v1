import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  downloadAdminPractitionerPayoutProof,
  getAdminPractitionerPayoutDetail,
  getAdminPractitionerStatement,
  listAdminSettlementDuesDirectory,
  listAdminPractitionerPayoutDues,
  listAdminPractitionerPayoutHistory,
  listAdminPayoutHistory,
  listAdminPractitionerPayouts,
  listAdminPractitionerSettlements,
  generateAdminSettlementBatch,
  getAdminSettlementBatchDetails,
  listAdminSettlementBatches,
  recordAdminPractitionerPayout,
  recordAdminPractitionerSettlementPayout,
  uploadAdminPractitionerPayoutProof,
  markAdminSettlementFailed,
  markAdminSettlementPaid,
} from "../api/admin-settlements.api";
import { adminSettlementsQueryKeys } from "../constants/query-keys";
import type {
  GenerateSettlementBatchInput,
  PractitionerPayoutDetailResponseData,
  PractitionerPayoutDueListResponseData,
  PractitionerPayoutHistoryListResponseData,
  RecordPractitionerPayoutRequest,
  ListPractitionerSettlementsParams,
  ListSettlementBatchesParams,
  ListSettlementPayoutsParams,
  MarkSettlementFailedInput,
  MarkSettlementPaidInput,
  RecordPractitionerSettlementPayoutInput,
  ListSettlementDuesDirectoryParams,
} from "../types/admin-settlements.types";

export function useAdminSettlementBatches(params: ListSettlementBatchesParams) {
  return useQuery({
    queryKey: adminSettlementsQueryKeys.list(params),
    queryFn: () => listAdminSettlementBatches(params),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminSettlementDuesDirectory(params: ListSettlementDuesDirectoryParams) {
  return useQuery({
    queryKey: adminSettlementsQueryKeys.duesDirectory(params),
    queryFn: () => listAdminSettlementDuesDirectory(params),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminSettlementBatchDetails(batchId?: string) {
  return useQuery({
    queryKey: adminSettlementsQueryKeys.details(batchId ?? ""),
    queryFn: () => getAdminSettlementBatchDetails(batchId as string),
    enabled: Boolean(batchId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useGenerateAdminSettlementBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateSettlementBatchInput) =>
      generateAdminSettlementBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
    },
  });
}

export function useMarkAdminSettlementPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      data,
    }: {
      batchId: string;
      data: MarkSettlementPaidInput;
    }) => markAdminSettlementPaid(batchId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminSettlementsQueryKeys.details(variables.batchId),
      });
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
    },
  });
}

export function useMarkAdminSettlementFailed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      data,
    }: {
      batchId: string;
      data: MarkSettlementFailedInput;
    }) => markAdminSettlementFailed(batchId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminSettlementsQueryKeys.details(variables.batchId),
      });
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
    },
  });
}

export function useAdminPractitionerSettlements(
  practitionerId?: string,
  params?: ListPractitionerSettlementsParams,
) {
  return useQuery({
    queryKey: practitionerId
      ? adminSettlementsQueryKeys.practitionerSettlements(practitionerId, params ?? {})
      : adminSettlementsQueryKeys.practitionerSettlements("", params ?? {}),
    queryFn: () =>
      listAdminPractitionerSettlements(practitionerId as string, params ?? {}),
    enabled: Boolean(practitionerId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerPayouts(
  practitionerId?: string,
  params?: ListSettlementPayoutsParams,
) {
  return useQuery({
    queryKey: practitionerId
      ? adminSettlementsQueryKeys.practitionerPayouts(practitionerId, params ?? {})
      : adminSettlementsQueryKeys.practitionerPayouts("", params ?? {}),
    queryFn: () =>
      listAdminPractitionerPayouts(practitionerId as string, params ?? {}),
    enabled: Boolean(practitionerId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useRecordAdminPractitionerSettlementPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      practitionerId: string;
      settlementId: string;
      data: RecordPractitionerSettlementPayoutInput;
    }) =>
      recordAdminPractitionerSettlementPayout(
        input.practitionerId,
        input.settlementId,
        input.data,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioners"] });
      void variables;
    },
  });
}

export function useAdminPractitionerPayoutDues(
  practitionerId?: string,
  params?: { page?: number; limit?: number; currencyCode?: string },
) {
  return useQuery({
    queryKey: practitionerId
      ? adminSettlementsQueryKeys.practitionerPayoutDues(practitionerId, params ?? {})
      : adminSettlementsQueryKeys.practitionerPayoutDues("", params ?? {}),
    queryFn: () => listAdminPractitionerPayoutDues(practitionerId as string, params),
    enabled: Boolean(practitionerId),
    retry: false,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerPayoutHistory(
  practitionerId?: string,
  params?: {
    page?: number;
    limit?: number;
    payoutMethod?: string;
    payoutSource?: string;
    createdFrom?: string;
    createdTo?: string;
    currencyCode?: string;
  },
) {
  return useQuery({
    queryKey: practitionerId
      ? adminSettlementsQueryKeys.practitionerPayoutHistory(practitionerId, params ?? {})
      : adminSettlementsQueryKeys.practitionerPayoutHistory("", params ?? {}),
    queryFn: () => listAdminPractitionerPayoutHistory(practitionerId as string, params),
    enabled: Boolean(practitionerId),
    retry: false,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPayoutHistory(
  params?: {
    page?: number;
    limit?: number;
    practitionerId?: string;
    payoutMethod?: string;
    createdFrom?: string;
    createdTo?: string;
    currencyCode?: string;
  },
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: adminSettlementsQueryKeys.payoutHistory(params ?? {}),
    queryFn: () => listAdminPayoutHistory(params),
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerPayoutDetail(
  practitionerId?: string,
  payoutId?: string,
) {
  return useQuery({
    queryKey:
      practitionerId && payoutId
        ? adminSettlementsQueryKeys.practitionerPayoutDetail(practitionerId, payoutId)
        : adminSettlementsQueryKeys.practitionerPayoutDetail("", ""),
    queryFn: () => getAdminPractitionerPayoutDetail(practitionerId as string, payoutId as string),
    enabled: Boolean(practitionerId && payoutId),
    retry: false,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPractitionerStatement(
  practitionerId?: string,
  params?: {
    currencyCode?: string;
    rowType?: "ALL" | "EARNING" | "PAYOUT";
    effectiveFrom?: string;
    effectiveTo?: string;
  },
) {
  return useQuery({
    queryKey: practitionerId
      ? adminSettlementsQueryKeys.practitionerStatement(practitionerId, params ?? {})
      : adminSettlementsQueryKeys.practitionerStatement("", params ?? {}),
    queryFn: () =>
      getAdminPractitionerStatement(practitionerId as string, params),
    enabled: Boolean(practitionerId),
    retry: false,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useRecordAdminPractitionerPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { practitionerId: string; data: RecordPractitionerPayoutRequest }) =>
      recordAdminPractitionerPayout(input.practitionerId, input.data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["admin", "practitioners"] });
      void variables;
    },
  });
}

export function useUploadAdminPractitionerPayoutProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { practitionerId: string; payoutId: string; file: File }) =>
      uploadAdminPractitionerPayoutProof(input.practitionerId, input.payoutId, input.file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminSettlementsQueryKeys.all });
      void variables;
    },
  });
}

export function useDownloadAdminPractitionerPayoutProof() {
  return useMutation({
    mutationFn: (input: { practitionerId: string; payoutId: string }) =>
      downloadAdminPractitionerPayoutProof(input.practitionerId, input.payoutId),
  });
}
