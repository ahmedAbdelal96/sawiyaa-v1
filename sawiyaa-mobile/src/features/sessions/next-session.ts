import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiData } from "../../lib/api";
import { useAuthenticatedQueryEnabled } from "../auth/query-auth";

export type MobileNextSession = {
  sessionId: string;
  role: "PATIENT" | "PRACTITIONER";
  counterpart: { displayName: string | null; avatarUrl: string | null };
  startsAt: string;
  scheduledEndAt: string;
  durationMinutes: number;
  displayTimezone: string;
  status: string;
  joinAvailable: boolean;
  joinAvailableAt: string | null;
  joinExpiresAt: string | null;
  detailsRoute: string;
  joinRoute: string;
};

async function getMyNextSession() {
  const response = await apiClient.get("/users/me/next-session");
  return extractApiData<MobileNextSession | null>(response);
}

export function useMyNextSession() {
  const enabled = useAuthenticatedQueryEnabled();
  return useQuery({
    queryKey: ["my-next-session"],
    queryFn: getMyNextSession,
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}
