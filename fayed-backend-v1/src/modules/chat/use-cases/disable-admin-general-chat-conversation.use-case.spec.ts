import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { DisableAdminGeneralChatConversationUseCase } from './disable-admin-general-chat-conversation.use-case';

describe('DisableAdminGeneralChatConversationUseCase', () => {
  const adminGeneralChatRepository = {
    updateConversationModeration: jest.fn(),
  } as unknown as AdminGeneralChatRepository;

  const useCase = new DisableAdminGeneralChatConversationUseCase(
    adminGeneralChatRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes the admin lock fields for moderation', async () => {
    (
      adminGeneralChatRepository.updateConversationModeration as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      updatedAt: new Date('2026-05-21T10:00:00.000Z'),
    });

    await useCase.execute({
      conversationId: 'conv_1',
      userId: 'admin-user',
      reason: 'Policy violation',
      note: 'Internal note',
    });

    expect(adminGeneralChatRepository.updateConversationModeration).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_1',
        data: expect.objectContaining({
          adminSendingDisabledByUserId: 'admin-user',
          adminSendingDisabledReason: 'Policy violation',
          adminSendingDisabledAt: expect.any(Date),
        }),
      }),
    );
  });
});
