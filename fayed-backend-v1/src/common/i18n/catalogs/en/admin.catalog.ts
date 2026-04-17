export const enAdminCatalog = {
  practitionerApplications: {
    success: {
      applicationsFetched: 'Practitioner applications fetched successfully',
      applicationFetched:
        'Practitioner application details fetched successfully',
      practitionerCreatedDirectly:
        'Practitioner was created directly from admin successfully',
      applicationApproved: 'Practitioner application approved successfully',
      applicationRejected: 'Practitioner application rejected successfully',
      practitionerAvatarUpdated: 'Practitioner avatar updated successfully',
      practitionerAvatarRemoved: 'Practitioner avatar removed successfully',
    },
    errors: {
      applicationNotFound: 'Practitioner application was not found',
      invalidApplicationState:
        'Practitioner application state is invalid for this action',
      applicationAlreadyApproved:
        'Practitioner application is already approved',
      applicationAlreadyRejected:
        'Practitioner application is already rejected',
      applicationNotReviewable:
        'Practitioner application is not reviewable in its current state',
      invalidCountryCode: 'Country code is invalid or not active',
      invalidYearsOfExperience: 'Years of experience must be zero or greater',
      invalidSpecialtyIds: 'One or more specialty ids are invalid or inactive',
      invalidSpecialtyCategoryId:
        'Primary specialty category is invalid or inactive',
      invalidSpecialtiesForCategory:
        'Selected specialties do not belong to the selected primary category',
      practitionerNotFound: 'Practitioner profile was not found',
    },
    notifications: {
      approvedTitle: 'Your practitioner application was approved',
      approvedBody:
        'Congratulations, your practitioner application is approved.',
      rejectedTitle: 'Your practitioner application was rejected',
      rejectedBody:
        'Your practitioner application was rejected. Reason: {{reason}}',
    },
  },
};
