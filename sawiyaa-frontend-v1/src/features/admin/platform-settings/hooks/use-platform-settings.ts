import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPlatformSettingHistory,
  listPlatformSettings,
  resetPlatformSetting,
  updatePlatformSetting,
} from "../api/platform-settings.api";

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
