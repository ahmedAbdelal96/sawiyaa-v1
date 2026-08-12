import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import i18n from "../i18n";
import { MOBILE_API_URL } from "../config/mobile-environment";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type ApiAuthSessionHandlers = {
  refreshAccessToken: () => Promise<string | null>;
  onAuthFailure: () => Promise<void>;
};

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let apiAuthSessionHandlers: ApiAuthSessionHandlers | null = null;
let refreshAccessTokenPromise: Promise<string | null> | null = null;
let authFailurePromise: Promise<void> | null = null;

export const apiClient = axios.create({
  baseURL: MOBILE_API_URL,
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

function shouldSkipAuthRefresh(url?: string) {
  if (!url) {
    return false;
  }

  return [
    "/auth/patient/login",
    "/auth/patient/register",
    "/auth/patient/google",
    "/auth/patient/refresh",
    "/auth/patient/logout",
    "/auth/practitioner/login",
    "/auth/practitioner/register",
    "/auth/practitioner/register/verify-otp",
    "/auth/practitioner/register/resend-otp",
    "/auth/practitioner/login/verify-otp",
    "/auth/practitioner/refresh",
    "/auth/practitioner/logout",
    "/auth/practitioner/forgot-password",
    "/auth/practitioner/reset-password",
  ].some((path) => url.includes(path));
}

function hasAuthorizationHeader(config: RetriableRequestConfig) {
  const headerToken =
    config.headers?.Authorization ??
    config.headers?.authorization ??
    apiClient.defaults.headers.common.Authorization;

  return Boolean(headerToken);
}

async function triggerAuthFailure() {
  if (!apiAuthSessionHandlers) {
    return;
  }

  if (!authFailurePromise) {
    authFailurePromise = apiAuthSessionHandlers.onAuthFailure().finally(() => {
      authFailurePromise = null;
    });
  }

  await authFailurePromise;
}

function refreshAccessTokenSingleFlight() {
  if (!apiAuthSessionHandlers) {
    return Promise.resolve(null);
  }

  if (!refreshAccessTokenPromise) {
    const nextRefreshPromise = apiAuthSessionHandlers
      .refreshAccessToken()
      .finally(() => {
        if (refreshAccessTokenPromise === nextRefreshPromise) {
          refreshAccessTokenPromise = null;
        }
      });

    refreshAccessTokenPromise = nextRefreshPromise;
  }

  return refreshAccessTokenPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      !apiAuthSessionHandlers ||
      shouldSkipAuthRefresh(originalRequest.url) ||
      !hasAuthorizationHeader(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const nextAccessToken = await refreshAccessTokenSingleFlight();

      if (!nextAccessToken) {
        await triggerAuthFailure();
        return Promise.reject(error);
      }

      originalRequest.headers = originalRequest.headers ?? {};
      delete originalRequest.headers.Authorization;
      delete originalRequest.headers.authorization;
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      await triggerAuthFailure();
      return Promise.reject(refreshError);
    }
  },
);

export function configureApiAuthSessionHandlers(
  handlers: ApiAuthSessionHandlers | null,
) {
  apiAuthSessionHandlers = handlers;
}

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

export function extractApiErrorCode(error: unknown): string | null {
  if (!(error instanceof AxiosError)) return null;

  const payload = error.response?.data as
    | { errorCode?: unknown; error?: unknown }
    | undefined;
  if (typeof payload?.errorCode === "string") return payload.errorCode;
  if (typeof payload?.error === "string") return payload.error;
  return null;
}

export function extractApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 401) {
      const payload = error.response?.data as
        | {
            message?: string | string[];
            error?: string;
            data?: { message?: string };
          }
        | undefined;
      const rawMessage =
        typeof payload?.data?.message === "string"
          ? payload.data.message
          : typeof payload?.message === "string"
            ? payload.message
            : Array.isArray(payload?.message)
              ? String(payload.message[0] ?? "")
              : typeof payload?.error === "string"
                ? payload.error
                : error.message;
      const normalizedRawMessage = rawMessage.trim().toLowerCase();
      const isRawAuthMessage =
        !normalizedRawMessage ||
        normalizedRawMessage === "unauthorized" ||
        normalizedRawMessage === "unauthorized exception" ||
        normalizedRawMessage.includes("jwt") ||
        normalizedRawMessage.includes("token");

      if (isRawAuthMessage) {
        return i18n.language?.startsWith("ar")
          ? "انتهت صلاحية الجلسة. سجّل الدخول مرة أخرى."
          : "Your session has expired. Please sign in again.";
      }
    }

    const payload = error.response?.data as
      | {
          message?: string | string[];
          error?: string;
          errorCode?: string;
          data?: { message?: string };
        }
      | undefined;
    const errorCode =
      typeof payload?.errorCode === "string"
        ? payload.errorCode
        : typeof payload?.error === "string"
          ? payload.error
          : null;

    if (errorCode === "ACADEMY_LEARNER_ENROLLMENT_RESTRICTED") {
      return i18n.language?.startsWith("ar")
        ? "Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„Ø¥Ø¯Ø§Ø±Ø© Ù„Ø§ ÙŠÙ…ÙƒÙ†Ù‡Ø§ Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙƒØ¯Ø§Ø±Ø³. Ø§Ø³ØªØ®Ø¯Ù… Ø­Ø³Ø§Ø¨ Ù…Ø±ÙŠØ¶ Ø£Ùˆ Ù…Ø®ØªØµ Ø£Ùˆ Ø¯Ø§Ø±Ø³ Ù…Ù†ÙØµÙ„."
        : "Admin accounts cannot enroll as learners. Please use a patient, practitioner, or learner account.";
    }

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
