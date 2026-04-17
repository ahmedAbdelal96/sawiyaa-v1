import { useQuery } from "@tanstack/react-query";

import { practitionersService } from "@/modules/practitioners/application/practitioners.service";

export function useSpecialties() {
  return useQuery({
    queryKey: ["specialties", "public"],
    queryFn: () => practitionersService.listSpecialties(),
    staleTime: 5 * 60 * 1000,
  });
}
