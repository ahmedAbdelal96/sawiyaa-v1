import { useQuery } from "@tanstack/react-query";

import { journeyService } from "@/modules/journey/application/journey.service";

export function useJourneySummary() {
  return useQuery({
    queryKey: ["journey", "summary"],
    queryFn: journeyService.getSummary,
  });
}

