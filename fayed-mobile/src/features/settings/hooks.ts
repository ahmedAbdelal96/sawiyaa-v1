import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMySettings,
  getMySettingsNotificationPreferences,
  patchMySettingsPreferences,
  putMySettingsNotificationPreferences,
} from "./api";

const settingsQueryKeys = {
  all: ["my-settings"] as const,
  me: () => [...settingsQueryKeys.all, "me"] as const,
  notificationPreferences: () =>
    [...settingsQueryKeys.all, "notification-preferences"] as const,
};

export function useMySettings(enabled = true) {
  return useQuery({
    queryKey: settingsQueryKeys.me(),
    queryFn: getMySettings,
    enabled,
    staleTime: 60_000,
  });
}

export function useMySettingsNotificationPreferences(enabled = true) {
  return useQuery({
    queryKey: settingsQueryKeys.notificationPreferences(),
    queryFn: getMySettingsNotificationPreferences,
    enabled,
    staleTime: 60_000,
  });
}

export function usePatchMySettingsPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchMySettingsPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all });
    },
  });
}

export function usePutMySettingsNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: putMySettingsNotificationPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.notificationPreferences() });
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.me() });
    },
  });
}
