import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  PackagePlansQuery,
  PatientPackagePlanQuoteRequest,
  PatientPackagePlanQuoteResponseData,
  PublicPackagePlansResponseData,
} from "../types/package-plans.types";

export const PACKAGE_PLANS_ROUTES = {
  publicByPractitionerSlug: (slug: string) => `/public/practitioners/${slug}/package-plans`,
  patientQuote: "/patients/me/package-purchases/quote",
} as const;

export async function fetchPublicPractitionerPackagePlans(
  practitionerSlug: string,
  params?: PackagePlansQuery,
): Promise<PublicPackagePlansResponseData> {
  const response = await httpClient.get<ApiPayload<PublicPackagePlansResponseData>>(
    PACKAGE_PLANS_ROUTES.publicByPractitionerSlug(practitionerSlug),
    { params },
  );
  return extractData(response.data);
}

export async function quotePatientPackagePlan(
  input: PatientPackagePlanQuoteRequest,
): Promise<PatientPackagePlanQuoteResponseData> {
  const response = await httpClient.post<ApiPayload<PatientPackagePlanQuoteResponseData>>(
    PACKAGE_PLANS_ROUTES.patientQuote,
    input,
  );
  return extractData(response.data);
}

