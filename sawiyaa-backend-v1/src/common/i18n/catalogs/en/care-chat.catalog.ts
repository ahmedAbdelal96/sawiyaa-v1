export const enCareChatCatalog = {
  notifications: {
    requestApprovedTitle: 'Care chat approved',
    requestApprovedBody:
      'Your care-chat request was approved. Open the conversation to continue.',
    requestRejectedTitle: 'Care chat not approved',
    requestRejectedBody:
      'Your care-chat request was not approved. Review the request details for the next step.',
    requestRevokedTitle: 'Care chat updated',
    requestRevokedBody:
      'Your care-chat access was updated. Open the conversation or request details to review the latest state.',
  },
  success: {
    requestCreated: 'Care chat request created successfully',
    requestListed: 'Care chat requests retrieved successfully',
    requestDetails: 'Care chat request details retrieved successfully',
    requestDecided: 'Care chat request decision applied successfully',
    requestRevoked: 'Care chat request revoked successfully',
    conversationDetails:
      'Care chat conversation details retrieved successfully',
    messageSent: 'Care chat message sent successfully',
  },
  errors: {
    patientProfileNotFound: 'Patient profile was not found',
    practitionerProfileNotFound: 'Practitioner profile was not found',
    practitionerNotFound: 'Practitioner was not found for care chat request',
    requestNotFound: 'Care chat approval request was not found',
    conversationNotFound: 'Care chat conversation was not found',
    invalidLinkedSession:
      'Linked session is invalid for current patient/practitioner pair',
    activeRequestAlreadyExists:
      'An active care chat request already exists for this patient and practitioner',
    requestExpired: 'Care chat approval request has expired',
    invalidApprovalDecisionTransition:
      'Care chat approval decision transition is invalid',
    invalidRevokeTransition: 'Care chat revoke transition is invalid',
    conversationInactiveForSend:
      'Care chat conversation is inactive; sending new messages is not allowed',
  },
};
