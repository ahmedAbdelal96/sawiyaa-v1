export const enAvailabilityCatalog = {
  success: {
    myAvailabilityFetched: 'Availability fetched successfully',
    weeklyAvailabilityReplaced: 'Weekly availability updated successfully',
    exceptionCreated: 'Availability exception created successfully',
    exceptionUpdated: 'Availability exception updated successfully',
    exceptionDeleted: 'Availability exception deleted successfully',
  },
  notifications: {
    weekEndingReminderTitle: 'Publish next week availability',
    weekEndingReminderBody:
      'This schedule applies only to this week. Publish next week to keep patient bookings available. Patients can only book published weeks.',
    weekEndingReminderPushBody:
      'Publish next week so patients can keep booking available times.',
  },
  errors: {
    practitionerNotFound: 'Practitioner profile was not found',
    invalidTimezone: 'Timezone is invalid',
    invalidWeeklySlotRange: 'Weekly availability slot range is invalid',
    invalidWeeklySlotDuration:
      'Weekly availability slot duration must match the selected duration',
    invalidDurationMinutes:
      'Weekly availability slot duration must be 30 or 60 minutes',
    invalidGranularity: 'Weekly availability must use 30-minute granularity',
    overlappingWeeklySlots:
      'Weekly availability contains overlapping slots on the same day',
    invalidExceptionRange: 'Availability exception range is invalid',
    exceptionNotFound: 'Availability exception was not found',
    invalidRange: 'Availability range is invalid',
    rangeTooLarge:
      'Availability range is too large for V1 and must not exceed {{maxDays}} days',
    publicAvailabilityNotFound:
      'Public practitioner availability was not found',
  },
};
