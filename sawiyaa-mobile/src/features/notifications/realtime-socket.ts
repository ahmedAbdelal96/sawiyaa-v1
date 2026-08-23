import { io, type Socket } from "socket.io-client";
import { apiClient } from "../../lib/api";

let socketInstance: Socket | null = null;

function resolveSocketBaseUrl() {
  return (apiClient.defaults.baseURL || "").replace("/api/v1", "");
}

function getAccessToken() {
  const authHeader = apiClient.defaults.headers.common.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export function getNotificationSocket() {
  if (!socketInstance) {
    socketInstance = io(`${resolveSocketBaseUrl()}/notifications`, {
      autoConnect: false,
      transports: ["websocket"],
      path: "/socket.io",
    });
  }
  return socketInstance;
}

export function ensureNotificationSocketConnected() {
  const socket = getNotificationSocket();
  const token = getAccessToken();
  if (!token) return null;

  socket.auth = { accessToken: token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectNotificationSocket() {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance.removeAllListeners();
  socketInstance = null;
}
