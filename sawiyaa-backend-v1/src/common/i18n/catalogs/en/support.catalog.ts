export const enSupportCatalog = {
  success: {
    ticketCreated: 'Support ticket created successfully',
    ticketListed: 'Support tickets retrieved successfully',
    ticketDetails: 'Support ticket details retrieved successfully',
    messageAdded: 'Support message added successfully',
    internalNoteAdded: 'Support internal note added successfully',
    statusUpdated: 'Support ticket status updated successfully',
    assignmentUpdated: 'Support ticket assignment updated successfully',
  },
  errors: {
    supportRoleRequired: 'Support role is required for this route',
    patientProfileNotFound: 'Patient profile is required for support access',
    practitionerProfileNotFound:
      'Practitioner profile is required for support access',
    ticketNotFound: 'Support ticket was not found',
    ticketForbidden: 'You cannot access this support ticket',
    invalidStatusTransition: 'Support ticket status transition is invalid',
    invalidAssignedUser:
      'Assigned support user must have admin or support role',
    invalidRelatedSession: 'Related session is invalid for current owner',
    invalidRelatedPayment: 'Related payment is invalid for current owner',
    invalidRelatedInstantBookingRequest:
      'Related instant booking request is invalid for current owner',
    invalidRelatedMatchingSession:
      'Related matching session is invalid for current owner',
    invalidRelatedAssessmentSubmission:
      'Related assessment submission is invalid for current owner',
    unsupportedPractitionerRelatedEntity:
      'This related entity type is not supported for practitioner support tickets',
  },
};
