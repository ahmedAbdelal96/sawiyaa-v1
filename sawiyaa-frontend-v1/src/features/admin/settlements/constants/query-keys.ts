import type { ListAdminSettlementsParams } from "../types/admin-settlements.types";
export const adminSettlementsQueryKeys = {
  all: ["admin-settlements"] as const,
  list: (params?: ListAdminSettlementsParams) => [...adminSettlementsQueryKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...adminSettlementsQueryKeys.all, "detail", id] as const,
};
