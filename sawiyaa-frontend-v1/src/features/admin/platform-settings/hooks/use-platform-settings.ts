import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPlatformSettingHistory,
  changePlatformSettings,
  listPlatformSettings,
  resetPlatformSetting,
  updatePlatformSetting,
} from "../api/platform-settings.api";
import type {
  PlatformSettingDomain,
  PlatformSettingsChangeSetInput,
} from "../types/platform-settings.types";

export const platformSettingsQueryKeys = {
  all: ["admin-platform-settings"] as const,
  list: (params?: unknown) =>
    ["admin-platform-settings", "list", params] as const,
  history: (key: string) =>
    ["admin-platform-settings", "history", key] as const,
};

export function usePlatformSettings(params?: {
  search?: string;
  category?: string;
  state?: string;
  domain?: PlatformSettingDomain;
}) {
  return useQuery({
    queryKey: platformSettingsQueryKeys.list(params),
    queryFn: () => listPlatformSettings(params),
    staleTime: 30_000,
  });
}

export function usePlatformSettingHistory(key: string | null) {
  return useQuery({
    queryKey: platformSettingsQueryKeys.history(key ?? ""),
    queryFn: () => getPlatformSettingHistory(key ?? ""),
    enabled: Boolean(key),
  });
}

export function useUpdatePlatformSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      ...input
    }: {
      key: string;
      value: unknown;
      reason: string;
      expectedUpdatedAt?: string | null;
    }) => updatePlatformSetting(key, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformSettingsQueryKeys.all,
      }),
  });
}

export function usePlatformSettingsChangeSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlatformSettingsChangeSetInput) =>
      changePlatformSettings(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformSettingsQueryKeys.all,
      }),
  });
}

export function useResetPlatformSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      ...input
    }: {
      key: string;
      reason: string;
      expectedUpdatedAt?: string | null;
    }) => resetPlatformSetting(key, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: platformSettingsQueryKeys.all,
      }),
  });
}
