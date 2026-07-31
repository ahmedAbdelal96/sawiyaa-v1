import httpClient from "@/lib/api/http-client";
import { extractData } from "@/lib/api/response";
import type { ApiPayload } from "@/lib/api/contracts";

export type BookingSettings = {
  acceptsNormalBookings: boolean;
  isInstantBookingEnabled: boolean;
};

type BookingSettingsResponse = { message: string } & BookingSettings;

export async function getMyBookingSettings(): Promise<BookingSettingsResponse> {
  const response = await httpClient.get<ApiPayload<BookingSettingsResponse>>(
    "/practitioners/me/booking-settings",
  );
  return extractData(response.data);
}

export async function updateMyBookingSettings(
  acceptsNormalBookings: boolean,
): Promise<BookingSettingsResponse> {
  const response = await httpClient.patch<ApiPayload<BookingSettingsResponse>>(
    "/practitioners/me/booking-settings",
    { acceptsNormalBookings },
  );
  return extractData(response.data);
}
