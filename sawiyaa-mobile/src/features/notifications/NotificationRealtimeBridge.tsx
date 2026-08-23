import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../providers/AuthProvider";
import { instantBookingQueryKeys } from "../instant-booking/hooks";
import {
  disconnectNotificationSocket,
  ensureNotificationSocketConnected,
  getNotificationSocket,
} from "./realtime-socket";

export function NotificationRealtimeBridge() {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = role ? ensureNotificationSocketConnected() : null;
    if (!socket) {
      disconnectNotificationSocket();
      return;
    }

    const handleNotification = () => {
      void queryClient.invalidateQueries({ queryKey: ["patient-notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["practitioner-notifications"] });
      void queryClient.invalidateQueries({ queryKey: instantBookingQueryKeys.all });
    };

    socket.off("notifications:new");
    socket.on("notifications:new", handleNotification);

    return () => {
      socket.off("notifications:new", handleNotification);
      disconnectNotificationSocket();
    };
  }, [queryClient, role]);

  return null;
}
