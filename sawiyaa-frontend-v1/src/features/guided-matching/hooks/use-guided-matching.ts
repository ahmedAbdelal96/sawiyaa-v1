import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientJourneyQueryKeys } from "@/features/patient-journey/constants/query-keys";
import {
  createMatchingSession,
  getMatchingSession,
} from "../api/guided-matching.api";
import { guidedMatchingQueryKeys } from "../constants/query-keys";

export function useCreateMatchingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMatchingSession,
    onSuccess: (session) => {
      queryClient.setQueryData(
        guidedMatchingQueryKeys.detail(session.sessionId),
        session,
      );
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.all });
    },
  });
}

export function useMatchingSession(sessionId: string | null) {
  return useQuery({
    queryKey: guidedMatchingQueryKeys.detail(sessionId ?? ""),
    queryFn: () => getMatchingSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
  });
}
