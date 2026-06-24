"use client";

import { useQuery } from "@tanstack/react-query";
import { adminUsersQueryKeys } from "../constants/query-keys";
import {
  getAdminUser,
  getAdminUserPermissionOverrides,
  listAdminUsers,
} from "../api/admin-users.api";
import type { AdminUserListQuery } from "../types/admin-users.types";

export function useAdminUsersList(query: AdminUserListQuery, enabled = true) {
  return useQuery({
    queryKey: adminUsersQueryKeys.list(query),
    queryFn: () => listAdminUsers(query),
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

export function useAdminUser(id: string, enabled = true) {
  return useQuery({
    queryKey: adminUsersQueryKeys.detail(id),
    queryFn: () => getAdminUser(id),
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

export function useAdminUserPermissionOverrides(id: string, enabled = true) {
  return useQuery({
    queryKey: adminUsersQueryKeys.permissionOverrides(id),
    queryFn: () => getAdminUserPermissionOverrides(id),
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
}
