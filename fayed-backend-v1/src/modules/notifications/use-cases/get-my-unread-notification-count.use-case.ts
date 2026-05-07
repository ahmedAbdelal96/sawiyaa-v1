import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';

@Injectable()
export class GetMyUnreadNotificationCountUseCase {
  constructor(
    private readonly repository: UserNotificationRepository,
    private readonly presenter: UserNotificationsPresenter,
  ) {}

  async execute(input: { authenticatedUser: AuthenticatedUser }) {
    const unreadCount =
      await this.repository.countUnreadMyInAppNotifications({
        userId: input.authenticatedUser.id,
      });

    return this.presenter.presentUnreadCount(unreadCount);
  }
}
