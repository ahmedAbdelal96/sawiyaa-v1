"use client";

import { io, type Socket } from "socket.io-client";
import { API_CONFIG } from "@/lib/api/config";
import { tokenManager } from "@/lib/api/http-client";

let socketInstance: Socket | null = null;

function resolveSocketBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  // In dev, Next.js rewrites do not reliably proxy Socket.IO websocket upgrades.
  // Allow an explicit socket origin so realtime can connect directly to the backend.
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

export function getGeneralChatSocket() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(`${resolveSocketBaseUrl()}/chat`, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true,
      path: "/socket.io",
    });
  }

  return socketInstance;
}

export function ensureGeneralChatSocketConnected() {
  const socket = getGeneralChatSocket();
  if (!socket) return null;

  // Keep auth payload fresh even if we are already connected (it is used on reconnect).
  socket.auth = {
    token: tokenManager.getAccessToken(),
  };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}
