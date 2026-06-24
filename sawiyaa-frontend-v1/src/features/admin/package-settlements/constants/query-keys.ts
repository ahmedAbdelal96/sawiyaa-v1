import type { ListAdminPackageSettlementsParams } from "../types/admin-package-settlements.types";

export const adminPackageSettlementsQueryKeys = {
  all: ["admin-package-settlements"] as const,
  list: (params?: ListAdminPackageSettlementsParams) =>
    [...adminPackageSettlementsQueryKeys.all, "list", params ?? {}] as const,
  details: (id: string) => [...adminPackageSettlementsQueryKeys.all, "detail", id] as const,
};
