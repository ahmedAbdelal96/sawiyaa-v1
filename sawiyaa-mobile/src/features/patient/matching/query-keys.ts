export const matchingSessionQueryKey = (
  sessionId: string | null,
  locale: "ar" | "en",
) => ["matching-session", sessionId, locale] as const;
