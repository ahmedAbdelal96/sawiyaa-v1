"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminRefundPolicyClause,
  deleteAdminRefundPolicyClause,
  getAdminRefundPolicy,
  listAdminRefundPolicies,
  reorderAdminRefundPolicyClauses,
  updateAdminRefundPolicy,
  updateAdminRefundPolicyClause,
} from "../api/admin-refund-policies.api";
import type {
  AdminRefundPolicyType,
  CreateAdminRefundPolicyClauseInput,
  ReorderAdminRefundPolicyClausesInput,
  UpdateAdminRefundPolicyInput,
} from "../types/admin-refund-policies.types";

export const adminRefundPoliciesQueryKeys = {
  all: ["admin-refund-policies"] as const,
  list: () => [...adminRefundPoliciesQueryKeys.all, "list"] as const,
  item: (policyType: AdminRefundPolicyType | string) =>
    [...adminRefundPoliciesQueryKeys.all, "item", policyType] as const,
} as const;

export function useAdminRefundPolicies() {
  return useQuery({
    queryKey: adminRefundPoliciesQueryKeys.list(),
    queryFn: listAdminRefundPolicies,
    staleTime: 20_000,
  });
}

export function useAdminRefundPolicy(policyType: AdminRefundPolicyType) {
  return useQuery({
    queryKey: adminRefundPoliciesQueryKeys.item(policyType),
    queryFn: () => getAdminRefundPolicy(policyType),
    enabled: Boolean(policyType),
    staleTime: 20_000,
  });
}

export function useUpdateAdminRefundPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      policyType,
      input,
    }: {
      policyType: AdminRefundPolicyType;
      input: UpdateAdminRefundPolicyInput;
    }) => updateAdminRefundPolicy(policyType, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.item(variables.policyType),
      });
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.list(),
      });
    },
  });
}

export function useCreateAdminRefundPolicyClause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      policyType,
      input,
    }: {
      policyType: AdminRefundPolicyType;
      input: CreateAdminRefundPolicyClauseInput;
    }) => createAdminRefundPolicyClause(policyType, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.item(variables.policyType),
      });
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.list(),
      });
    },
  });
}

export function useUpdateAdminRefundPolicyClause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      policyType,
      clauseId,
      input,
    }: {
      policyType: AdminRefundPolicyType;
      clauseId: string;
      input: CreateAdminRefundPolicyClauseInput;
    }) => updateAdminRefundPolicyClause(policyType, clauseId, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.item(variables.policyType),
      });
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.list(),
      });
    },
  });
}

export function useDeleteAdminRefundPolicyClause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      policyType,
      clauseId,
    }: {
      policyType: AdminRefundPolicyType;
      clauseId: string;
    }) => deleteAdminRefundPolicyClause(policyType, clauseId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.item(variables.policyType),
      });
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.list(),
      });
    },
  });
}

export function useReorderAdminRefundPolicyClauses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      policyType,
      input,
    }: {
      policyType: AdminRefundPolicyType;
      input: ReorderAdminRefundPolicyClausesInput;
    }) => reorderAdminRefundPolicyClauses(policyType, input),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.item(variables.policyType),
      });
      void queryClient.invalidateQueries({
        queryKey: adminRefundPoliciesQueryKeys.list(),
      });
    },
  });
}
