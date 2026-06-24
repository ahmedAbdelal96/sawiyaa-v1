import { AdminGeneralChatRepository } from '../repositories/admin-general-chat.repository';
import { EnableAdminGeneralChatConversationUseCase } from './enable-admin-general-chat-conversation.use-case';

describe('EnableAdminGeneralChatConversationUseCase', () => {
  const adminGeneralChatRepository = {
    updateConversationModeration: jest.fn(),
  } as unknown as AdminGeneralChatRepository;

  const useCase = new EnableAdminGeneralChatConversationUseCase(
    adminGeneralChatRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the admin lock without touching practitioner lock fields', async () => {
    (
      adminGeneralChatRepository.updateConversationModeration as jest.Mock
    ).mockResolvedValue({
      id: 'conv_1',
      updatedAt: new Date('2026-05-21T11:00:00.000Z'),
    });

    await useCase.execute({
      conversationId: 'conv_1',
      userId: 'admin-user',
      note: 'Re-enable',
    });

    expect(adminGeneralChatRepository.updateConversationModeration).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_1',
        data: expect.objectContaining({
          adminSendingDisabledAt: null,
          adminSendingDisabledByUserId: null,
          adminSendingDisabledReason: null,
          adminSendingEnabledByUserId: 'admin-user',
          adminSendingEnabledAt: expect.any(Date),
        }),
      }),
    );
  });
});
