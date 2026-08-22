export const practitionerAvailabilityQueryKeys = {
  all: ["practitioner", "availability"] as const,
  weeks: () => [...practitionerAvailabilityQueryKeys.all, "weeks"] as const,
  details: (weekId: string) => [...practitionerAvailabilityQueryKeys.weeks(), weekId] as const,
  bookingSettings: () => [...practitionerAvailabilityQueryKeys.all, "booking-settings"] as const,
};

export async function invalidateAvailability(
  queryClient: { invalidateQueries: (options: { queryKey: readonly unknown[] }) => Promise<unknown> },
  weekId?: string,
) {
  await queryClient.invalidateQueries({ queryKey: practitionerAvailabilityQueryKeys.weeks() });
  if (weekId) await queryClient.invalidateQueries({ queryKey: practitionerAvailabilityQueryKeys.details(weekId) });
}
