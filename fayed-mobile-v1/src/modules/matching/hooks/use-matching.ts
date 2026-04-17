import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { routes } from "@/core/constants/routes";
import { matchingService } from "@/modules/matching/application/matching.service";
import type { MatchingCreateInput } from "@/modules/matching/domain/matching.types";

export function useCreateMatchingSession() {
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: MatchingCreateInput) => matchingService.createSession(payload),
    onSuccess: (result) => {
      router.push(routes.app.matchingResult(result.sessionId));
    },
  });
}

export function useMatchingSession(sessionId: string) {
  return useQuery({
    enabled: Boolean(sessionId),
    queryKey: ["matching-session", sessionId],
    queryFn: () => matchingService.getSession(sessionId),
  });
}
