import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { ListMyNotificationsDto } from '../dto/list-my-notifications.dto';
import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';

@Injectable()
export class ListMyNotificationsUseCase {
  constructor(
    private readonly repository: UserNotificationRepository,
    private readonly presenter: UserNotificationsPresenter,
  ) {}

  async execute(input: {
    authenticatedUser: AuthenticatedUser;
    query: ListMyNotificationsDto;
  }) {
    const page = Math.max(1, input.query.page ?? 1);
    const limit = Math.min(Math.max(input.query.limit ?? 10, 1), 20);

    const [rows, hasNextPage] = await this.repository.listMyInAppNotifications({
      userId: input.authenticatedUser.id,
      page,
      limit,
    });

    return this.presenter.presentList({
      items: rows,
      page,
      limit,
      hasNextPage,
    });
  }
}
