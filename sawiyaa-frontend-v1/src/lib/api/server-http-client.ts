import { headers } from "next/headers";
import { API_BASE_URL } from "@/config/api";
import { getAccessToken } from "@/lib/auth/server";
import type { ApiPayload } from "./contracts";
import { toAppError } from "./errors";
import { extractData } from "./response";

export type ServerHttpRequestOptions = {
  locale?: string;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
};

async function resolveServerBaseUrl(): Promise<string> {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return API_BASE_URL;
  }

  const normalizedPath = API_BASE_URL.startsWith("/")
    ? API_BASE_URL
    : `/${API_BASE_URL}`;

  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) return `${proto}://${host}${normalizedPath}`;
  } catch {
    // No request context available (very early init / tests). Fall back to env.
  }

  const envOrigin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);

  if (envOrigin) return `${envOrigin}${normalizedPath}`;
  return `http://localhost:3000${normalizedPath}`;
}

function appendParams(url: URL, params?: ServerHttpRequestOptions["params"]): void {
  if (!params) return;

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
}

function buildRequestUrl(baseUrl: string, endpoint: string): URL {
  const url = new URL(baseUrl);
  const basePath = url.pathname.endsWith("/")
    ? url.pathname.slice(0, -1)
    : url.pathname;
  const requestPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  url.pathname = `${basePath}${requestPath}`;
  return url;
}

async function fetchJson<T>(
  endpoint: string,
  options: ServerHttpRequestOptions = {},
): Promise<T> {
  const baseUrl = await resolveServerBaseUrl();
  const requestUrl = buildRequestUrl(baseUrl, endpoint);
  appendParams(requestUrl, options.params);
  const accessToken = await getAccessToken();

  let trustedCountryHeaders: Record<string, string> = {};
  try {
    const requestHeaders = await headers();
    const cfCountry = requestHeaders.get("cf-ipcountry");
    const vercelCountry = requestHeaders.get("x-vercel-ip-country");
    trustedCountryHeaders = {
      ...(cfCountry ? { "cf-ipcountry": cfCountry } : {}),
      ...(vercelCountry ? { "x-vercel-ip-country": vercelCountry } : {}),
    };
  } catch {
    // No request context available. Keep public fallback behavior.
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 30000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.locale ? { "Accept-Language": options.locale } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...trustedCountryHeaders,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message ||
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error("Request timed out");
      timeoutError.name = "TimeoutError";
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Shared server-side GET helper that unwraps the API envelope and normalizes
 * Axios errors to include HTTP status for ergonomic SSR 404 handling.
 */
export async function serverGet<T>(
  path: string,
  options: ServerHttpRequestOptions = {},
): Promise<T> {
  try {
    const response = await fetchJson<ApiPayload<T>>(path, options);
    return extractData(response);
  } catch (error) {
    throw toAppError(error, {
      requestPath: path,
      diagnostics: {
        locale: options.locale ?? null,
        timeoutMs: options.timeoutMs ?? null,
        params: options.params ?? null,
        client: "server-http-client",
      },
    });
  }
}
