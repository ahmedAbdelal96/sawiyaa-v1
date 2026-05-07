import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchPublicPractitionerPackagePlans,
  quotePatientPackagePlan,
} from "../api/package-plans.api";
import type {
  PackagePlansQuery,
  PatientPackagePlanQuoteRequest,
} from "../types/package-plans.types";

export const packagePlanQueryKeys = {
  all: ["package-plans"] as const,
  publicByPractitionerSlug: (practitionerSlug: string, params?: PackagePlansQuery) =>
    [...packagePlanQueryKeys.all, "public", practitionerSlug, params ?? {}] as const,
};

type UsePublicPackagePlansOptions = {
  enabled?: boolean;
};

export function usePublicPractitionerPackagePlans(
  practitionerSlug: string,
  params?: PackagePlansQuery,
  options?: UsePublicPackagePlansOptions,
) {
  return useQuery({
    queryKey: packagePlanQueryKeys.publicByPractitionerSlug(practitionerSlug, params),
    queryFn: () => fetchPublicPractitionerPackagePlans(practitionerSlug, params),
    enabled: Boolean(practitionerSlug) && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function usePatientPackagePlanQuote() {
  return useMutation({
    mutationFn: (input: PatientPackagePlanQuoteRequest) => quotePatientPackagePlan(input),
  });
}

export const packagePlanQuoteQueryKeys = {
  all: ["package-plan-quote"] as const,
  detail: (input: PatientPackagePlanQuoteRequest | null) =>
    [...packagePlanQuoteQueryKeys.all, input ?? {}] as const,
};

export function usePatientPackagePlanQuoteQuery(
  input: PatientPackagePlanQuoteRequest | null,
) {
  return useQuery({
    queryKey: packagePlanQuoteQueryKeys.detail(input),
    queryFn: () => quotePatientPackagePlan(input!),
    enabled: Boolean(input),
    staleTime: 0,
    retry: false,
  });
}
