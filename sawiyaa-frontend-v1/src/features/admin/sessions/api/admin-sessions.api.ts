import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  AdminSessionsListData,
  ListAdminSessionsParams,
  SessionCancellationPoliciesData,
  SessionCancellationPolicyItem,
  SessionCancellationBookingType,
  UpdateSessionCancellationPolicyInput,
} from "../types/admin-sessions.types";

export async function listAdminSessions(params: ListAdminSessionsParams) {
  const response = await httpClient.get<ApiPayload<AdminSessionsListData>>("/admin/sessions", {
    params,
  });

  return extractData(response.data);
}

export async function listAdminSessionCancellationPolicies() {
  const response = await httpClient.get<ApiPayload<SessionCancellationPoliciesData>>(
    "/admin/sessions/cancellation-policies",
  );
  return extractData(response.data);
}

export async function updateAdminSessionCancellationPolicy(
  bookingType: SessionCancellationBookingType,
  body: UpdateSessionCancellationPolicyInput,
) {
  const response = await httpClient.patch<
    ApiPayload<{ item: SessionCancellationPolicyItem }>
  >(`/admin/sessions/cancellation-policies/${bookingType}`, body);
  return extractData(response.data).item;
}
