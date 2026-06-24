import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { ListAdminGeneralChatMessagesUseCase } from './list-admin-general-chat-messages.use-case';

describe('ListAdminGeneralChatMessagesUseCase', () => {
  const adminGeneralChatRepository = {
    findConversationById: jest.fn(),
    listMessages: jest.fn(),
    extractAttachmentFileId: jest.fn(),
  } as unknown as AdminGeneralChatRepository;

  const useCase = new ListAdminGeneralChatMessagesUseCase(
    adminGeneralChatRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps message sender and attachment summaries safely', async () => {
    (adminGeneralChatRepository.findConversationById as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      patient: {
        id: 'patient_1',
        userId: 'user_patient',
        displayName: 'Patient Name',
        user: { displayName: 'Patient User', emails: [] },
      },
      practitioner: {
        id: 'practitioner_1',
        userId: 'user_practitioner',
        user: { displayName: 'Practitioner User', emails: [] },
      },
      participants: [
        { userId: 'user_patient', participantRole: 'PATIENT' },
        { userId: 'user_practitioner', participantRole: 'PRACTITIONER' },
      ],
    });
    (adminGeneralChatRepository.listMessages as jest.Mock).mockResolvedValue([
      [
        {
          id: 'message_1',
          senderUserId: 'user_patient',
          messageType: 'TEXT',
          status: 'SENT',
          contentText: 'Hello',
          sentAt: new Date('2026-05-21T09:45:00.000Z'),
          deliveredAt: null,
          readAt: null,
          editedAt: null,
          deletedAt: null,
          attachments: [
            {
              storageProvider: 'ref:file_1',
              fileUrl: 'https://cdn.example.com/file_1.pdf',
              mimeType: 'application/pdf',
              fileSize: 1200,
              originalName: 'note.pdf',
            },
          ],
        },
      ],
      1,
    ]);
    (adminGeneralChatRepository.extractAttachmentFileId as jest.Mock).mockReturnValue(
      'file_1',
    );

    const result = await useCase.execute({
      conversationId: 'conv_1',
      page: 1,
      limit: 20,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        messageId: 'message_1',
        senderRole: 'PATIENT',
        senderName: 'Patient User',
        body: 'Hello',
        attachments: [
          expect.objectContaining({
            fileId: 'file_1',
            fileUrl: '/api/v1/admin/chat/conversations/conv_1/attachments/file_1',
          }),
        ],
      }),
    );
  });
});
