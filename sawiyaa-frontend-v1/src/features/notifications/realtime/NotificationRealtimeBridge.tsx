"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  disconnectNotificationSocket,
  ensureNotificationSocketConnected,
  getNotificationSocket,
} from "./notification-socket.client";
import { userNotificationsQueryKeys } from "../constants/query-keys";

const AUTH_SESSION_CHANGED_EVENT = "sawiyaa:auth-session-changed";

export function NotificationRealtimeBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleNotification = () => {
      void queryClient.invalidateQueries({
        queryKey: userNotificationsQueryKeys.all,
      });
    };

    const refreshConnection = () => {
      const socket = ensureNotificationSocketConnected();
      if (!socket) {
        disconnectNotificationSocket();
        return;
      }

      socket.off("notifications:new");
      socket.on("notifications:new", handleNotification);
    };

    refreshConnection();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, refreshConnection);
    const interval = window.setInterval(refreshConnection, 2_000);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, refreshConnection);
      window.clearInterval(interval);
      const socket = getNotificationSocket();
      socket?.off("notifications:new", handleNotification);
      disconnectNotificationSocket();
    };
  }, [queryClient]);

  return null;
}
