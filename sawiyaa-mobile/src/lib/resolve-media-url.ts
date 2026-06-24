import { Platform } from "react-native";
import { apiClient } from "./api";

export function resolveMediaUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (
        Platform.OS === "web" &&
        parsed.hostname === "files.local"
      ) {
        return null;
      }
    } catch {
      return trimmed;
    }

    return trimmed;
  }

  const normalized = trimmed.startsWith("/api/v1/")
    ? trimmed.slice("/api/v1".length)
    : trimmed;
  const baseUrl = apiClient.defaults.baseURL?.replace(/\/+$/, "");

  if (!baseUrl) {
    return normalized;
  }

  return normalized.startsWith("/")
    ? `${baseUrl}${normalized}`
    : `${baseUrl}/${normalized}`;
}
