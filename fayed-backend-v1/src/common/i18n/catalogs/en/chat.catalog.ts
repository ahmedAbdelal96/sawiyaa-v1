export const enChatCatalog = {
  success: {
    conversationCreatedOrFetched: 'General chat conversation is ready',
  },
  errors: {
    participantRoleForbidden:
      'Your role is not allowed to open this general chat conversation',
    participantPairForbidden:
      'This participant pair is not allowed for general chat',
    participantNotFound: 'General chat participant was not found',
    selfConversationForbidden:
      'A user cannot open a general chat conversation with self',
    linkedSessionForbidden:
      'Linked session is not valid for this participant pair',
    conversationBoundaryViolation:
      'Conversation boundary policy violation was detected',
    conversationNotFound: 'General chat conversation was not found',
    conversationAccessDenied:
      'You do not have access to this general chat conversation',
    conversationNotSendable:
      'Conversation state does not allow sending messages',
    messageNotFound: 'General chat message was not found',
    messageContentRequired: 'Message content is required',
    attachmentRefInvalid: 'Attachment reference payload is invalid',
  },
};
