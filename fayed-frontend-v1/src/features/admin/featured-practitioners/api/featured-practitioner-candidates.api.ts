import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";

export type FeaturedPractitionerCandidateItem = {
  id: string;
  slug: string;
  displayName: string | null;
  professionalTitle: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
};

type FeaturedPractitionerCandidatesListResponse = {
  items: FeaturedPractitionerCandidateItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export async function listEligibleFeaturedPractitioners(search?: string) {
  const response = await httpClient.get<
    ApiPayload<FeaturedPractitionerCandidatesListResponse>
  >("/public/practitioners", {
    params: {
      search: search?.trim() || undefined,
      page: 1,
      limit: 10,
      sort: "recommended",
    },
  });

  return extractData(response.data);
}
