"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changePatientCountry,
  getAdminPatientDetails,
  listAdminCountries,
  listAdminPatients,
  type AdminPatientCountryChangeParams,
  type CountryListItem,
} from "../api/admin-patients.api";
import type { ListAdminPatientsParams } from "../types/admin-patients.types";

export const adminPatientsQueryKeys = {
  all: ["admin", "patients"] as const,
  list: (params: ListAdminPatientsParams) =>
    [...adminPatientsQueryKeys.all, "list", params] as const,
  details: (patientId: string) =>
    [...adminPatientsQueryKeys.all, "details", patientId] as const,
  countries: () => [...adminPatientsQueryKeys.all, "countries"] as const,
};

export function useAdminPatients(params: ListAdminPatientsParams) {
  return useQuery({
    queryKey: adminPatientsQueryKeys.list(params),
    queryFn: () => listAdminPatients(params),
    staleTime: 30_000,
  });
}

export function useAdminPatientDetails(patientId: string | null, enabled = true) {
  return useQuery({
    queryKey: adminPatientsQueryKeys.details(patientId ?? ""),
    queryFn: () => getAdminPatientDetails(patientId!),
    enabled: Boolean(patientId) && enabled,
    staleTime: 30_000,
  });
}

export function useAdminCountries() {
  return useQuery({
    queryKey: adminPatientsQueryKeys.countries(),
    queryFn: () => listAdminCountries(),
    staleTime: 60_000,
  });
}

export function useAdminPatientCountryChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AdminPatientCountryChangeParams) =>
      changePatientCountry(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPatientsQueryKeys.all });
    },
  });
}

