import type {
  ListAdminSessionsParams,
  SessionCancellationBookingType,
} from "../types/admin-sessions.types";

export const adminSessionsQueryKeys = {
  all: ["admin-sessions"] as const,
  list: (params: ListAdminSessionsParams = {}) => [...adminSessionsQueryKeys.all, params] as const,
  cancellationPolicies: () => [...adminSessionsQueryKeys.all, "cancellation-policies"] as const,
  cancellationPolicy: (bookingType: SessionCancellationBookingType) =>
    [...adminSessionsQueryKeys.cancellationPolicies(), bookingType] as const,
};
