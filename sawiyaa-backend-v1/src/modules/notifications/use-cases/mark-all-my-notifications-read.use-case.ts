import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@common/interfaces/authenticated-user.interface';
import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';

@Injectable()
export class MarkAllMyNotificationsReadUseCase {
  constructor(
    private readonly repository: UserNotificationRepository,
    private readonly presenter: UserNotificationsPresenter,
  ) {}

  async execute(input: { authenticatedUser: AuthenticatedUser }) {
    const now = new Date();
    const updated = await this.repository.markAllMyNotificationsRead({
      userId: input.authenticatedUser.id,
      now,
    });

    return this.presenter.presentBulkReadResult(updated.count);
  }
}
