import { apiClient, extractApiData } from "../../../lib/api";
import type {
  PresenceResponse,
  SetInstantBookingPayload,
  SetPresenceStatusPayload,
} from "./types";

export async function getMyPresence() {
  const response = await apiClient.get("/practitioners/me/presence");
  return extractApiData<PresenceResponse>(response);
}

export async function setMyPresenceStatus(payload: SetPresenceStatusPayload) {
  const response = await apiClient.put(
    "/practitioners/me/presence/status",
    payload,
  );
  return extractApiData<PresenceResponse>(response);
}

export async function setMyInstantBooking(payload: SetInstantBookingPayload) {
  const response = await apiClient.put(
    "/practitioners/me/presence/instant-booking",
    payload,
  );
  return extractApiData<PresenceResponse>(response);
}
