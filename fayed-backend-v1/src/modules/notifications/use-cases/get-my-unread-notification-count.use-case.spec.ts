import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';
import { GetMyUnreadNotificationCountUseCase } from './get-my-unread-notification-count.use-case';

describe('GetMyUnreadNotificationCountUseCase', () => {
  const repository = {
    countUnreadMyInAppNotifications: jest.fn(),
  } as unknown as UserNotificationRepository;
  const presenter = {
    presentUnreadCount: jest.fn().mockReturnValue({
      item: {
        unreadCount: 4,
      },
    }),
  } as unknown as UserNotificationsPresenter;

  const useCase = new GetMyUnreadNotificationCountUseCase(
    repository,
    presenter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a lightweight unread count', async () => {
    (repository.countUnreadMyInAppNotifications as jest.Mock).mockResolvedValue(
      4,
    );

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
    });

    expect(result).toEqual({
      item: {
        unreadCount: 4,
      },
    });
  });
});

