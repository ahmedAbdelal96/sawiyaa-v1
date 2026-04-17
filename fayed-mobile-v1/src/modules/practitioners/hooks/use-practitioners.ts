import { useQuery } from "@tanstack/react-query";

import { practitionersService } from "@/modules/practitioners/application/practitioners.service";
import type { PractitionerListFilters } from "@/modules/practitioners/domain/practitioners.types";

export function usePractitioners(filters: PractitionerListFilters) {
  return useQuery({
    queryKey: ["practitioners", "public", filters],
    queryFn: () => practitionersService.listPractitioners(filters),
  });
}
