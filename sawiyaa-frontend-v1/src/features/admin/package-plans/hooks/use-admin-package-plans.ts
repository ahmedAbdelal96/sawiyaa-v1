import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  disableAdminPackagePlan,
  enableAdminPackagePlan,
  getAdminPackagePlan,
  getAdminPackagePlanSettings,
  listAdminPackagePlans,
  updateAdminPackagePlan,
  updateAdminPackagePlanSettings,
} from "../api/admin-package-plans.api";
import { adminPackagePlansQueryKeys } from "../constants/query-keys";
import type {
  AdminPackagePlanCode,
  UpdateAdminPackagePlanInput,
  UpdateAdminPackagePlanSettingsInput,
} from "../types/admin-package-plans.types";

export function useAdminPackagePlans() {
  return useQuery({
    queryKey: adminPackagePlansQueryKeys.list(),
    queryFn: () => listAdminPackagePlans(),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPackagePlan(code: AdminPackagePlanCode | string | null) {
  return useQuery({
    queryKey: adminPackagePlansQueryKeys.detail(code ?? ""),
    queryFn: () => getAdminPackagePlan(code as string),
    enabled: Boolean(code),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminPackagePlanSettings() {
  return useQuery({
    queryKey: adminPackagePlansQueryKeys.settings(),
    queryFn: () => getAdminPackagePlanSettings(),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useUpdateAdminPackagePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, data }: { code: AdminPackagePlanCode | string; data: UpdateAdminPackagePlanInput }) =>
      updateAdminPackagePlan(code, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.detail(variables.code) });
    },
  });
}

export function useEnableAdminPackagePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: AdminPackagePlanCode | string) => enableAdminPackagePlan(code),
    onSuccess: (_, code) => {
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.detail(code) });
    },
  });
}

export function useDisableAdminPackagePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: AdminPackagePlanCode | string) => disableAdminPackagePlan(code),
    onSuccess: (_, code) => {
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.detail(code) });
    },
  });
}

export function useUpdateAdminPackagePlanSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAdminPackagePlanSettingsInput) => updateAdminPackagePlanSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.settings() });
      queryClient.invalidateQueries({ queryKey: adminPackagePlansQueryKeys.all });
    },
  });
}
