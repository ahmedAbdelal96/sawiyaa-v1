export const enAdminCatalog = {
  adminUsers: {
    success: {
      usersFetched: 'Internal users fetched successfully',
      userFetched: 'Internal user details fetched successfully',
      userCreated: 'Internal user created successfully',
      userUpdated: 'Internal user updated successfully',
      statusUpdated: 'Internal user status updated successfully',
      rolesUpdated: 'Internal user roles updated successfully',
      permissionOverridesFetched:
        'Internal user permission overrides fetched successfully',
      permissionOverridesUpdated:
        'Internal user permission overrides updated successfully',
      sessionsRevoked: 'Internal user sessions revoked successfully',
      tokensInvalidated: 'Internal user tokens invalidated successfully',
    },
    errors: {
      userNotFound: 'Internal user was not found',
      emailAlreadyExists: 'Email is already in use',
      permissionNotFound: 'Permission key was not found',
      lastSuperAdminProtected:
        'This action is not allowed because it would remove access from the last SUPER_ADMIN',
    },
  },
  practitionerApplications: {
    success: {
      applicationsFetched: 'Practitioner applications fetched successfully',
      applicationFetched:
        'Practitioner application details fetched successfully',
      practitionerCreatedDirectly:
        'Practitioner was created directly from admin successfully',
      credentialPrepared:
        'Credential file was uploaded and prepared successfully',
      applicationApproved: 'Practitioner application approved successfully',
      applicationRejected: 'Practitioner application rejected successfully',
      changesRequested: 'Changes were requested successfully',
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
      directCreateMissingRequirements:
        'Direct practitioner creation is missing required approval data',
      invalidCountryCode: 'Country code is invalid or not active',
      invalidCredentialExpiry:
        'Credential expiry must be a future date when provided',
      credentialRejectionReasonRequired:
        'A reason is required when rejecting a credential',
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
      changesRequestedTitle:
        'Changes were requested for your practitioner application',
      changesRequestedBody:
        'Please update your application and resubmit. Reason: {{reason}}',
    },
  },
};
