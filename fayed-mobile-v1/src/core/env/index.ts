import Constants from "expo-constants";

function resolveDefaultApiBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];

  if (host) {
    return `http://${host}:7000/api/v1`;
  }

  return "http://127.0.0.1:7000/api/v1";
}

export const env = {
  apiBaseUrl: resolveDefaultApiBaseUrl(),
  defaultLocale: process.env.EXPO_PUBLIC_DEFAULT_LOCALE?.trim() || "ar",
  enableJourneyMock: process.env.EXPO_PUBLIC_ENABLE_JOURNEY_MOCK === "true",
} as const;
