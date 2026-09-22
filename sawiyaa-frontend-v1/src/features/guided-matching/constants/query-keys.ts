export const guidedMatchingQueryKeys = {
  all: ["guided-matching"] as const,
  detail: (sessionId: string, locale = "ar") =>
    [...guidedMatchingQueryKeys.all, "detail", sessionId, locale] as const,
};
