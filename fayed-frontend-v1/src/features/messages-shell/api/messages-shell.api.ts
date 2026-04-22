import httpClient from "@/lib/api/http-client";
import type { ApiPayload } from "@/lib/api/contracts";
import { extractData } from "@/lib/api/response";
import type { UnifiedMessagingUnreadSummary } from "../types/messages-shell.types";

type UnifiedMessagingUnreadSummaryResponse = {
  item: UnifiedMessagingUnreadSummary;
};

export async function getUnifiedMessagingUnreadSummary() {
  const response = await httpClient.get<ApiPayload<UnifiedMessagingUnreadSummaryResponse>>(
    "/chat/conversations/unread-summary",
  );
  return extractData(response.data);
}

