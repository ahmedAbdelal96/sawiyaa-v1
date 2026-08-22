import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  getMyUnreadNotificationCount,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
} from "../../patient/notifications/api";
import type { ListMyNotificationsParams } from "../../patient/notifications/types";
import { practitionerNotificationQueryKeys } from "./query-keys";

export { practitionerNotificationQueryKeys } from "./query-keys";

export function usePractitionerNotifications(
  params: ListMyNotificationsParams,
  options?: { enabled?: boolean },
) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  return useQuery({
    queryKey: practitionerNotificationQueryKeys.list(params, locale),
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
