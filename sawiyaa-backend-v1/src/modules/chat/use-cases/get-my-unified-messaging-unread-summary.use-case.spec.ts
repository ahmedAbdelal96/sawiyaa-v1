import { AppRole } from '@common/enums/app-role.enum';
import { GetMyUnifiedMessagingUnreadSummaryUseCase } from './get-my-unified-messaging-unread-summary.use-case';

describe('GetMyUnifiedMessagingUnreadSummaryUseCase', () => {
  const generalChatRepository = {
    countSessionUnreadForUser: jest.fn(),
  };
  const supportTicketRepository = {
    countUnreadForUser: jest.fn(),
  };
  const careChatConversationRepository = {
    countUnreadForUser: jest.fn(),
  };

  const useCase = new GetMyUnifiedMessagingUnreadSummaryUseCase(
    generalChatRepository as never,
    supportTicketRepository as never,
    careChatConversationRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the authenticated Admin support scope and preserves message totals', async () => {
    supportTicketRepository.countUnreadForUser.mockResolvedValue({
      unreadMessages: 5,
      unreadConversations: 2,
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'admin-1', roles: [AppRole.ADMIN] },
    });

    expect(supportTicketRepository.countUnreadForUser).toHaveBeenCalledWith({
      userId: 'admin-1',
      adminLike: true,
    });
    expect(result.item.totalUnreadMessages).toBe(5);
    expect(result.item.totalUnreadConversations).toBe(2);
    expect(generalChatRepository.countSessionUnreadForUser).not.toHaveBeenCalled();
    expect(careChatConversationRepository.countUnreadForUser).not.toHaveBeenCalled();
  });

  it('uses the same participant-scoped counters for a Patient', async () => {
    generalChatRepository.countSessionUnreadForUser.mockResolvedValue({
      unreadMessages: 1,
      unreadConversations: 1,
    });
    supportTicketRepository.countUnreadForUser.mockResolvedValue({
      unreadMessages: 2,
      unreadConversations: 1,
    });
    careChatConversationRepository.countUnreadForUser.mockResolvedValue({
      unreadMessages: 3,
      unreadConversations: 1,
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'patient-1', roles: [AppRole.PATIENT] },
    });

    expect(result.item.totalUnreadMessages).toBe(6);
    expect(result.item.totalUnreadConversations).toBe(3);
    expect(supportTicketRepository.countUnreadForUser).toHaveBeenCalledWith({
      userId: 'patient-1',
      adminLike: false,
    });
  });
});
