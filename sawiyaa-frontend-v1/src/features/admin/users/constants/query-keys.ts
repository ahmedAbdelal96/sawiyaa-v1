import type { AdminUserListQuery } from "../types/admin-users.types";

export const adminUsersQueryKeys = {
  all: ["admin-users"] as const,
  list: (query: AdminUserListQuery) =>
    [...adminUsersQueryKeys.all, "list", query.page, query.limit, query.q ?? "", query.role ?? "", query.status ?? ""] as const,
  detail: (id: string) => [...adminUsersQueryKeys.all, "detail", id] as const,
  permissionOverrides: (id: string) =>
    [...adminUsersQueryKeys.all, "permission-overrides", id] as const,
};
