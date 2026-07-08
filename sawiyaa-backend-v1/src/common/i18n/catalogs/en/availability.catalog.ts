export const enAvailabilityCatalog = {
  success: {
    myAvailabilityFetched: 'Availability fetched successfully',
    weeklyAvailabilityReplaced: 'Weekly availability updated successfully',
    exceptionCreated: 'Availability exception created successfully',
    exceptionUpdated: 'Availability exception updated successfully',
    exceptionDeleted: 'Availability exception deleted successfully',
    weeksFetched: 'Availability schedule loaded successfully',
    weekUpdated: 'Changes saved successfully',
    weekCreated: 'Schedule created successfully',
    weekPublished: 'Schedule approved and now available for booking',
    weekCopied: 'Schedule copied to next week',
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
    weekNotFound: 'Availability week was not found',
    weekNotDraft: 'This schedule is not a draft and cannot be edited in this way',
    weekNotEditable: 'This schedule cannot be edited',
    slotInPast: 'Cannot modify a time slot that has already passed',
    slotBooked: 'Cannot modify this time slot because it has an active booking',
    publishedTimezoneLocked: 'Timezone cannot be changed after a schedule is approved',
  },
};
