import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import {
  confirmAvailabilityWeekRepeat, createAvailabilityWeek, getAvailabilityWeekDetails,
  getMyAvailabilityWeeks, getMyBookingSettings, previewAvailabilityWeekRepeat,
  publishAvailabilityWeek, updateAvailabilityWeek, updateMyBookingSettings,
  type CreateAvailabilityWeekPayload, type UpdateAvailabilityWeekPayload,
} from "./api";

export const practitionerAvailabilityQueryKeys = {
  all: ["practitioner", "availability"] as const,
  weeks: () => [...practitionerAvailabilityQueryKeys.all, "weeks"] as const,
  details: (weekId: string) => [...practitionerAvailabilityQueryKeys.weeks(), weekId] as const,
  bookingSettings: () => [...practitionerAvailabilityQueryKeys.all, "booking-settings"] as const,
};

export function useMyAvailabilityWeeks(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  return useQuery({ queryKey: practitionerAvailabilityQueryKeys.weeks(), queryFn: getMyAvailabilityWeeks, enabled: enabled && authEnabled, staleTime: 30_000 });
}

export function useAvailabilityWeekDetails(weekId: string | undefined) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  return useQuery({ queryKey: practitionerAvailabilityQueryKeys.details(weekId ?? "unknown"), queryFn: () => getAvailabilityWeekDetails(weekId!), enabled: Boolean(weekId) && authEnabled, staleTime: 15_000 });
}

function invalidateAvailability(queryClient: ReturnType<typeof useQueryClient>, weekId?: string) {
  void queryClient.invalidateQueries({ queryKey: practitionerAvailabilityQueryKeys.weeks() });
  if (weekId) void queryClient.invalidateQueries({ queryKey: practitionerAvailabilityQueryKeys.details(weekId) });
}

export function useCreateAvailabilityWeek() { const q = useQueryClient(); return useMutation({ mutationFn: (p: CreateAvailabilityWeekPayload) => createAvailabilityWeek(p), onSuccess: () => invalidateAvailability(q) }); }
export function useUpdateAvailabilityWeek() { const q = useQueryClient(); return useMutation({ mutationFn: ({ weekId, payload }: { weekId: string; payload: UpdateAvailabilityWeekPayload }) => updateAvailabilityWeek(weekId, payload), onSuccess: (_data, variables) => invalidateAvailability(q, variables.weekId) }); }
export function usePublishAvailabilityWeek() { const q = useQueryClient(); return useMutation({ mutationFn: (weekId: string) => publishAvailabilityWeek(weekId), onSuccess: (_data, weekId) => invalidateAvailability(q, weekId) }); }
export function usePreviewAvailabilityWeekRepeat() { return useMutation({ mutationFn: ({ sourceWeekId, targetWeekStartDates, idempotencyKey }: { sourceWeekId: string; targetWeekStartDates: string[]; idempotencyKey: string }) => previewAvailabilityWeekRepeat(sourceWeekId, targetWeekStartDates, idempotencyKey) }); }
export function useConfirmAvailabilityWeekRepeat() { const q = useQueryClient(); return useMutation({ mutationFn: ({ sourceWeekId, operationId, idempotencyKey }: { sourceWeekId: string; operationId: string; idempotencyKey: string }) => confirmAvailabilityWeekRepeat(sourceWeekId, { operationId, idempotencyKey }), onSuccess: () => invalidateAvailability(q) }); }

export function useMyBookingSettings(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  return useQuery({ queryKey: practitionerAvailabilityQueryKeys.bookingSettings(), queryFn: getMyBookingSettings, enabled: enabled && authEnabled, staleTime: 30_000 });
}
export function useUpdateMyBookingSettings() { const q = useQueryClient(); return useMutation({ mutationFn: (acceptsNormalBookings: boolean) => updateMyBookingSettings(acceptsNormalBookings), onSuccess: () => void q.invalidateQueries({ queryKey: practitionerAvailabilityQueryKeys.bookingSettings() }) }); }
