import { useQuery } from "@tanstack/react-query";
import {
  getAdminFinanceOperationEvent,
  listAdminFinanceOperationEvents,
} from "../api/admin-finance-operations.api";
import { adminFinanceOperationsQueryKeys } from "../constants/query-keys";
import type { ListAdminFinanceOperationEventsParams } from "../types/admin-finance-operations.types";

export function useAdminFinanceOperationEvents(
  params: ListAdminFinanceOperationEventsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminFinanceOperationsQueryKeys.list(params),
    queryFn: () => listAdminFinanceOperationEvents(params),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminFinanceOperationEvent(eventId?: string) {
  return useQuery({
    queryKey: adminFinanceOperationsQueryKeys.detail(eventId ?? ""),
    queryFn: () => getAdminFinanceOperationEvent(eventId as string),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}
