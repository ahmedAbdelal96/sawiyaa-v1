import { getAccessToken, refreshAccessToken } from "@/lib/auth/server";
import { API_BASE_URL } from "@/config/api";
import { AppError, toAppError } from "@/lib/api/errors";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function serverFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...restOptions } = options;

  try {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const requestHeaders = new Headers(headers);
    if (!requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/json");
    }

    if (!skipAuth) {
      const accessToken = await getAccessToken();
      if (accessToken) {
        requestHeaders.set("Authorization", `Bearer ${accessToken}`);
      }
    }

    let response = await fetch(url, {
      ...restOptions,
      headers: requestHeaders,
    });

    if (response.status === 401 && !skipAuth) {
      const refreshSuccess = await refreshAccessToken();

      if (refreshSuccess) {
        const newAccessToken = await getAccessToken();
        if (newAccessToken) {
          requestHeaders.set("Authorization", `Bearer ${newAccessToken}`);
        }

        response = await fetch(url, {
          ...restOptions,
          headers: requestHeaders,
        });
      } else {
        throw new AppError({
          message: "Unauthorized: Session expired",
          statusCode: 401,
          code: "SESSION_EXPIRED",
          errorType: "UNAUTHORIZED",
          requestPath: endpoint,
          diagnostics: {
            client: "server-api-client",
            skipAuth,
          },
        });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError({
        message:
          (errorData as { message?: string }).message ||
          `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        code: (errorData as { error?: string }).error,
        details: (errorData as { details?: Record<string, unknown> }).details,
        requestPath: endpoint,
        diagnostics: {
          client: "server-api-client",
          skipAuth,
        },
      });
    }

    return response.json();
  } catch (error) {
    throw toAppError(error, {
      requestPath: endpoint,
      diagnostics: {
        client: "server-api-client",
        skipAuth,
      },
    });
  }
}

export const serverApi = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    serverFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    serverFetch<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    serverFetch<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    serverFetch<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    serverFetch<T>(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Server-side helper: fetch resolved permission keys for the current user.
 *
 * Safe to call from Next.js Server Components and server actions.
 * Uses httpOnly auth cookies via serverFetch — no token exposure.
 * Returns [] on any error (unauthenticated, network, etc.) so callers
 * can fall back gracefully without crashing the render.
 */
export async function getServerCurrentUserPermissions(): Promise<string[]> {
  try {
    const envelope = await serverApi.get<{
      success: boolean;
      data: { userId: string; permissions: string[] };
    }>("/users/me/permissions", {
      cache: "no-store",
    });
    return envelope?.data?.permissions ?? [];
  } catch {
    return [];
  }
}
