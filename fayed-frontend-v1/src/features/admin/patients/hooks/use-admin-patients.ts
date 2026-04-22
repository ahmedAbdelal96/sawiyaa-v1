"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminPatientDetails, listAdminPatients } from "../api/admin-patients.api";
import type { ListAdminPatientsParams } from "../types/admin-patients.types";

export const adminPatientsQueryKeys = {
  all: ["admin", "patients"] as const,
  list: (params: ListAdminPatientsParams) =>
    [...adminPatientsQueryKeys.all, "list", params] as const,
  details: (patientId: string) =>
    [...adminPatientsQueryKeys.all, "details", patientId] as const,
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

