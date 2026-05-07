import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';
import { ListMyNotificationsUseCase } from './list-my-notifications.use-case';

describe('ListMyNotificationsUseCase', () => {
  const repository = {
    listMyInAppNotifications: jest.fn(),
  } as unknown as UserNotificationRepository;
  const presenter = {
    presentList: jest.fn().mockReturnValue({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        hasNextPage: false,
        nextPage: null,
      },
    }),
  } as unknown as UserNotificationsPresenter;

  const useCase = new ListMyNotificationsUseCase(repository, presenter);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists the current user notifications with a bounded limit', async () => {
    (repository.listMyInAppNotifications as jest.Mock).mockResolvedValue([
      [],
      false,
    ]);

    await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      query: { page: 1, limit: 50 },
    });

    expect(repository.listMyInAppNotifications).toHaveBeenCalledWith({
      userId: 'user_1',
      page: 1,
      limit: 20,
    });
  });
});

