import {
  getPractitionerAvailabilityWindowsRequest,
  getPractitionerProfileRequest,
  listPractitionersRequest,
  listSpecialtiesRequest,
} from "@/modules/practitioners/api/practitioners.api";
import {
  mapPractitionerListItem,
  mapPractitionerProfile,
  mapSpecialty,
} from "@/modules/practitioners/api/practitioners.mappers";
import type { PractitionerListFilters } from "@/modules/practitioners/domain/practitioners.types";

export const practitionersService = {
  async listSpecialties() {
    const response = await listSpecialtiesRequest();
    return response.specialties.map(mapSpecialty);
  },

  async listPractitioners(filters: PractitionerListFilters) {
    const response = await listPractitionersRequest(filters);

    return {
      items: response.items.map(mapPractitionerListItem),
      pagination: response.pagination,
    };
  },

  async getPractitionerProfile(slug: string) {
    const response = await getPractitionerProfileRequest(slug);
    return mapPractitionerProfile(response.item);
  },

  async getAvailabilityWindows(slug: string, from: string, to: string) {
    return getPractitionerAvailabilityWindowsRequest(slug, from, to);
  },
};
