import { NotFoundException } from '@nestjs/common';
import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { GetAdminGeneralChatConversationUseCase } from './get-admin-general-chat-conversation.use-case';

describe('GetAdminGeneralChatConversationUseCase', () => {
  const adminGeneralChatRepository = {
    findConversationById: jest.fn(),
    getConversationStats: jest.fn(),
  } as unknown as AdminGeneralChatRepository;

  const useCase = new GetAdminGeneralChatConversationUseCase(
    adminGeneralChatRepository,
    new GeneralChatModerationStateService(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when conversation is missing', async () => {
    (adminGeneralChatRepository.findConversationById as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({ conversationId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns moderation state and counts for the conversation', async () => {
    (adminGeneralChatRepository.findConversationById as jest.Mock).mockResolvedValue({
      id: 'conv_1',
      status: 'OPEN',
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
      sessionId: 'session_1',
      session: {
        id: 'session_1',
        sessionCode: 'S-001',
        scheduledStartAt: new Date('2026-05-21T10:00:00.000Z'),
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
          attachments: [],
        },
      ],
    });
    (adminGeneralChatRepository.getConversationStats as jest.Mock).mockResolvedValue(
      new Map([
        [
          'conv_1',
          {
            messagesCount: 1,
            attachmentsCount: 0,
          },
        ],
      ]),
    );

    const result = await useCase.execute({ conversationId: 'conv_1' });

    expect(result.item.conversationId).toBe('conv_1');
    expect(result.item.status).toBe('ACTIVE');
    expect(result.item.canSendMessage).toBe(true);
    expect(result.item.messagesCount).toBe(1);
    expect(result.item.lastMessagePreviewType).toBe('TEXT_MESSAGE');
    expect(result.item.session.sessionId).toBe('session_1');
  });
});
