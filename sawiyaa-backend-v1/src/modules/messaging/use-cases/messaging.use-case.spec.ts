import { MessagingUseCase } from './messaging.use-case';

describe('MessagingUseCase unread summary', () => {
  it('exposes one shared support pending count to every support employee', async () => {
    const repository = {
      listConversations: jest.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      countSupportNeedsReply: jest.fn().mockResolvedValue(2),
    };
    const useCase = new MessagingUseCase(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
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
  });
});
