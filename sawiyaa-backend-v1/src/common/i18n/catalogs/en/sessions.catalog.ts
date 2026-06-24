export const enSessionsCatalog = {
  notifications: {
    sessionConfirmedTitle: 'Session confirmed',
    sessionConfirmedBody:
      'Your session is confirmed for {{sessionAt}}.{{packageContext}} You can prepare to join from your sessions screen.',
    sessionConfirmedPushBody:
      'Your session is confirmed. Open your sessions to prepare.',
    sessionConfirmedPractitionerTitle: 'New confirmed session',
    sessionConfirmedPractitionerBody:
      'A session has been confirmed for {{sessionAt}}.{{packageContext}}',
    sessionConfirmedPractitionerPushBody:
      'A session has been confirmed. Review the details and prepare to join.',
    sessionJoinAvailableTitle: 'Session ready to join',
    sessionJoinAvailableBody:
      'Your session starts soon.{{packageContext}} Open the session page to join securely.',
    sessionJoinAvailablePushBody:
      'Your session is ready. Open the session page to join securely.',
    sessionJoinAvailableEmailSubject: 'Your Sawiyaa session is ready to join',
    sessionJoinAvailableEmailTitle: 'Your session is ready',
    sessionJoinAvailableEmailBody:
      'Your session starts soon.{{packageContext}} Open the session page to join securely.',
    sessionCancelledTitle: 'Session cancelled',
    sessionCancelledBody:
      'Your session scheduled at {{sessionAt}} was cancelled.',
    sessionCancelledPushBody: 'Your session has been cancelled.',
    sessionCancelledPractitionerTitle: 'Session cancelled by patient',
    sessionCancelledPractitionerBody:
      'A patient cancelled a session scheduled at {{sessionAt}}.',
    sessionCancelledPractitionerPushBody:
      'A session has been cancelled by the patient.',
    sessionReminder60Title: 'Session reminder',
    sessionReminder60Body: 'Your session starts in an hour.',
    sessionReminder60PractitionerTitle: 'You have a session in an hour',
    sessionReminder60PractitionerBody:
      'Review the session details and get ready to join at the scheduled time.',
    sessionReminder15Title: 'Your session starts soon',
    sessionReminder15Body: 'Your session starts in 15 minutes.',
    sessionReminder15PractitionerTitle: 'Your session starts in 15 minutes',
    sessionReminder15PractitionerBody:
      'Open the session page when join time starts.',
    packageSessionContext:
      ' Session {{packageSessionIndex}} of {{packageSessionCount}} in your package.',
  },
  errors: {
    patientNotFound: 'Patient profile was not found',
    practitionerNotFound: 'Practitioner profile was not found',
    practitionerNotBookable:
      'Practitioner is not available for scheduled booking',
    sessionNotFound: 'Session was not found',
    sessionAccessDenied: 'You do not have access to this session',
    invalidDuration: 'Session duration must be 30 or 60 minutes',
    invalidScheduledStartAt: 'Scheduled start datetime is invalid',
    scheduledStartMustBeFuture:
      'Scheduled start datetime must be in the future',
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
    cancellationPolicyMissing:
      'Cancellation policy is not configured for booking type {{bookingType}}',
    cancellationPolicyNoMatchingRule:
      'No active cancellation rule matches the current cancellation window',
    cancellationNotAllowedByPolicy:
      'Cancellation is not allowed by active policy',
    cancellationPolicyMissingSessionSchedule:
      'Session schedule is missing for cancellation policy evaluation',
    cancellationPolicyMustHaveRules:
      'Cancellation policy must include at least one rule',
    cancellationPolicyDuplicateRuleCode:
      'Cancellation policy contains duplicate rule code {{code}}',
    cancellationPolicyInvalidRuleWindow:
      'Cancellation policy rule window is invalid for rule {{code}}',
    cancellationPolicyInvalidRefundMode:
      'Cancellation policy rule {{code}} has invalid refund mode for its allowance state',
    cancellationPolicyInvalidRefundPercent:
      'Cancellation policy rule {{code}} has invalid refund percentage',
    cancellationPolicyRefundPercentRequired:
      'Cancellation policy rule {{code}} requires a refund percentage',
    cancellationPolicyOverlappingRules:
      'Cancellation policy contains overlapping rules: {{firstRuleCode}} and {{secondRuleCode}}',
    cancellationOriginalMethodRefundNotSupported:
      'Original-method cancellation refunds are not supported in this phase',
  },
  // Phase 4A — Manual session decision types
  decisionTypes: {
    MARK_COMPLETED: 'Mark Completed',
    MARK_PATIENT_NO_SHOW: 'Mark Patient No-Show',
    MARK_PRACTITIONER_NO_SHOW: 'Mark Practitioner No-Show',
    MARK_BOTH_NO_SHOW: 'Mark Both No-Show',
    MARK_TECHNICAL_REVIEW: 'Mark Technical Review',
    MARK_INSUFFICIENT_EVIDENCE: 'Mark Insufficient Evidence',
  },
};
