import type { ListAdminFinanceOperationEventsParams } from "../types/admin-finance-operations.types";

export const adminFinanceOperationsQueryKeys = {
  all: ["admin-finance-operations"] as const,
  events: () => [...adminFinanceOperationsQueryKeys.all, "events"] as const,
  list: (params: ListAdminFinanceOperationEventsParams = {}) =>
    [...adminFinanceOperationsQueryKeys.events(), params] as const,
  detail: (eventId: string) =>
    [...adminFinanceOperationsQueryKeys.all, "event", eventId] as const,
};
