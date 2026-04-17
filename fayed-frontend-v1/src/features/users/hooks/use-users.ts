import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  patchCurrentUserProfile,
  getCurrentUser,
  getCurrentUserRoles,
  getCurrentUserSecurityState,
  removeCurrentUserAvatar,
  uploadCurrentUserAvatar,
} from "../api/users.api";
import { usersQueryKeys } from "../constants/query-keys";

/**
 * Query for /users/me.
 * Kept moderately fresh since profile links/roles can affect layout and redirects.
 */
export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.me(),
    queryFn: getCurrentUser,
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Query for /users/me/roles.
 * Separated from summary to allow small role-only consumers.
 */
export function useCurrentUserRoles(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.meRoles(),
    queryFn: getCurrentUserRoles,
    enabled,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Query for /users/me/security-state.
 * Retried less aggressively because auth/security errors are often deterministic.
 */
export function useCurrentUserSecurityState(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.meSecurityState(),
    queryFn: getCurrentUserSecurityState,
    enabled,
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    retry: false,
  });
}

export function usePatchCurrentUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchCurrentUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
    },
  });
}

export function useUploadCurrentUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadCurrentUserAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
    },
  });
}

export function useRemoveCurrentUserAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCurrentUserAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() });
    },
  });
}
