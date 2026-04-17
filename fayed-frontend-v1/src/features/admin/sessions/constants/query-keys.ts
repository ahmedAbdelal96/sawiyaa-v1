import type { ListAdminSessionsParams } from "../types/admin-sessions.types";

export const adminSessionsQueryKeys = {
  all: ["admin-sessions"] as const,
  list: (params: ListAdminSessionsParams = {}) => [...adminSessionsQueryKeys.all, params] as const,
};

