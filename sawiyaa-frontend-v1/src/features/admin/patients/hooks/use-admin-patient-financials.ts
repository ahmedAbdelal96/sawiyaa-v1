"use client";

import { useQuery } from "@tanstack/react-query";
import type { ListPaymentsParams } from "@/features/payments/types/payments.types";
import type { PatientAssessmentsHistoryParams } from "@/features/assessments/types/assessments.types";
import { listAdminPatientPayments } from "../api/admin-patient-payments.api";
import { listAdminPatientAssessments } from "../api/admin-patient-assessments.api";

export const adminPatientFinancialsQueryKeys = {
  all: ["admin", "patients", "financials"] as const,
  payments: (patientId: string, params: ListPaymentsParams) =>
    [...adminPatientFinancialsQueryKeys.all, "payments", patientId, params] as const,
  assessments: (patientId: string, params: PatientAssessmentsHistoryParams) =>
    [...adminPatientFinancialsQueryKeys.all, "assessments", patientId, params] as const,
};

export function useAdminPatientPayments(
  patientId: string | null,
  params: ListPaymentsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: adminPatientFinancialsQueryKeys.payments(patientId ?? "", params),
    queryFn: () => listAdminPatientPayments(patientId!, params),
    enabled: Boolean(patientId) && enabled,
    staleTime: 30_000,
  });
}

export function useAdminPatientAssessments(
  patientId: string | null,
  params: PatientAssessmentsHistoryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: adminPatientFinancialsQueryKeys.assessments(patientId ?? "", params),
    queryFn: () => listAdminPatientAssessments(patientId!, params),
    enabled: Boolean(patientId) && enabled,
    staleTime: 30_000,
  });
}

