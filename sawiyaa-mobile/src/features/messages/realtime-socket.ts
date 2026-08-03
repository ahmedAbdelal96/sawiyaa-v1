import { io, Socket } from "socket.io-client";
import { apiClient } from "../../lib/api";

let socketInstance: Socket | null = null;

function resolveSocketBaseUrl() {
  const base = apiClient.defaults.baseURL || "";
  // The socket shares the configured API origin and strips the API prefix.
  return base.replace("/api/v1", "");
}

export function getUnifiedMessagesSocket() {
  if (!socketInstance) {
    socketInstance = io(`${resolveSocketBaseUrl()}/messages`, {
      autoConnect: false,
      transports: ["websocket"],
      path: "/socket.io",
    });
  }
  return socketInstance;
}

export function getAccessToken() {
  const authHeader = apiClient.defaults.headers.common.Authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

export function ensureUnifiedMessagesSocketConnected() {
  const socket = getUnifiedMessagesSocket();
  if (!socket) return null;

  const token = getAccessToken();
  if (token) {
    socket.auth = {
      accessToken: token,
    };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectUnifiedMessagesSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance.removeAllListeners();
    socketInstance = null;
  }
}
