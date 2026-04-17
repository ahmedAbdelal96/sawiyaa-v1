import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { AdminSessionsListData, ListAdminSessionsParams } from "../types/admin-sessions.types";

export async function listAdminSessions(params: ListAdminSessionsParams) {
  const response = await httpClient.get<ApiPayload<AdminSessionsListData>>("/admin/sessions", {
    params,
  });

  return extractData(response.data);
}

