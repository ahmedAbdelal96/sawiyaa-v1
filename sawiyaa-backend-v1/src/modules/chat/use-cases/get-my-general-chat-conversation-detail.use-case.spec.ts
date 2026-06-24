import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationAccessPolicy } from '../policies/conversation-access.policy';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { GetMyGeneralChatConversationDetailUseCase } from './get-my-general-chat-conversation-detail.use-case';

describe('GetMyGeneralChatConversationDetailUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    countUnreadMessagesForParticipant: jest.fn(),
  } as unknown as GeneralChatRepository;

  const useCase = new GetMyGeneralChatConversationDetailUseCase(
    generalChatRepository,
    new ConversationAccessPolicy(),
    new GeneralChatAvailabilityService(new GeneralChatModerationStateService()),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when conversation does not exist in general chat scope', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when requester is not an active participant', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
      ).mockResolvedValue({
      id: 'conv_1',
      conversationRef: 'gc_1',
      status: 'OPEN',
      sessionId: null,
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
      session: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-01T09:10:00.000Z'),
      participants: [
        {
          userId: 'someone_else',
          participantRole: 'PATIENT',
          lastReadMessageId: null,
          lastReadAt: null,
        },
      ],
      messages: [],
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns safe empty message state when no messages exist yet', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
      ).mockResolvedValue({
      id: 'conv_1',
      conversationRef: 'gc_1',
      status: 'OPEN',
      sessionId: null,
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
      session: null,
      createdAt: new Date('2026-04-01T09:00:00.000Z'),
      updatedAt: new Date('2026-04-01T09:10:00.000Z'),
      participants: [
        {
          userId: 'user_1',
          participantRole: 'PATIENT',
          lastReadMessageId: null,
          lastReadAt: null,
        },
      ],
      messages: [],
    });
    (
      generalChatRepository.countUnreadMessagesForParticipant as jest.Mock
    ).mockResolvedValue(0);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      conversationId: 'conv_1',
    });

    expect(result.item.latestMessage).toBeNull();
    expect(result.item.hasMessages).toBe(false);
    expect(result.item.unreadCount).toBe(0);
    expect(result.item.hasUnread).toBe(false);
    expect(result.item.lastReadMessageId).toBeNull();
    expect(result.item.lastReadAt).toBeNull();
    expect(result.item.chatAvailability).toEqual({
      canRead: true,
      canSend: true,
      readOnly: false,
      reason: 'ALLOWED',
    });
  });
});
