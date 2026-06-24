export const adminAuditQueryKeys = {
  all: ["admin-audit"] as const,
  list: (params: Record<string, unknown>) =>
    [...adminAuditQueryKeys.all, "list", params] as const,
  details: (eventId: string) =>
    [...adminAuditQueryKeys.all, "details", eventId] as const,
};
