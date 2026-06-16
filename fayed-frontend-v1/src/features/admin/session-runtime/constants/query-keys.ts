export const adminSessionRuntimeQueryKeys = {
  all: ["admin-session-runtime"] as const,
  detail: (sessionId: string) => [...adminSessionRuntimeQueryKeys.all, sessionId] as const,
  attendance: (sessionId: string) =>
    [...adminSessionRuntimeQueryKeys.all, "attendance", sessionId] as const,
  manualDecisions: (sessionId: string) =>
    [...adminSessionRuntimeQueryKeys.all, "manual-decisions", sessionId] as const,
};
