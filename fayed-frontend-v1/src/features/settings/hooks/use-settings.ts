import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMySettings,
  getMySettingsNotificationPreferences,
  patchMySettingsPreferences,
  putMySettingsNotificationPreferences,
} from "../api/settings.api";
import { settingsQueryKeys } from "../constants/query-keys";

export function useMySettings(enabled = true) {
  return useQuery({
    queryKey: settingsQueryKeys.me(),
    queryFn: getMySettings,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useMySettingsNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: settingsQueryKeys.meNotificationPreferences(),
    queryFn: getMySettingsNotificationPreferences,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

export function usePatchMySettingsPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchMySettingsPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
}

export function usePutMySettingsNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putMySettingsNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.meNotificationPreferences() });
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.me() });
    },
  });
}
