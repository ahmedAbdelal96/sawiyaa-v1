import type {
  AvailabilityWindows,
  PractitionerListFilters,
  PractitionerListItem,
  PractitionerPagination,
  PractitionerProfile,
  Specialty,
} from "@/modules/practitioners/domain/practitioners.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

type SpecialtiesResponse = {
  specialties: Specialty[];
};

type PractitionersListResponse = {
  items: PractitionerListItem[];
  pagination: PractitionerPagination;
};

type PractitionerDetailsResponse = {
  item: PractitionerProfile;
};

export async function listSpecialtiesRequest() {
  const response = await httpClient.get<SpecialtiesResponse>("/specialties");
  return unwrapApiData(response.data);
}

export async function listPractitionersRequest(params: PractitionerListFilters) {
  const response = await httpClient.get<PractitionersListResponse>("/public/practitioners", {
    params,
  });
  return unwrapApiData(response.data);
}

export async function getPractitionerProfileRequest(slug: string) {
  const response = await httpClient.get<PractitionerDetailsResponse>(
    `/public/practitioners/${slug}`,
  );
  return unwrapApiData(response.data);
}

export async function getPractitionerAvailabilityWindowsRequest(
  slug: string,
  from: string,
  to: string,
) {
  const response = await httpClient.get<AvailabilityWindows>(
    `/public/practitioners/${slug}/availability/windows`,
    { params: { from, to } },
  );

  return unwrapApiData(response.data);
}
