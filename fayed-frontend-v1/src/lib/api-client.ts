/**
 * Client-side API helper for the Sawiyaa frontend base.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/api";
import { requestSensitiveCacheClear } from "@/lib/security/sensitive-cache";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshPromise: Promise<boolean> | null = null;
let refreshFailureHandled = false;

async function refreshAccessTokenSingleFlight(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (response.ok) {
          refreshFailureHandled = false;
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const accessTokenCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sawiyaa_access_token="));

      if (accessTokenCookie && config.headers) {
        const token = accessTokenCookie.split("=")[1];
        config.headers.Authorization = `Bearer ${token}`;
      }

      const userData = document.cookie
        .split("; ")
        .find((row) => row.startsWith("sawiyaa_user_data="));

      if (userData) {
        try {
          const data = JSON.parse(decodeURIComponent(userData.split("=")[1]));
          if (data.context?.id && config.headers) {
            config.headers["X-Context-ID"] = data.context.id;
          }
        } catch {
          // Ignore malformed cookie payloads.
        }
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshed = await refreshAccessTokenSingleFlight();

        if (refreshed) {
          return apiClient(originalRequest);
        }

        if (!refreshFailureHandled && typeof window !== "undefined") {
          refreshFailureHandled = true;
          requestSensitiveCacheClear("session-expired");
          window.location.href = "/signin";
        }
      } catch (refreshError) {
        if (process.env.NODE_ENV === "development") {
          console.error("[Auth] Refresh failed:", {
            name: refreshError instanceof Error ? refreshError.name : "UnknownError",
            message:
              refreshError instanceof Error ? refreshError.message : String(refreshError),
          });
        }
        if (!refreshFailureHandled && typeof window !== "undefined") {
          refreshFailureHandled = true;
          requestSensitiveCacheClear("session-expired");
          window.location.href = "/signin";
        }
      }
    }

    return Promise.reject(error);
  }
);

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;

  const userData = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sawiyaa_user_data="));

  return !!userData;
};

export const getUserFromCookie = (): any | null => {
  if (typeof window === "undefined") return null;

  const userData = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sawiyaa_user_data="));

  if (!userData) return null;

  try {
    return JSON.parse(decodeURIComponent(userData.split("=")[1]));
  } catch {
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    if (typeof window !== "undefined") {
      requestSensitiveCacheClear("logout");
      window.location.href = "/signin";
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[Auth] Logout error:", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
      });
    }
    if (typeof window !== "undefined") {
      requestSensitiveCacheClear("logout");
      window.location.href = "/signin";
    }
  }
};

export default apiClient;
