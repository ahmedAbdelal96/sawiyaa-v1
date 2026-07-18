"use client";

import { io, type Socket } from "socket.io-client";
import { API_CONFIG } from "@/lib/api/config";
import { tokenManager } from "@/lib/api/http-client";

let socketInstance: Socket | null = null;

function resolveSocketBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const explicit = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL;
  if (explicit && explicit.trim().length > 0) {
    try {
      return new URL(explicit).origin;
    } catch {
      // fall through
    }
  }

  const configured = API_CONFIG.baseURL;
  if (!configured) {
    return window.location.origin;
  }

  if (configured.startsWith("http://") || configured.startsWith("https://")) {
    try {
      return new URL(configured).origin;
    } catch {
      return window.location.origin;
    }
  }

  return window.location.origin;
}

export function getUnifiedMessagesSocket() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(`${resolveSocketBaseUrl()}/messages`, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      path: "/socket.io",
    });
  }

  return socketInstance;
}

export function ensureUnifiedMessagesSocketConnected() {
  const socket = getUnifiedMessagesSocket();
  if (!socket) return null;

  socket.auth = {
    accessToken: tokenManager.getAccessToken(),
  };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}
