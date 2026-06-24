import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminNotificationDetailResponseData,
  AdminNotificationsListResponseData,
  ListAdminNotificationsParams,
} from "../types/admin-notifications.types";

export async function listAdminNotifications(params: ListAdminNotificationsParams) {
  const response = await httpClient.get<ApiPayload<AdminNotificationsListResponseData>>(
    "/admin/notifications",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminNotificationDetails(notificationId: string) {
  const response = await httpClient.get<ApiPayload<AdminNotificationDetailResponseData>>(
    `/admin/notifications/${notificationId}`,
  );

  return extractData(response.data);
}
