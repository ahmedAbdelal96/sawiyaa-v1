import { createScheduledSessionRequest } from "@/modules/booking/api/booking.api";
import type { CreateScheduledSessionInput } from "@/modules/booking/domain/booking.types";

export const bookingService = {
  async createSession(payload: CreateScheduledSessionInput) {
    const response = await createScheduledSessionRequest(payload);
    return response.item;
  },
};
