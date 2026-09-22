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
  detailsRoute: string;
  joinRoute: string;
  operational: {
    state: string;
    reasonCode: string;
    join: { allowed: boolean; reasonCode: string | null; canPrepareRuntime: boolean; opensAt: string | null; closesAt: string | null };
    actions: { canJoin: boolean; canPrepareRuntime: boolean; canCancel: boolean; canPay: boolean; canReview: boolean; canMarkPatientNoShow: boolean; noShowReasonCode: string | null };
    room: { state: "NOT_APPLICABLE" | "OPEN" | "CLOSED" | "NOT_PREPARED"; closedAt: string | null };
    resolution: { required: boolean; finalDecision: string | null };
  };
};

async function getMyNextSession() {
  const response = await apiClient.get("/users/me/next-session");
  const session = extractApiData<MobileNextSession | null>(response);

  if (!session) return null;

  // The shared API contract contains localized Web routes. Mobile owns the
  // route group for this screen, so keep navigation on the native session
  // detail surface while preserving the Backend-owned action state above.
  const mobileRoute = `/(patient)/sessions/${session.sessionId}`;
  return {
    ...session,
    detailsRoute: mobileRoute,
    joinRoute: mobileRoute,
  };
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
