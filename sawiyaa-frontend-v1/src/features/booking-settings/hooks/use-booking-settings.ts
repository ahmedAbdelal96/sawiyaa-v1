import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyBookingSettings,
  updateMyBookingSettings,
} from "../api/booking-settings.api";

export const bookingSettingsQueryKey = ["booking-settings", "me"] as const;

export function useMyBookingSettings() {
  return useQuery({
    queryKey: bookingSettingsQueryKey,
    queryFn: getMyBookingSettings,
    staleTime: 15_000,
  });
}

export function useUpdateBookingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyBookingSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(bookingSettingsQueryKey, data);
    },
  });
}
