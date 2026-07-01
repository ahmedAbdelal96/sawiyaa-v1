import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  UpdateRevenueShareRulesRequest,
  RevenueShareRulesResponseData,
} from "../types/revenue-share-rules.types";

export async function getAdminRevenueShareRules() {
  const response = await httpClient.get<ApiPayload<RevenueShareRulesResponseData>>(
    "/admin/revenue-share-rules",
  );

  return extractData(response.data);
}

export async function updateAdminRevenueShareRules(
  data: UpdateRevenueShareRulesRequest,
) {
  const response = await httpClient.put<ApiPayload<RevenueShareRulesResponseData>>(
    "/admin/revenue-share-rules",
    data,
  );

  return extractData(response.data);
}
