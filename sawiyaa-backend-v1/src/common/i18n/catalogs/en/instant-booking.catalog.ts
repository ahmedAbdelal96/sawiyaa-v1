export const enInstantBookingCatalog = {
  errors: {
    patientNotFound: 'Patient profile was not found',
    practitionerNotFound: 'Practitioner profile was not found',
    practitionerNotEligible: 'Practitioner is not eligible for instant booking',
    practitionerNotOnline: 'Practitioner is not currently online',
    practitionerBusy: 'Practitioner is currently busy',
    practitionerNotAvailableNow:
      'Practitioner is not currently available for an instant booking window',
    instantBookingDisabled:
      'Practitioner is not accepting instant bookings right now',
    invalidSessionMode:
      'Instant booking supports only VIDEO or AUDIO session mode in V1',
    requestNotFound: 'Instant booking request was not found',
    pendingRequestAlreadyExists:
      'A pending instant booking request already exists for this practitioner',
    invalidStatusTransition:
      'Instant booking request transition from {{from}} to {{to}} is invalid',
    requestAlreadyCancelled: 'Instant booking request is already cancelled',
    requestAlreadyAccepted: 'Instant booking request is already accepted',
    requestAlreadyRejected: 'Instant booking request is already rejected',
    requestAlreadyFinalized:
      'Instant booking request has already been handled',
  },
  notifications: {
    requestAcceptedTitle: 'Instant booking request accepted',
    requestAcceptedBody:
      'Your instant booking request was accepted. Open it to continue with payment.',
    requestRejectedTitle: 'Instant booking request rejected',
    requestRejectedBody:
      'Your instant booking request was rejected. You can request another instant session.',
    requestExpiredTitle: 'Instant booking request expired',
    requestExpiredBody:
      'Your instant booking request expired before it was acted on.',
  },
};
