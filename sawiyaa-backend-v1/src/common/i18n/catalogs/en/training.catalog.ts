export const enTrainingCatalog = {
  errors: {
    notFound: 'Training was not found',
    scheduleNotFound: 'Training schedule was not found',
    invalidPublishTransition: 'Training publish transition is invalid',
    invalidArchiveTransition: 'Training archive transition is invalid',
    archivedReadOnly: 'Archived training cannot be edited',
    localeRequiredForTranslationUpdate:
      'Locale is required when updating translation fields',
    slugAlreadyExists: 'Training slug already exists',
    scheduleCodeAlreadyExists: 'Schedule code already exists',
    enrollmentWindowRequired: 'Enrollment window is required',
    sessionWindowRequired: 'Session time window is required',
    invalidEnrollmentWindow: 'Enrollment time window is invalid',
    invalidSessionWindow: 'Session time window is invalid',
    enrollmentMustCloseBeforeStart:
      'Enrollment must close before schedule start',
    invalidCapacity: 'Schedule capacity must be greater than zero',
    cannotOpenPastSchedule:
      'Cannot open enrollment for a schedule that already started',
    invalidScheduleStatusTransition: 'Schedule status transition is invalid',
    capacityBelowCurrentEnrollments:
      'Capacity cannot be lower than current enrollments',
    patientNotFound: 'Patient profile was not found',
    enrollmentNotFound: 'Enrollment was not found',
    enrollmentAlreadyExists: 'Enrollment already exists for this schedule',
    courseNotEnrollable: 'Course is not available for enrollment',
    scheduleNotEnrollable: 'Schedule is not open for enrollment',
    missingSchedulePricing:
      'Schedule or course pricing is missing for enrollment payment',
    unsupportedEnrollmentCurrency:
      'Enrollment currency is not supported by routing policy',
    invalidExternalRoomProvider: 'External room provider is invalid',
    externalJoinUrlRequired:
      'External room join URL is required when provider is configured',
    externalRoomProviderRequired:
      'External room provider is required when join URL is provided',
    attendanceMutationNotAllowedForEnrollmentState:
      'Attendance cannot be marked for this enrollment state',
    attendanceMutationNotAllowedForScheduleState:
      'Attendance cannot be marked for this schedule state',
    attendanceCannotBeMarkedBeforeStart:
      'Attendance cannot be marked before schedule start',
  },
  notifications: {
    enrollmentConfirmedTitle: 'Training enrollment confirmed',
    enrollmentConfirmedBody:
      'Your training enrollment is confirmed for {sessionAt}.',
    scheduleReminderTitle: 'Training starts soon',
    scheduleReminderBody: 'Reminder: your training starts at {sessionAt}.',
  },
};
