import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type { AdminFinanceHubSummary } from "../types/admin-finance-summary.types";

export async function getAdminFinanceHubSummary() {
  const response = await httpClient.get<ApiPayload<AdminFinanceHubSummary>>(
    "/admin/finance/accounting/dashboard/summary",
  );

  return extractData(response.data);
}
