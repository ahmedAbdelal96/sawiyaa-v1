"use client";

import { io, type Socket } from "socket.io-client";
import { API_CONFIG } from "@/lib/api/config";
import { tokenManager } from "@/lib/api/http-client";

let socketInstance: Socket | null = null;

function resolveSocketBaseUrl() {
  if (typeof window === "undefined") return "";

  const explicit = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL;
  if (explicit?.trim()) {
    try {
      return new URL(explicit).origin;
    } catch {
      // Use the configured API origin below.
    }
  }

  const configured = API_CONFIG.baseURL;
  if (configured?.startsWith("http://") || configured?.startsWith("https://")) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall back to the current browser origin.
    }
  }

  return window.location.origin;
}

export function getNotificationSocket() {
  if (typeof window === "undefined") return null;

  if (!socketInstance) {
    socketInstance = io(`${resolveSocketBaseUrl()}/notifications`, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      path: "/socket.io",
    });
  }

  return socketInstance;
}

export function ensureNotificationSocketConnected() {
  const socket = getNotificationSocket();
  const token = tokenManager.getAccessToken();
  if (!socket || !token) return null;

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
