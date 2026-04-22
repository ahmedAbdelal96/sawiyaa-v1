import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { CreateModerationReportInput, ModerationReportItem } from "../types/moderation.types";

export async function createModerationReport(payload: CreateModerationReportInput) {
  const response = await httpClient.post<ApiPayload<{ item: ModerationReportItem }>>(
    "/moderation/reports",
    payload,
  );

  return extractData(response.data);
}

