import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/auth/roles";
import { useSessionRole } from "@/lib/auth/use-session-role";
import {
  creditPractitionerWallet,
  getAdminSessionEarningReview,
  listAdminSessionEarningReviews,
  moderateAdminSessionEarningReview,
  recordFinancialDecision,
} from "../api/admin-session-earning-reviews.api";
import { adminSessionEarningReviewsQueryKeys } from "../constants/query-keys";
import type {
  CreditPractitionerWalletPayload,
  ListAdminSessionEarningReviewsParams,
  ModerateAdminSessionEarningReviewPayload,
  RecordFinancialDecisionPayload,
} from "../types/admin-session-earning-reviews.types";

export function useAdminSessionEarningReviews(
  params: ListAdminSessionEarningReviewsParams,
  options?: { enabled?: boolean },
) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminSessionEarningReviewsQueryKeys.list(params),
    queryFn: () => listAdminSessionEarningReviews(params),
    enabled: (options?.enabled ?? true) && isAdminRole(role),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminSessionEarningReview(reviewId?: string) {
  const role = useSessionRole();

  return useQuery({
    queryKey: adminSessionEarningReviewsQueryKeys.detail(reviewId ?? ""),
    queryFn: () => getAdminSessionEarningReview(reviewId as string),
    enabled: isAdminRole(role) && Boolean(reviewId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useModerateAdminSessionEarningReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: ModerateAdminSessionEarningReviewPayload;
    }) => moderateAdminSessionEarningReview(reviewId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminSessionEarningReviewsQueryKeys.detail(variables.reviewId),
        }),
        queryClient.invalidateQueries({
          queryKey: adminSessionEarningReviewsQueryKeys.all,
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "settlements"] }),
      ]);
    },
  });
}

export function useRecordFinancialDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: RecordFinancialDecisionPayload;
    }) => recordFinancialDecision(reviewId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminSessionEarningReviewsQueryKeys.detail(variables.reviewId),
        }),
        queryClient.invalidateQueries({
          queryKey: adminSessionEarningReviewsQueryKeys.all,
        }),
      ]);
    },
  });
}

export function useCreditPractitionerWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: CreditPractitionerWalletPayload;
    }) => creditPractitionerWallet(reviewId, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminSessionEarningReviewsQueryKeys.detail(variables.reviewId),
        }),
        queryClient.invalidateQueries({
          queryKey: adminSessionEarningReviewsQueryKeys.all,
        }),
        queryClient.invalidateQueries({ queryKey: ["admin", "practitioner-wallets"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "practitioner-transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "practitioner-payouts"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "ledger"] }),
      ]);
    },
  });
}
