import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  ListPublicPractitionerReviewsParams,
  PublicPractitionerReviewsData,
  PublicPractitionerSlugCandidatesData,
  PublicPractitionerTrustSummaryData,
} from "../types/practitioner-reviews.types";

export async function listPublicPractitionerSlugCandidates(search: string) {
  const response = await httpClient.get<ApiPayload<PublicPractitionerSlugCandidatesData>>(
    "/public/practitioners",
    {
      params: {
        search,
        page: 1,
        limit: 20,
      },
    },
  );

  return extractData(response.data);
}

export async function getPublicPractitionerTrustSummary(slug: string) {
  const response = await httpClient.get<ApiPayload<PublicPractitionerTrustSummaryData>>(
    `/public/practitioners/${slug}/trust-summary`,
  );

  return extractData(response.data);
}

export async function getPublicPractitionerReviews(
  slug: string,
  params: ListPublicPractitionerReviewsParams = {},
) {
  const response = await httpClient.get<ApiPayload<PublicPractitionerReviewsData>>(
    `/public/practitioners/${slug}/reviews`,
    {
      params: {
        page: params.page,
        limit: params.limit,
      },
    },
  );

  return extractData(response.data);
}
