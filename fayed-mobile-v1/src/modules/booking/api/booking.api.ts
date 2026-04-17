import type {
  CreateScheduledSessionInput,
  SessionItemDataResponse,
} from "@/modules/booking/domain/booking.types";
import { unwrapApiData } from "@/networking/contracts/api-envelope";
import { httpClient } from "@/networking/http/client";

export async function createScheduledSessionRequest(payload: CreateScheduledSessionInput) {
  const response = await httpClient.post<SessionItemDataResponse>(
    "/patients/me/sessions",
    {
      ...payload,
      sessionMode: payload.sessionMode || "VIDEO",
    },
  );

  return unwrapApiData(response.data);
}
