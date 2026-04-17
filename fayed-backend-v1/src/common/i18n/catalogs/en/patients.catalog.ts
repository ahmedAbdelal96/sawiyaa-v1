export const enPatientsCatalog = {
  success: {
    profileFetched: 'Patient profile fetched successfully',
    profileUpdated: 'Patient profile updated successfully',
    onboardingCompleted: 'Patient onboarding completed successfully',
    avatarUpdated: 'Patient avatar updated successfully',
    avatarRemoved: 'Patient avatar removed successfully',
  },
  errors: {
    userNotFound: 'Patient user was not found',
    profileNotFound: 'Patient profile was not found',
    invalidProfileState:
      'Patient profile does not yet satisfy the minimum onboarding requirements',
    profileAccessDenied: 'You are not allowed to access this patient profile',
    countryNotFound: 'Country code is invalid or inactive',
    avatarFileRequired: 'Avatar file is required',
    avatarInvalidType: 'Unsupported avatar file type. Use JPG, PNG, or WEBP',
    avatarFileTooLarge: 'Avatar file exceeds the 5MB size limit',
    avatarNotFound: 'Patient avatar was not found',
  },
};
