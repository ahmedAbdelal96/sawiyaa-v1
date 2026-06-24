import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listAdminSessionCancellationPolicies,
  listAdminSessions,
  updateAdminSessionCancellationPolicy,
} from "../api/admin-sessions.api";
import { adminSessionsQueryKeys } from "../constants/query-keys";
import type {
  ListAdminSessionsParams,
  SessionCancellationBookingType,
  UpdateSessionCancellationPolicyInput,
} from "../types/admin-sessions.types";
import { useSessionRole } from "@/lib/auth/use-session-role";
import { isAdminRole } from "@/lib/auth/roles";

export function useAdminSessions(
  params: ListAdminSessionsParams,
  options?: { enabled?: boolean },
) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminSessionsQueryKeys.list(params),
    queryFn: () => listAdminSessions(params),
    enabled: isAdminRole(role) && (options?.enabled ?? true),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useAdminSessionCancellationPolicies(options?: { enabled?: boolean }) {
  const role = useSessionRole();
  return useQuery({
    queryKey: adminSessionsQueryKeys.cancellationPolicies(),
    queryFn: listAdminSessionCancellationPolicies,
    enabled: isAdminRole(role) && (options?.enabled ?? true),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

export function useUpdateAdminSessionCancellationPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingType,
      body,
    }: {
      bookingType: SessionCancellationBookingType;
      body: UpdateSessionCancellationPolicyInput;
    }) => updateAdminSessionCancellationPolicy(bookingType, body),
    onSuccess: (item) => {
      queryClient.invalidateQueries({
        queryKey: adminSessionsQueryKeys.cancellationPolicies(),
      });
      queryClient.setQueryData(
        adminSessionsQueryKeys.cancellationPolicy(item.bookingType),
        item,
      );
    },
  });
}
