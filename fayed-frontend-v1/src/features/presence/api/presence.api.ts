import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";
import type {
  MyPresenceData,
  SetInstantBookingInput,
  SetPresenceStatusInput,
} from "../types/presence.types";

/**
 * Reads the practitioner's current live presence state.
 */
export async function getMyPresence(): Promise<MyPresenceData> {
  const response = await httpClient.get<ApiPayload<MyPresenceData>>(
    "/practitioners/me/presence"
  );
  return extractData(response.data);
}

/**
 * Sets the practitioner's manual presence status (ONLINE/AWAY/OFFLINE/BUSY).
 */
export async function setMyPresenceStatus(
  data: SetPresenceStatusInput
): Promise<MyPresenceData> {
  const response = await httpClient.put<ApiPayload<MyPresenceData>>(
    "/practitioners/me/presence/status",
    data
  );
  return extractData(response.data);
}

/**
 * Toggles instant booking readiness (independent from status).
 */
export async function setMyInstantBooking(
  data: SetInstantBookingInput
): Promise<MyPresenceData> {
  const response = await httpClient.put<ApiPayload<MyPresenceData>>(
    "/practitioners/me/presence/instant-booking",
    data
  );
  return extractData(response.data);
}

/**
 * Fires a heartbeat to keep the presence record fresh.
 * Does not change status.
 */
export async function heartbeatMyPresence(): Promise<MyPresenceData> {
  const response = await httpClient.post<ApiPayload<MyPresenceData>>(
    "/practitioners/me/presence/heartbeat",
    {}
  );
  return extractData(response.data);
}
