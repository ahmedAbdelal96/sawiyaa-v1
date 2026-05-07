import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../api/user-notifications.api";
import { userNotificationsQueryKeys } from "../constants/query-keys";
import type { ListMyNotificationsParams } from "../types/user-notifications.types";

export function useUserNotifications(
  params: ListMyNotificationsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: userNotificationsQueryKeys.list(params),
    queryFn: () => listMyNotifications(params),
    enabled: options?.enabled ?? true,
    staleTime: 20_000,
    gcTime: 10 * 60_000,
  });
}

export function useMyUnreadNotificationCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userNotificationsQueryKeys.unreadCount(),
    queryFn: getMyUnreadNotificationCount,
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
    gcTime: 10 * 60_000,
  });
}

export function useMarkMyNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userNotificationsQueryKeys.all,
      });
    },
  });
}

export function useMarkAllMyNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllMyNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userNotificationsQueryKeys.all,
      });
    },
  });
}

