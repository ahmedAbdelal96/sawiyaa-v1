import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  FinanceOperationEventDetailData,
  FinanceOperationEventsListData,
  ListAdminFinanceOperationEventsParams,
} from "../types/admin-finance-operations.types";

export async function listAdminFinanceOperationEvents(
  params: ListAdminFinanceOperationEventsParams,
) {
  const response = await httpClient.get<ApiPayload<FinanceOperationEventsListData>>(
    "/admin/finance/operations/events",
    { params },
  );

  return extractData(response.data);
}

export async function getAdminFinanceOperationEvent(eventId: string) {
  const response = await httpClient.get<ApiPayload<FinanceOperationEventDetailData>>(
    `/admin/finance/operations/events/${eventId}`,
  );

  return extractData(response.data);
}
