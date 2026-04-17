import axios, { AxiosInstance } from "axios";
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
export function createServerHttpClient(locale?: string, timeoutMs = 30000): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
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
    const client = createServerHttpClient(options.locale, options.timeoutMs);
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
