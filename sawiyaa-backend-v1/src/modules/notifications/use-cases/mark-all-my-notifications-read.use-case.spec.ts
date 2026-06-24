import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';
import { MarkAllMyNotificationsReadUseCase } from './mark-all-my-notifications-read.use-case';

describe('MarkAllMyNotificationsReadUseCase', () => {
  const repository = {
    markAllMyNotificationsRead: jest.fn(),
  } as unknown as UserNotificationRepository;
  const presenter = {
    presentBulkReadResult: jest.fn().mockImplementation((count) => ({
      item: {
        updatedCount: count,
      },
    })),
  } as unknown as UserNotificationsPresenter;

  const useCase = new MarkAllMyNotificationsReadUseCase(repository, presenter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks unread notifications as read with a bulk update', async () => {
    (repository.markAllMyNotificationsRead as jest.Mock).mockResolvedValue({
      count: 7,
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
    });

    expect(result).toEqual({
      item: {
        updatedCount: 7,
      },
    });
    expect(repository.markAllMyNotificationsRead).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        now: expect.any(Date),
      }),
    );
  });
});
