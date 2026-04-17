import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { practitionersService } from "@/modules/practitioners/application/practitioners.service";
import { buildAvailabilityRange } from "@/modules/practitioners/lib/date";

export function usePractitionerProfile(slug: string) {
  return useQuery({
    enabled: Boolean(slug),
    queryKey: ["practitioner-profile", slug],
    queryFn: () => practitionersService.getPractitionerProfile(slug),
  });
}

export function usePractitionerAvailability(slug: string) {
  const range = useMemo(() => buildAvailabilityRange(), []);

  return useQuery({
    enabled: Boolean(slug),
    queryKey: ["practitioner-availability", slug, range.from, range.to],
    queryFn: () => practitionersService.getAvailabilityWindows(slug, range.from, range.to),
  });
}
