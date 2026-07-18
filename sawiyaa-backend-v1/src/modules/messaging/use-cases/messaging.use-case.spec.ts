import { MessagingUseCase } from './messaging.use-case';

describe('MessagingUseCase unread summary', () => {
  it('exposes one shared support pending count to every support employee', async () => {
    const repository = {
      listConversations: jest.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      countSupportNeedsReply: jest.fn().mockResolvedValue(2),
    };
    const permissionResolver = {
      hasPermissions: jest.fn().mockResolvedValue(true),
    };
    const useCase = new MessagingUseCase(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      permissionResolver as never,
      {} as never,
    );
    const actor = { id: 'support-1', roles: ['SUPPORT_AGENT'] } as never;

    await expect(useCase.getUnreadSummary(actor)).resolves.toEqual({
      item: {
        unreadCount: 0,
        hasUnread: true,
        needsSupportReplyCount: 2,
      },
    });
    await expect(useCase.getUnreadSummary({ id: 'support-2', roles: ['SUPPORT_AGENT'] } as never))
      .resolves.toMatchObject({ item: { needsSupportReplyCount: 2 } });
    expect(repository.countSupportNeedsReply).toHaveBeenCalledTimes(2);
    expect(permissionResolver.hasPermissions).toHaveBeenCalledTimes(2);
  });

  it('blocks support staff without chat read permission before listing conversations', async () => {
    const repository = { listConversations: jest.fn() };
    const permissionResolver = {
      hasPermissions: jest.fn().mockResolvedValue(false),
    };
    const useCase = new MessagingUseCase(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      permissionResolver as never,
      {} as never,
    );

    await expect(
      useCase.listConversations({ id: 'support-1', roles: ['SUPPORT_AGENT'] } as never),
    ).rejects.toMatchObject({
      response: { errorCode: 'MESSAGING_CONVERSATION_ACCESS_DENIED' },
    });
    expect(repository.listConversations).not.toHaveBeenCalled();
  });
});

describe('MessagingUseCase canonical send publication', () => {
  const actor = { id: 'patient-1', roles: [] } as never;
  const conversation = {
    id: 'conversation-1',
    conversationType: 'SYSTEM',
    status: 'OPEN',
    sessionId: null,
    supportTicketId: null,
    supportTicket: null,
    createdAt: new Date('2026-07-18T10:00:00.000Z'),
    updatedAt: new Date('2026-07-18T10:00:00.000Z'),
    closedAt: null,
    expiresAt: null,
    adminSendingDisabledAt: null,
    adminSendingEnabledAt: null,
    practitionerSendingDisabledAt: null,
    practitionerSendingEnabledAt: null,
    participants: [
      {
        userId: 'patient-1',
        participantRole: 'PATIENT',
        lastReadMessageId: null,
        lastReadAt: null,
      },
    ],
    messages: [],
    session: null,
    chatApprovalRequest: null,
  };

  function createUseCase(stored: { created: boolean }) {
    const repository = {
      findConversation: jest.fn().mockResolvedValue(conversation),
      loadUsers: jest.fn().mockResolvedValue([]),
      appendMessage: jest.fn().mockResolvedValue({
        created: stored.created,
        message: {
          id: stored.created ? 'message-1' : 'message-existing',
          conversationId: 'conversation-1',
          senderUserId: 'patient-1',
          messageType: 'TEXT',
          status: 'SENT',
          contentText: 'hello',
          sentAt: new Date('2026-07-18T10:01:00.000Z'),
          deliveredAt: null,
          readAt: null,
        },
      }),
    };
    const publisher = { publishNewMessage: jest.fn() };
    const useCase = new MessagingUseCase(
      repository as never,
      { canSend: jest.fn().mockReturnValue({ allowed: true }) } as never,
      { presentMessage: jest.fn().mockReturnValue({ id: 'message-1' }) } as never,
      { notifyConversationMessage: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      { hasPermissions: jest.fn().mockResolvedValue(true) } as never,
      publisher as never,
    );
    return { useCase, repository, publisher };
  }

  it('publishes exactly once for a newly created keyed message', async () => {
    const { useCase, publisher } = createUseCase({ created: true });

    await useCase.sendMessage(actor, 'conversation-1', 'hello', [], 'message-key-1');

    expect(publisher.publishNewMessage).toHaveBeenCalledTimes(1);
  });

  it('does not publish a deduplicated keyed retry', async () => {
    const { useCase, publisher } = createUseCase({ created: false });

    await useCase.sendMessage(actor, 'conversation-1', 'hello', [], 'message-key-1');

    expect(publisher.publishNewMessage).not.toHaveBeenCalled();
  });
});
