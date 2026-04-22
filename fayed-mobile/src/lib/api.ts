import axios, { AxiosError, AxiosResponse } from "axios";
import { Platform } from "react-native";
import i18n from "../i18n";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

function resolveBaseUrl() {
  const publicEnv = process.env as Record<string, string | undefined>;
  const configured = publicEnv.EXPO_PUBLIC_API_URL?.trim();
  if (configured) {
    return configured;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:7000/api/v1";
  }

  return "http://localhost:7000/api/v1";
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  config.headers["x-lang"] = i18n.language?.startsWith("ar") ? "ar" : "en";
  return config;
});

export function setApiAccessToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
}

export function extractApiData<T>(response: AxiosResponse<ApiEnvelope<T>>) {
  return response.data.data;
}

export function extractApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as
      | {
          message?: string | string[];
          error?: string;
          data?: { message?: string };
        }
      | undefined;

    if (
      typeof payload?.data?.message === "string" &&
      payload.data.message.trim()
    ) {
      return payload.data.message;
    }

    if (typeof payload?.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload?.message) && payload.message[0]) {
      return String(payload.message[0]);
    }

    if (typeof payload?.error === "string" && payload.error.trim()) {
      return payload.error;
    }

    if (error.code === "ECONNABORTED") {
      return "Request timed out.";
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unexpected error. Please try again.";
}
