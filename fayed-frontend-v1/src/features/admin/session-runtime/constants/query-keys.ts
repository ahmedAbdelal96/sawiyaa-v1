export const adminSessionRuntimeQueryKeys = {
  all: ["admin-session-runtime"] as const,
  detail: (sessionId: string) => [...adminSessionRuntimeQueryKeys.all, sessionId] as const,
  attendance: (sessionId: string) =>
    [...adminSessionRuntimeQueryKeys.all, "attendance", sessionId] as const,
};
