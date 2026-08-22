import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedQueryEnabled } from "../../auth/query-auth";
import { invalidateAvailability, practitionerAvailabilityQueryKeys } from "./cache";
import {
  confirmAvailabilityWeekRepeat, createAvailabilityWeek, getAvailabilityWeekDetails,
  getMyAvailabilityWeeks, getMyBookingSettings, previewAvailabilityWeekRepeat,
  publishAvailabilityWeek, updateAvailabilityWeek, updateMyBookingSettings,
  type CreateAvailabilityWeekPayload, type UpdateAvailabilityWeekPayload,
} from "./api";

export { invalidateAvailability, practitionerAvailabilityQueryKeys } from "./cache";

export function useMyAvailabilityWeeks(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  return useQuery({ queryKey: practitionerAvailabilityQueryKeys.weeks(), queryFn: getMyAvailabilityWeeks, enabled: enabled && authEnabled, staleTime: 30_000 });
}

export function useAvailabilityWeekDetails(weekId: string | undefined) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  return useQuery({ queryKey: practitionerAvailabilityQueryKeys.details(weekId ?? "unknown"), queryFn: () => getAvailabilityWeekDetails(weekId!), enabled: Boolean(weekId) && authEnabled, staleTime: 15_000 });
}

function applyMutationToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  data: Awaited<ReturnType<typeof createAvailabilityWeek>>,
  weekId?: string,
) {
  queryClient.setQueryData(practitionerAvailabilityQueryKeys.weeks(), (current: Awaited<ReturnType<typeof getMyAvailabilityWeeks>> | undefined) =>
    current ? { ...current, timezone: data.timezone, weeks: data.weeks } : current,
  );
  if (weekId) {
    queryClient.setQueryData(practitionerAvailabilityQueryKeys.details(weekId), (current: Awaited<ReturnType<typeof getAvailabilityWeekDetails>> | undefined) =>
      current ? { ...current, message: data.message, week: data.week } : current,
    );
  }
}

export function useCreateAvailabilityWeek() {
  const q = useQueryClient();
  return useMutation({
    mutationFn: (p: CreateAvailabilityWeekPayload) => createAvailabilityWeek(p),
    onSuccess: async (data) => {
      applyMutationToCache(q, data, data.week.id ?? undefined);
      await invalidateAvailability(q, data.week.id ?? undefined);
    },
  });
}
export function useUpdateAvailabilityWeek() {
  const q = useQueryClient();
  return useMutation({
    mutationFn: ({ weekId, payload }: { weekId: string; payload: UpdateAvailabilityWeekPayload }) => updateAvailabilityWeek(weekId, payload),
    onSuccess: async (data, variables) => {
      applyMutationToCache(q, data, variables.weekId);
      await invalidateAvailability(q, variables.weekId);
    },
  });
}
export function usePublishAvailabilityWeek() { const q = useQueryClient(); return useMutation({ mutationFn: (weekId: string) => publishAvailabilityWeek(weekId), onSuccess: (_data, weekId) => invalidateAvailability(q, weekId) }); }
export function usePreviewAvailabilityWeekRepeat() { return useMutation({ mutationFn: ({ sourceWeekId, targetWeekStartDates, idempotencyKey }: { sourceWeekId: string; targetWeekStartDates: string[]; idempotencyKey: string }) => previewAvailabilityWeekRepeat(sourceWeekId, targetWeekStartDates, idempotencyKey) }); }
export function useConfirmAvailabilityWeekRepeat() { const q = useQueryClient(); return useMutation({ mutationFn: ({ sourceWeekId, operationId, idempotencyKey }: { sourceWeekId: string; operationId: string; idempotencyKey: string }) => confirmAvailabilityWeekRepeat(sourceWeekId, { operationId, idempotencyKey }), onSuccess: (_data, variables) => invalidateAvailability(q, variables.sourceWeekId) }); }

export function useMyBookingSettings(enabled = true) {
  const authEnabled = useAuthenticatedQueryEnabled("practitioner");
  return useQuery({ queryKey: practitionerAvailabilityQueryKeys.bookingSettings(), queryFn: getMyBookingSettings, enabled: enabled && authEnabled, staleTime: 30_000 });
}
export function useUpdateMyBookingSettings() { const q = useQueryClient(); return useMutation({ mutationFn: (acceptsNormalBookings: boolean) => updateMyBookingSettings(acceptsNormalBookings), onSuccess: () => void q.invalidateQueries({ queryKey: practitionerAvailabilityQueryKeys.bookingSettings() }) }); }
