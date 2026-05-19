import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../patient/notifications/api";
import type { ListMyNotificationsParams } from "../../patient/notifications/types";

const practitionerNotificationQueryKeys = {
  all: ["practitioner-notifications"] as const,
  list: (params: ListMyNotificationsParams) =>
    [...practitionerNotificationQueryKeys.all, "list", params] as const,
  unreadCount: () =>
    [...practitionerNotificationQueryKeys.all, "unread-count"] as const,
};

export function usePractitionerNotifications(
  params: ListMyNotificationsParams,
  options?: { enabled?: boolean },
) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerNotificationQueryKeys.list(params),
    queryFn: () => listMyNotifications(params),
    enabled: authEnabled && (options?.enabled ?? true),
    staleTime: 20_000,
  });
}

export function usePractitionerUnreadNotificationCount(options?: {
  enabled?: boolean;
}) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerNotificationQueryKeys.unreadCount(),
    queryFn: getMyUnreadNotificationCount,
    enabled: authEnabled && (options?.enabled ?? true),
    staleTime: 15_000,
  });
}

export function useMarkPractitionerNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: practitionerNotificationQueryKeys.all,
      });
    },
  });
}

export function useMarkAllPractitionerNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllMyNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: practitionerNotificationQueryKeys.all,
      });
    },
  });
}
