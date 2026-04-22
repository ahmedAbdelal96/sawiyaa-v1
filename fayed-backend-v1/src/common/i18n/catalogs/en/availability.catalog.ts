export const enAvailabilityCatalog = {
  success: {
    myAvailabilityFetched: 'Availability fetched successfully',
    weeklyAvailabilityReplaced: 'Weekly availability updated successfully',
    exceptionCreated: 'Availability exception created successfully',
    exceptionUpdated: 'Availability exception updated successfully',
    exceptionDeleted: 'Availability exception deleted successfully',
  },
  errors: {
    practitionerNotFound: 'Practitioner profile was not found',
    invalidTimezone: 'Timezone is invalid',
    invalidWeeklySlotRange: 'Weekly availability slot range is invalid',
    invalidGranularity: 'Weekly availability must use 15-minute granularity',
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
