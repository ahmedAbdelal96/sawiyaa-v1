import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { patientJourneyQueryKeys } from "@/features/patient-journey/constants/query-keys";
import {
  createMatchingSession,
  getMatchingSession,
} from "../api/guided-matching.api";
import { guidedMatchingQueryKeys } from "../constants/query-keys";

export function useCreateMatchingSession() {
  const queryClient = useQueryClient();
  const locale = useLocale().startsWith("ar") ? "ar" : "en";

  return useMutation({
    mutationFn: createMatchingSession,
    onSuccess: (session) => {
      queryClient.setQueryData(
        guidedMatchingQueryKeys.detail(session.sessionId, locale),
        session,
      );
      queryClient.invalidateQueries({ queryKey: patientJourneyQueryKeys.all });
    },
  });
}

export function useMatchingSession(sessionId: string | null) {
  const locale = useLocale().startsWith("ar") ? "ar" : "en";

  return useQuery({
    queryKey: guidedMatchingQueryKeys.detail(sessionId ?? "", locale),
    queryFn: () => getMatchingSession(sessionId!),
    enabled: Boolean(sessionId),
    staleTime: 30_000,
  });
}
