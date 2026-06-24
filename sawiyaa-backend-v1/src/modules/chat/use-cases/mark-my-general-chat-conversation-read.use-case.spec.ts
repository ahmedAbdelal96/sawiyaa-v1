import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GeneralChatRepository } from '../repositories/general-chat.repository';
import { MarkMyGeneralChatConversationReadUseCase } from './mark-my-general-chat-conversation-read.use-case';

describe('MarkMyGeneralChatConversationReadUseCase', () => {
  const generalChatRepository = {
    findConversationByIdInGeneralScope: jest.fn(),
    markConversationReadCursor: jest.fn(),
    countUnreadMessagesForParticipant: jest.fn(),
  } as unknown as GeneralChatRepository;

  const useCase = new MarkMyGeneralChatConversationReadUseCase(
    generalChatRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks latest message as read for participant', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      participants: [
        {
          userId: 'user_1',
          participantRole: 'PATIENT',
          lastReadMessageId: null,
          lastReadAt: null,
        },
      ],
      messages: [
        {
          id: 'msg_2',
        },
      ],
    });
    (
      generalChatRepository.countUnreadMessagesForParticipant as jest.Mock
    ).mockResolvedValue(0);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      conversationId: 'conv_1',
      dto: {},
    });

    expect(
      generalChatRepository.markConversationReadCursor,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_1',
        userId: 'user_1',
        lastReadMessageId: 'msg_2',
      }),
    );
    expect(result.item.unreadCount).toBe(0);
    expect(result.item.hasUnread).toBe(false);
  });

  it('is idempotent when already read to latest message', async () => {
    const alreadyReadAt = new Date('2026-04-01T12:00:00.000Z');
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      participants: [
        {
          userId: 'user_1',
          participantRole: 'PATIENT',
          lastReadMessageId: 'msg_2',
          lastReadAt: alreadyReadAt,
        },
      ],
      messages: [
        {
          id: 'msg_2',
        },
      ],
    });
    (
      generalChatRepository.countUnreadMessagesForParticipant as jest.Mock
    ).mockResolvedValue(0);

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      conversationId: 'conv_1',
      dto: {},
    });

    expect(
      generalChatRepository.markConversationReadCursor,
    ).not.toHaveBeenCalled();
    expect(result.item.lastReadMessageId).toBe('msg_2');
    expect(result.item.lastReadAt).toBe('2026-04-01T12:00:00.000Z');
  });

  it('rejects mark-read for non-participant', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
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
        dto: {},
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects mark-read when conversation does not exist', async () => {
    (
      generalChatRepository.findConversationByIdInGeneralScope as jest.Mock
    ).mockResolvedValue(null);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        conversationId: 'conv_missing',
        dto: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
