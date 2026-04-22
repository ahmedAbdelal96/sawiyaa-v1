import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { getPractitionerProfile } from "./api";

export const practitionerProfileQueryKeys = {
  all: ["practitioner-profile"] as const,
  me: () => [...practitionerProfileQueryKeys.all, "me"] as const,
};

export function usePractitionerProfile(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");

  return useQuery({
    queryKey: practitionerProfileQueryKeys.me(),
    queryFn: getPractitionerProfile,
    enabled: enabled && authEnabled,
    staleTime: 60_000,
  });
}
