import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api";
import { CreateMatchingSessionRequest, MatchingSessionEnvelope } from "./types";

export const useCreateMatchingSession = () => {
  return useMutation({
    mutationFn: async (data: CreateMatchingSessionRequest) => {
      const response = await apiClient.post<MatchingSessionEnvelope>(
        "/matching/sessions",
        data,
      );
      return response.data;
    },
  });
};

export const useGetMatchingSession = (sessionId: string | null) => {
  return useQuery({
    queryKey: ["matching-session", sessionId],
    queryFn: async () => {
      const response = await apiClient.get<MatchingSessionEnvelope>(
        `/matching/sessions/${sessionId}`,
      );
      return response.data;
    },
    enabled: !!sessionId,
  });
};
