import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminAuditDetailResponseData,
  AdminAuditListResponseData,
  ListAdminAuditEventsParams,
} from "../types/admin-audit.types";

export async function listAdminAuditEvents(params: ListAdminAuditEventsParams) {
  const response = await httpClient.get<ApiPayload<AdminAuditListResponseData>>(
    "/admin/audit/events",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminAuditEventDetails(eventId: string) {
  const response = await httpClient.get<ApiPayload<AdminAuditDetailResponseData>>(
    `/admin/audit/events/${eventId}`,
  );

  return extractData(response.data);
}
