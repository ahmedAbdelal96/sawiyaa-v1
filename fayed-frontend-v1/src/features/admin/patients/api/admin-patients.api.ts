import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type {
  AdminPatientDetailsResponseData,
  AdminPatientsListResponseData,
  ListAdminPatientsParams,
} from "../types/admin-patients.types";

export async function listAdminPatients(params: ListAdminPatientsParams) {
  const response = await httpClient.get<ApiPayload<AdminPatientsListResponseData>>(
    "/admin/patients",
    { params },
  );
  if (typeof window !== "undefined" && localStorage.getItem("debug.adminPatients") === "1") {
    // eslint-disable-next-line no-console
    console.debug("[adminPatients] list response", { params, payload: response.data });
  }
  return extractData(response.data);
}

export async function getAdminPatientDetails(patientId: string) {
  const response = await httpClient.get<ApiPayload<AdminPatientDetailsResponseData>>(
    `/admin/patients/${patientId}`,
  );
  if (typeof window !== "undefined" && localStorage.getItem("debug.adminPatients") === "1") {
    // eslint-disable-next-line no-console
    console.debug("[adminPatients] details response", { patientId, payload: response.data });
  }
  return extractData(response.data).item;
}
