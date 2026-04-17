export const enReviewsCatalog = {
  success: {
    reviewSubmitted: 'Session review submitted successfully',
    reviewsListed: 'Reviews retrieved successfully',
    reviewDetails: 'Review details retrieved successfully',
    reviewModerated: 'Review moderation applied successfully',
    publicReviewsListed: 'Public practitioner reviews retrieved successfully',
  },
  errors: {
    patientProfileNotFound: 'Patient profile was not found',
    sessionNotFoundForPatient: 'Session was not found for current patient',
    sessionNotCompleted: 'Only completed sessions can be reviewed',
    sessionNotPaid: 'Session must be paid before review submission',
    reviewAlreadyExists: 'A review for this session already exists',
    reviewNotFound: 'Review was not found',
    invalidModerationTransition: 'Review moderation transition is invalid',
    publicPractitionerNotFound:
      'Practitioner slug was not found or is not publicly visible',
  },
};
