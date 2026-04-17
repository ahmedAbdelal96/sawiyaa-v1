export const enPractitionersCatalog = {
  success: {
    profileFetched: 'Practitioner profile fetched successfully',
    profileUpdated: 'Practitioner profile updated successfully',
    avatarUpdated: 'Practitioner avatar updated successfully',
    avatarRemoved: 'Practitioner avatar removed successfully',
    specialtiesFetched: 'Practitioner specialties fetched successfully',
    specialtiesUpdated: 'Practitioner specialties updated successfully',
    credentialUploaded: 'Practitioner credential uploaded successfully',
    credentialsFetched: 'Practitioner credentials fetched successfully',
    applicationSubmitted: 'Practitioner application submitted successfully',
    applicationStatusFetched:
      'Practitioner application status fetched successfully',
    readinessFetched: 'Practitioner readiness fetched successfully',
    publicListFetched: 'Public practitioners fetched successfully',
    publicDetailsFetched: 'Public practitioner profile fetched successfully',
  },
  errors: {
    userNotFound: 'Practitioner user was not found',
    profileNotFound: 'Practitioner profile was not found',
    countryNotFound: 'Country code is invalid or inactive',
    languageNotFound: 'One or more language codes are invalid or inactive',
    specialtyCategoryNotFound:
      'Primary specialty category is invalid or inactive',
    specialtyNotFound: 'One or more specialty ids are invalid or inactive',
    invalidSpecialtyPayload:
      'Specialty payload is invalid and must not contain duplicate specialty ids',
    invalidSpecialtiesForCategory:
      'Selected specialties do not belong to the selected primary category',
    invalidPayoutDestination:
      'Payout destination details do not satisfy the selected payout method',
    invalidProfileState:
      'Practitioner profile does not satisfy the minimum readiness requirements',
    applicationNotEligible:
      'Practitioner application cannot be submitted until readiness requirements are met',
    applicationAlreadySubmitted:
      'Practitioner application is already submitted or under review',
    credentialAlreadyExists:
      'A credential with the same type and file reference already exists',
    credentialNotFound: 'Practitioner credential was not found',
    profileAccessDenied:
      'You are not allowed to access this practitioner profile',
    publicProfileNotFound: 'Public practitioner profile was not found',
  },
};
