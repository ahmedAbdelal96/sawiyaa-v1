import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  PatientAssessmentsHistory,
  PatientAssessmentsHistoryParams,
} from "@/features/assessments/types/assessments.types";

export async function listAdminPatientAssessments(
  patientId: string,
  params: PatientAssessmentsHistoryParams,
) {
  const response = await httpClient.get<ApiPayload<PatientAssessmentsHistory>>(
    `/admin/patients/${patientId}/assessments`,
    { params },
  );
  return extractData(response.data);
}

