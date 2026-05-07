/**
 * Shared HTTP client for the Fayed frontend base.
 */

import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import Cookies from "js-cookie";
import { API_CONFIG, TOKEN_CONFIG } from "./config";
import { toAppError } from "./errors";
import { USER_DATA_COOKIE, USER_ROLE_COOKIE } from "@/lib/auth/constants";

const AUTH_COOKIE_OPTIONS = {
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

const httpClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
});

let refreshPromise: Promise<boolean> | null = null;
let refreshFailureHandled = false;
const TOKEN_REFRESH_LEEWAY_SECONDS = 45;

const SENSITIVE_AUTH_PATHS = [
  "/auth/patient/login",
  "/auth/patient/register",
  "/auth/patient/google",
  "/auth/practitioner/login",
  "/auth/practitioner/login/verify-otp",
  "/auth/practitioner/register",
  "/auth/admin/login",
] as const;

function isSensitiveAuthPath(url?: string): boolean {
  if (!url) return false;

  return SENSITIVE_AUTH_PATHS.some((path) => url.includes(path));
}

function shouldMaskSensitiveAuthError(url?: string): boolean {
  return isSensitiveAuthPath(url);
}

function shouldBypassAuthRecovery(url?: string): boolean {
  return isSensitiveAuthPath(url);
}

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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    if (typeof globalThis.atob !== "function") {
      return null;
    }
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const decoded = globalThis.atob(normalized);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(token?: string): boolean {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== "number") {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp - nowInSeconds <= TOKEN_REFRESH_LEEWAY_SECONDS;
}

async function resolveFreshAccessToken(): Promise<string | undefined> {
  const currentToken = Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);

  if (!shouldRefreshAccessToken(currentToken)) {
    return currentToken;
  }

  const refreshed = await refreshAccessTokenSingleFlight();
  if (!refreshed) {
    return currentToken;
  }

  return Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
}

httpClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isFormDataPayload =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    // Let axios/browser set the multipart boundary automatically for file uploads.
    if (isFormDataPayload) {
      if (
        config.headers &&
        "set" in config.headers &&
        typeof config.headers.set === "function"
      ) {
        config.headers.set("Content-Type", undefined);
      } else if (config.headers) {
        delete (config.headers as Record<string, unknown>)["Content-Type"];
      }
    }

    const accessToken = await resolveFreshAccessToken();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    const language = Cookies.get("preferred_language") || "ar";
    config.headers["Accept-Language"] = language;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.url}`,
        config.params || config.data || ""
      );
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("[Request Error]", error);
    return Promise.reject(error);
  }
);

httpClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API] ${response.config.method?.toUpperCase()} ${response.config.url}`,
        response.status
      );
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _networkRetryCount?: number;
    };

    if (process.env.NODE_ENV === "development") {
      const shouldMask = shouldMaskSensitiveAuthError(originalRequest?.url);
      console.error(
        `[API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`,
        {
          status: error.response?.status,
          message: shouldMask
            ? "Sensitive auth error hidden"
            : (error.response?.data as { message?: string } | undefined)?.message ||
              error.message,
        }
      );
    }

    const isNetworkError = !error.response;
    const method = originalRequest?.method?.toUpperCase();
    const canRetryNetwork = isNetworkError && method === "GET";
    const networkRetryCount = originalRequest._networkRetryCount ?? 0;

    if (canRetryNetwork && networkRetryCount < 2) {
      originalRequest._networkRetryCount = networkRetryCount + 1;
      const delayMs = 400 * (networkRetryCount + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return httpClient(originalRequest);
    }

    if (shouldBypassAuthRecovery(originalRequest?.url)) {
      return Promise.reject(toAppError(error));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Use the server-side refresh route so the httpOnly refresh token cookie
        // is readable. js-cookie cannot see httpOnly cookies, so the previous
        // approach of reading the refresh token client-side always returned
        // undefined and fell through to handleLogout().
        const refreshed = await refreshAccessTokenSingleFlight();

        if (!refreshed) {
          if (!refreshFailureHandled) {
            refreshFailureHandled = true;
            handleLogout();
          }
          return Promise.reject(toAppError(error));
        }

        // The route handler has updated the access token cookie server-side.
        // The request interceptor reads it fresh on every call via Cookies.get(),
        // so just retry — no manual header injection needed.
        if (originalRequest.headers?.Authorization) {
          delete originalRequest.headers.Authorization;
        }
        return httpClient(originalRequest);
      } catch (refreshError) {
        if (!refreshFailureHandled) {
          refreshFailureHandled = true;
          handleLogout();
        }
        return Promise.reject(toAppError(refreshError));
      }
    }

    return Promise.reject(toAppError(error));
  }
);

function handleLogout(): void {
  tokenManager.clearAll();

  if (typeof window !== "undefined") {
    const locale = window.location.pathname.split("/")[1] || "ar";
    window.location.href = `/${locale}/signin`;
  }
}

export const tokenManager = {
  setTokens(accessToken: string, refreshToken?: string): void {
    Cookies.set(TOKEN_CONFIG.ACCESS_TOKEN_KEY, accessToken, {
      expires: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      ...AUTH_COOKIE_OPTIONS,
      // Top-level redirects from external payment providers need the auth
      // cookies to survive the return navigation back into the app.
    });

    if (refreshToken) {
      Cookies.set(TOKEN_CONFIG.REFRESH_TOKEN_KEY, refreshToken, {
        expires: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
        ...AUTH_COOKIE_OPTIONS,
      });
    }
  },

  getAccessToken(): string | undefined {
    return Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | undefined {
    return Cookies.get(TOKEN_CONFIG.REFRESH_TOKEN_KEY);
  },

  setContextId(contextId: string): void {
    Cookies.set(TOKEN_CONFIG.CONTEXT_ID_KEY, contextId, {
      expires: 365,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  },

  getContextId(): string | undefined {
    return Cookies.get(TOKEN_CONFIG.CONTEXT_ID_KEY);
  },

  setUser(user: any): void {
    const primaryRole =
      Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles[0] : undefined;

    Cookies.set(
      USER_DATA_COOKIE,
      JSON.stringify({
        id: user?.id ?? null,
        displayName: user?.displayName ?? null,
        roles: Array.isArray(user?.roles) ? user.roles : [],
        role: primaryRole ?? null,
        primaryEmail: user?.primaryEmail ?? null,
        practitionerProfileId: user?.practitionerProfileId ?? null,
        practitionerStatus: user?.practitionerStatus ?? null,
      }),
      {
        expires: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
        ...AUTH_COOKIE_OPTIONS,
      }
    );

    if (primaryRole) {
      Cookies.set(USER_ROLE_COOKIE, primaryRole, {
        expires: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
        ...AUTH_COOKIE_OPTIONS,
      });
    } else {
      Cookies.remove(USER_ROLE_COOKIE, { path: "/" });
    }

  },

  isAuthenticated(): boolean {
    return !!Cookies.get(TOKEN_CONFIG.ACCESS_TOKEN_KEY);
  },

  clearAll(): void {
    Cookies.remove(TOKEN_CONFIG.ACCESS_TOKEN_KEY, { path: "/" });
    Cookies.remove(TOKEN_CONFIG.REFRESH_TOKEN_KEY, { path: "/" });
    Cookies.remove(TOKEN_CONFIG.CONTEXT_ID_KEY, { path: "/" });
    Cookies.remove(USER_DATA_COOKIE, { path: "/" });
    Cookies.remove(USER_ROLE_COOKIE, { path: "/" });

  },

  logout(): void {
    handleLogout();
  },
};

export default httpClient;
