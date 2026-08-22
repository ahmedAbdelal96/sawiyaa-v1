import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api";
import { useTranslation } from "react-i18next";
import { CreateMatchingSessionRequest, MatchingSessionEnvelope } from "./types";
import { matchingSessionQueryKey } from "./query-keys";

export { matchingSessionQueryKey } from "./query-keys";

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
  const { i18n } = useTranslation();
  const locale = i18n.language?.startsWith("ar") ? "ar" : "en";

  return useQuery({
    queryKey: matchingSessionQueryKey(sessionId, locale),
    queryFn: async () => {
      const response = await apiClient.get<MatchingSessionEnvelope>(
        `/matching/sessions/${sessionId}`,
      );
      return response.data;
    },
    enabled: !!sessionId,
  });
};
