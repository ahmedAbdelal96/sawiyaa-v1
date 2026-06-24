import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "./api";
import type { ListMyNotificationsParams } from "./types";

const patientNotificationQueryKeys = {
  all: ["patient-notifications"] as const,
  list: (params: ListMyNotificationsParams) =>
    [...patientNotificationQueryKeys.all, "list", params] as const,
  unreadCount: () =>
    [...patientNotificationQueryKeys.all, "unread-count"] as const,
};

export function usePatientNotifications(
  params: ListMyNotificationsParams,
  options?: { enabled?: boolean },
) {
  const authEnabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientNotificationQueryKeys.list(params),
    queryFn: () => listMyNotifications(params),
    enabled: authEnabled && (options?.enabled ?? true),
    staleTime: 20_000,
  });
}

export function usePatientUnreadNotificationCount(options?: {
  enabled?: boolean;
}) {
  const authEnabled = useAuthenticatedQueryEnabled("patient");

  return useQuery({
    queryKey: patientNotificationQueryKeys.unreadCount(),
    queryFn: getMyUnreadNotificationCount,
    enabled: authEnabled && (options?.enabled ?? true),
    staleTime: 15_000,
  });
}

export function useMarkPatientNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: patientNotificationQueryKeys.all,
      });
    },
  });
}

export function useMarkAllPatientNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllMyNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: patientNotificationQueryKeys.all,
      });
    },
  });
}
