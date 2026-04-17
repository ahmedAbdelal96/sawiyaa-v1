export const enSessionsCatalog = {
  notifications: {
    sessionConfirmedTitle: 'Session confirmed',
    sessionConfirmedBody:
      'Your session is confirmed for {{sessionAt}}. You can prepare to join from your sessions screen.',
    sessionConfirmedPractitionerTitle: 'New confirmed session',
    sessionConfirmedPractitionerBody:
      'A session has been confirmed for {{sessionAt}}.',
    sessionCancelledTitle: 'Session cancelled',
    sessionCancelledBody:
      'Your session scheduled at {{sessionAt}} was cancelled.',
    sessionCancelledPractitionerTitle: 'Session cancelled by patient',
    sessionCancelledPractitionerBody:
      'A patient cancelled a session scheduled at {{sessionAt}}.',
  },
  errors: {
    patientNotFound: 'Patient profile was not found',
    practitionerNotFound: 'Practitioner profile was not found',
    practitionerNotBookable: 'Practitioner is not available for scheduled booking',
    sessionNotFound: 'Session was not found',
    sessionAccessDenied: 'You do not have access to this session',
    invalidDuration: 'Session duration must be 30 or 60 minutes',
    invalidScheduledStartAt: 'Scheduled start datetime is invalid',
    scheduledStartMustBeFuture: 'Scheduled start datetime must be in the future',
    unavailableTimeWindow:
      'Requested time window does not fit practitioner availability',
    practitionerTimeConflict:
      'Practitioner already has a conflicting session in the requested range',
    patientTimeConflict:
      'Patient already has a conflicting session in the requested range',
    invalidStatusTransition:
      'Session status transition from {{from}} to {{to}} is invalid',
    sessionAlreadyCancelled: 'Session is already cancelled',
    sessionNotPendingPayment:
      'Only pending-payment sessions can be expired as unpaid',
  },
};
