export const guidedMatchingQueryKeys = {
  all: ["guided-matching"] as const,
  detail: (sessionId: string) =>
    [...guidedMatchingQueryKeys.all, "detail", sessionId] as const,
};
