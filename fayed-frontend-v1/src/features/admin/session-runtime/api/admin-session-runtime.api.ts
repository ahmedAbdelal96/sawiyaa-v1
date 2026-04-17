import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminSessionAttendanceResponseData,
  AdminSessionRuntimeInspectionResponseData,
} from "../types/admin-session-runtime.types";

export async function getAdminSessionRuntimeInspection(
  sessionId: string,
): Promise<AdminSessionRuntimeInspectionResponseData> {
  const response = await httpClient.get<ApiPayload<AdminSessionRuntimeInspectionResponseData>>(
    `/admin/sessions/${sessionId}/runtime-inspection`,
  );
  return extractData(response.data);
}

export async function getAdminSessionAttendance(
  sessionId: string,
): Promise<AdminSessionAttendanceResponseData> {
  const response = await httpClient.get<ApiPayload<AdminSessionAttendanceResponseData>>(
    `/admin/sessions/${sessionId}/attendance`,
  );
  return extractData(response.data);
}
