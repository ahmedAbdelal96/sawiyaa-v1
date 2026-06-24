import { apiClient, extractApiData } from "../../../lib/api";
import type {
  ListMyNotificationsParams,
  UserNotificationBulkReadResponseData,
  UserNotificationReadResponseData,
  UserNotificationsListResponseData,
  UserUnreadNotificationCountResponseData,
} from "./types";

export async function listMyNotifications(params: ListMyNotificationsParams) {
  const response = await apiClient.get("/notifications/me", { params });
  return extractApiData<UserNotificationsListResponseData>(response);
}

export async function getMyUnreadNotificationCount() {
  const response = await apiClient.get("/notifications/me/unread-count");
  return extractApiData<UserUnreadNotificationCountResponseData>(response);
}

export async function markMyNotificationRead(notificationId: string) {
  const response = await apiClient.patch(
    `/notifications/me/${notificationId}/read`,
  );
  return extractApiData<UserNotificationReadResponseData>(response);
}

export async function markAllMyNotificationsRead() {
  const response = await apiClient.patch("/notifications/me/read-all");
  return extractApiData<UserNotificationBulkReadResponseData>(response);
}
