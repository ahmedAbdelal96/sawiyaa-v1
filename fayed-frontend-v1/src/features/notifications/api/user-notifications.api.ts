import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  ListMyNotificationsParams,
  UserNotificationBulkReadResponseData,
  UserNotificationReadResponseData,
  UserNotificationsListResponseData,
  UserUnreadNotificationCountResponseData,
} from "../types/user-notifications.types";

export async function listMyNotifications(params: ListMyNotificationsParams) {
  const response = await httpClient.get<
    ApiPayload<UserNotificationsListResponseData>
  >("/notifications/me", { params });

  return extractData(response.data);
}

export async function getMyUnreadNotificationCount() {
  const response = await httpClient.get<
    ApiPayload<UserUnreadNotificationCountResponseData>
  >("/notifications/me/unread-count");

  return extractData(response.data);
}

export async function markMyNotificationRead(notificationId: string) {
  const response = await httpClient.patch<
    ApiPayload<UserNotificationReadResponseData>
  >(`/notifications/me/${notificationId}/read`);

  return extractData(response.data);
}

export async function markAllMyNotificationsRead() {
  const response = await httpClient.patch<
    ApiPayload<UserNotificationBulkReadResponseData>
  >("/notifications/me/read-all");

  return extractData(response.data);
}

