import { useMutation } from "@tanstack/react-query";

import { bookingService } from "@/modules/booking/application/booking.service";
import type { CreateScheduledSessionInput } from "@/modules/booking/domain/booking.types";
import { queryClient } from "@/networking/query/query-client";

export function useCreateSession() {
  return useMutation({
    mutationFn: (payload: CreateScheduledSessionInput) => bookingService.createSession(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["journey", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["sessions", "patient"] }),
      ]);
    },
  });
}
