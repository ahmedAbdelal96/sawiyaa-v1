import { GeneralChatAvailabilityService } from '../services/general-chat-availability.service';
import { GeneralChatModerationStateService } from '../services/general-chat-moderation-state.service';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { ListMyGeneralChatConversationsUseCase } from './list-my-general-chat-conversations.use-case';

describe('ListMyGeneralChatConversationsUseCase', () => {
  const generalChatRepository = {
    listOwnedConversations: jest.fn(),
    countUnreadMessagesForParticipant: jest.fn(),
  } as unknown as GeneralChatRepository;

  const useCase = new ListMyGeneralChatConversationsUseCase(
    generalChatRepository,
    new GeneralChatAvailabilityService(new GeneralChatModerationStateService()),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns participant-scoped list with deterministic pagination contract', async () => {
    (
      generalChatRepository.listOwnedConversations as jest.Mock
    ).mockResolvedValue([
      [
        {
          id: 'conv_2',
          conversationRef: 'gc_b',
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
          conversationType: 'SYSTEM',
          supportTicket: null,
          chatApprovalRequest: null,
          session: null,
          createdAt: new Date('2026-04-01T09:00:00.000Z'),
          updatedAt: new Date('2026-04-01T09:30:00.000Z'),
          participants: [
            { userId: 'user_patient', participantRole: 'PATIENT' },
            { userId: 'user_practitioner', participantRole: 'PRACTITIONER' },
          ],
          messages: [],
        },
      ],
      1,
    ]);
    (
      generalChatRepository.countUnreadMessagesForParticipant as jest.Mock
    ).mockResolvedValue(0);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [] },
      query: { page: 1, limit: 20 },
    });

    expect(result).toEqual({
      items: [
        {
          conversationId: 'conv_2',
          conversationRef: 'gc_b',
          status: 'OPEN',
          linkedSessionId: null,
          participants: [
            { userId: 'user_patient', role: 'PATIENT', identity: null },
            { userId: 'user_practitioner', role: 'PRACTITIONER', identity: null },
          ],
          createdAt: '2026-04-01T09:00:00.000Z',
          latestActivityAt: '2026-04-01T09:30:00.000Z',
          latestMessage: null,
          unreadCount: 0,
          hasUnread: false,
          lastReadMessageId: null,
          lastReadAt: null,
          chatAvailability: {
            canRead: true,
            canSend: true,
            readOnly: false,
            reason: 'ALLOWED',
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        totalItems: 1,
        totalPages: 1,
      },
    });
  });

  it('uses latest message timestamp for latest activity when message exists', async () => {
    (
      generalChatRepository.listOwnedConversations as jest.Mock
    ).mockResolvedValue([
      [
        {
          id: 'conv_1',
          conversationRef: 'gc_a',
          status: 'OPEN',
          sessionId: 'session_1',
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
          conversationType: 'SYSTEM',
          supportTicket: null,
          chatApprovalRequest: null,
          createdAt: new Date('2026-04-01T09:00:00.000Z'),
          updatedAt: new Date('2026-04-01T09:30:00.000Z'),
          participants: [
            { userId: 'user_patient', participantRole: 'PATIENT' },
            { userId: 'user_practitioner', participantRole: 'PRACTITIONER' },
          ],
          session: {
            id: 'session_1',
            status: 'IN_PROGRESS',
            sessionMode: 'VIDEO',
            scheduledStartAt: new Date('2026-04-01T09:45:00.000Z'),
            scheduledEndAt: new Date('2026-04-01T10:15:00.000Z'),
            provider: 'DAILY',
            providerRoomId: 'room_1',
            providerSessionRef: 'room_1',
          },
          messages: [
            {
              id: 'message_1',
              senderUserId: 'user_practitioner',
              messageType: 'TEXT',
              contentText: 'Hello',
              sentAt: new Date('2026-04-01T10:00:00.000Z'),
            },
          ],
        },
      ],
      1,
    ]);
    (
      generalChatRepository.countUnreadMessagesForParticipant as jest.Mock
    ).mockResolvedValue(2);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_patient', roles: [] },
      query: { page: 1, limit: 20 },
    });

    expect(result.items[0].latestActivityAt).toBe('2026-04-01T10:00:00.000Z');
    expect(result.items[0].latestMessage).toEqual({
      messageId: 'message_1',
      senderUserId: 'user_practitioner',
      messageType: 'TEXT',
      previewText: 'Hello',
      sentAt: '2026-04-01T10:00:00.000Z',
      senderIdentity: null,
    });
    expect(result.items[0].chatAvailability).toEqual({
      canRead: true,
      canSend: false,
      readOnly: true,
      reason: 'SESSION_ENDED',
    });
    expect(result.items[0].unreadCount).toBe(2);
    expect(result.items[0].hasUnread).toBe(true);
  });
});
