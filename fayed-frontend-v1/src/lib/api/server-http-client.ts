import axios, { AxiosInstance } from "axios";
import { headers } from "next/headers";
import { API_BASE_URL } from "@/config/api";
import type { ApiPayload } from "./contracts";
import { toAppError } from "./errors";
import { extractData } from "./response";

export type ServerHttpRequestOptions = {
  locale?: string;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
};

/**
 * Creates a server-safe Axios client for Next.js server components/actions.
 * This client never imports browser-only dependencies (cookies/localStorage).
 */
export async function createServerHttpClient(
  locale?: string,
  timeoutMs = 30000,
): Promise<AxiosInstance> {
  const resolveServerBaseUrl = async () => {
    if (/^https?:\/\//i.test(API_BASE_URL)) return API_BASE_URL;

    const normalizedPath = API_BASE_URL.startsWith("/") ? API_BASE_URL : `/${API_BASE_URL}`;

    // On the server, axios requires an absolute baseURL. Build it from request headers when possible.
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
  };

  return axios.create({
    baseURL: await resolveServerBaseUrl(),
    timeout: timeoutMs,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(locale ? { "Accept-Language": locale } : {}),
    },
  });
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
    const client = await createServerHttpClient(options.locale, options.timeoutMs);
    const response = await client.get<ApiPayload<T>>(path, {
      params: options.params,
    });
    return extractData(response.data);
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
