import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { ListAdminGeneralChatConversationsUseCase } from './list-admin-general-chat-conversations.use-case';

describe('ListAdminGeneralChatConversationsUseCase', () => {
  const adminGeneralChatRepository = {
    buildSessionConversationWhere: jest.fn(),
    buildStatusWhere: jest.fn(),
    listConversations: jest.fn(),
    getConversationStats: jest.fn(),
  } as unknown as AdminGeneralChatRepository;

  const useCase = new ListAdminGeneralChatConversationsUseCase(
    adminGeneralChatRepository,
    new GeneralChatModerationStateService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps rows into safe list items without leaking message text', async () => {
    (adminGeneralChatRepository.buildSessionConversationWhere as jest.Mock).mockReturnValue(
      {},
    );
    (adminGeneralChatRepository.buildStatusWhere as jest.Mock).mockReturnValue({});
    (adminGeneralChatRepository.listConversations as jest.Mock).mockResolvedValue([
      [
        {
          id: 'conv_1',
          conversationRef: 'gc_1',
          status: 'OPEN',
          sessionId: 'session_1',
          startedAt: new Date('2026-05-21T09:00:00.000Z'),
          closedAt: null,
          adminSendingDisabledAt: null,
          adminSendingDisabledByUserId: null,
          adminSendingDisabledReason: null,
          adminSendingEnabledAt: null,
          adminSendingEnabledByUserId: null,
          practitionerSendingDisabledAt: null,
          practitionerSendingDisabledByUserId: null,
          practitionerSendingDisabledReason: null,
          practitionerSendingEnabledAt: null,
          practitionerSendingEnabledByUserId: null,
          createdAt: new Date('2026-05-21T09:00:00.000Z'),
          updatedAt: new Date('2026-05-21T09:30:00.000Z'),
          session: {
            id: 'session_1',
            sessionCode: 'S-001',
            scheduledStartAt: new Date('2026-05-21T10:00:00.000Z'),
            scheduledEndAt: new Date('2026-05-21T11:00:00.000Z'),
            status: 'SCHEDULED',
            createdAt: new Date('2026-05-21T09:00:00.000Z'),
          },
          patient: {
            id: 'patient_1',
            displayName: 'Patient Name',
            userId: 'user_patient',
            user: {
              displayName: 'Patient User',
              emails: [{ email: 'patient@example.com' }],
            },
          },
          practitioner: {
            id: 'practitioner_1',
            userId: 'user_practitioner',
            user: {
              displayName: 'Practitioner User',
              emails: [{ email: 'practitioner@example.com' }],
            },
          },
          participants: [],
          messages: [
            {
              id: 'message_1',
              senderUserId: 'user_patient',
              contentText: 'Hello',
              sentAt: new Date('2026-05-21T09:45:00.000Z'),
              attachments: [{ fileUrl: '/files/file_1' }],
            },
          ],
        },
      ],
      1,
    ]);
    (adminGeneralChatRepository.getConversationStats as jest.Mock).mockResolvedValue(
      new Map([
        [
          'conv_1',
          {
            messagesCount: 1,
            attachmentsCount: 1,
          },
        ],
      ]),
    );

    const result = await useCase.execute({
      query: {
        page: 1,
        limit: 20,
        sortBy: 'updatedAt',
        sortDirection: 'desc',
      },
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        conversationId: 'conv_1',
        sessionCode: 'S-001',
        patientName: 'Patient User',
        practitionerName: 'Practitioner User',
        lastMessagePreviewType: 'TEXT_WITH_ATTACHMENT',
        messagesCount: 1,
        attachmentsCount: 1,
        status: 'ACTIVE',
        canSendMessage: true,
      }),
    );
  });
});
