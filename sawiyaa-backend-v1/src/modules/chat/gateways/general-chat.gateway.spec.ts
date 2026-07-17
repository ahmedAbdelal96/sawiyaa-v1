import { GeneralChatGateway } from './general-chat.gateway';

const actor = { id: 'user-1', roles: ['PATIENT'] } as never;

function makeGateway() {
  const gateway = Object.create(GeneralChatGateway.prototype) as any;
  gateway.requireAuthenticatedUser = jest.fn().mockReturnValue(actor);
  gateway.assertSessionConversationAccess = jest.fn().mockResolvedValue(undefined);
  gateway.assertCareConversationAccess = jest.fn().mockResolvedValue({
    conversationId: 'care-1',
  });
  gateway.assertSupportTicketAccess = jest.fn().mockResolvedValue({
    conversationId: 'support-conversation-1',
  });
  gateway.hasOtherParticipantInRoom = jest.fn().mockResolvedValue(false);
  gateway.hasOtherCareParticipantInRoom = jest.fn().mockResolvedValue(false);
  gateway.hasOtherSupportParticipantInRoom = jest.fn().mockResolvedValue(false);
  gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
  gateway.messagingUseCase = { markRead: jest.fn().mockResolvedValue({
    item: { lastReadMessageId: 'message-1', lastReadAt: '2026-07-17T00:00:00.000Z' },
  }) };
  gateway.sendGeneralChatMessageUseCase = { execute: jest.fn().mockResolvedValue({
    item: { messageId: 'message-1', status: 'SENT', deliveredAt: null },
  }) };
  gateway.markMyGeneralChatConversationReadUseCase = { execute: jest.fn().mockResolvedValue({
    item: { lastReadMessageId: 'message-1', lastReadAt: '2026-07-17T00:00:00.000Z' },
  }) };
  gateway.sendCareMessageByActor = jest.fn().mockResolvedValue({
    messages: [{ id: 'care-message-1', status: 'SENT', deliveredAt: null }],
  });
  gateway.sendSupportMessageByActor = jest.fn().mockResolvedValue({
    messages: [{ id: 'support-message-1', status: 'SENT', deliveredAt: null }],
  });
  gateway.careChatConversationRepository = { markCareMessageDelivered: jest.fn() };
  gateway.supportTicketRepository = { markSupportMessageDelivered: jest.fn() };
  return gateway;
}

function client() {
  return {
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    emit: jest.fn(),
  } as any;
}

describe('GeneralChatGateway canonical compatibility adapters', () => {
  it('routes chat send and markRead through the existing canonical-backed use cases', async () => {
    const gateway = makeGateway();
    const socket = client();

    await expect(gateway.onSend(socket, {
      conversationId: 'session-1', clientMessageId: 'client-1', message: 'hello',
    })).resolves.toMatchObject({ ok: true, item: { messageId: 'message-1' } });
    await expect(gateway.onMarkRead(socket, {
      conversationId: 'session-1', lastReadMessageId: 'message-1',
    })).resolves.toMatchObject({ ok: true, item: { lastReadMessageId: 'message-1' } });

    expect(gateway.sendGeneralChatMessageUseCase.execute).toHaveBeenCalledTimes(1);
    expect(gateway.markMyGeneralChatConversationReadUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('routes care send and read through the canonical use case path', async () => {
    const gateway = makeGateway();
    const socket = client();

    await expect(gateway.onCareSend(socket, {
      conversationId: 'care-1', clientMessageId: 'client-1', message: 'hello',
    })).resolves.toMatchObject({ ok: true, item: { id: 'care-message-1' } });
    await expect(gateway.onCareMarkRead(socket, {
      conversationId: 'care-1', lastReadMessageId: 'care-message-1',
    })).resolves.toMatchObject({ ok: true });

    expect(gateway.sendCareMessageByActor).toHaveBeenCalledTimes(1);
    expect(gateway.messagingUseCase.markRead).toHaveBeenCalledTimes(1);
  });

  it('routes support send and read through the canonical use case path', async () => {
    const gateway = makeGateway();
    const socket = client();

    await expect(gateway.onSupportSend(socket, {
      ticketId: 'ticket-1', clientMessageId: 'client-1', message: 'hello',
    })).resolves.toMatchObject({ ok: true, item: { id: 'support-message-1' } });
    await expect(gateway.onSupportMarkRead(socket, {
      ticketId: 'ticket-1', lastReadMessageId: 'support-message-1',
    })).resolves.toMatchObject({ ok: true });

    expect(gateway.sendSupportMessageByActor).toHaveBeenCalledTimes(1);
    expect(gateway.messagingUseCase.markRead).toHaveBeenCalledTimes(1);
  });
});
