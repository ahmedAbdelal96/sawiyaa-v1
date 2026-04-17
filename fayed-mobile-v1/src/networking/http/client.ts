import axios from "axios";

import { getCachedTokens } from "@/auth/storage/token-cache";
import { env } from "@/core/env";
import { normalizeApiError } from "@/core/errors/normalize-api-error";
import { authExemptRoutes } from "@/networking/http/constants";
import { getFreshAccessToken } from "@/networking/http/refresh-controller";

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

httpClient.interceptors.request.use(async (config) => {
  const tokens = getCachedTokens();

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  config.headers["Accept-Language"] = env.defaultLocale;

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !authExemptRoutes.some((path) => originalRequest.url?.includes(path))
    ) {
      originalRequest._retry = true;

      try {
        const freshAccessToken = await getFreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${freshAccessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        return Promise.reject(normalizeApiError(refreshError));
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

