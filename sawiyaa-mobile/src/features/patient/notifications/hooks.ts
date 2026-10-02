import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "./api";
import type { ListMyNotificationsParams } from "./types";
import { patientNotificationQueryKeys } from "./query-keys";

export { patientNotificationQueryKeys } from "./query-keys";

export function usePatientNotifications(
  params: ListMyNotificationsParams,
  options?: { enabled?: boolean },
) {
  const authEnabled = useAuthenticatedQueryEnabled("patient");
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  return useQuery({
    queryKey: patientNotificationQueryKeys.list(params, locale),
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
