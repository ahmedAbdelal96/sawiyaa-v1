import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class NotificationLifecycleService {
  private readonly terminalStatuses: NotificationStatus[] = [
    NotificationStatus.SENT,
    NotificationStatus.DELIVERED,
    NotificationStatus.READ,
    NotificationStatus.FAILED,
    NotificationStatus.CANCELLED,
    NotificationStatus.SUPPRESSED,
  ];

  isTerminal(status: NotificationStatus): boolean {
    return this.terminalStatuses.includes(status);
  }

  assertCanBeClaimedForExecution(status: NotificationStatus): void {
    if (status !== NotificationStatus.PENDING) {
      throw new BadRequestException({
        messageKey: 'notifications.errors.invalidClaimTransition',
        error: 'NOTIFICATION_INVALID_CLAIM_TRANSITION',
      });
    }
  }

  assertCanExecuteClaimedNotification(status: NotificationStatus): void {
    if (status !== NotificationStatus.QUEUED) {
      throw new BadRequestException({
        messageKey: 'notifications.errors.invalidExecutionTransition',
        error: 'NOTIFICATION_INVALID_EXECUTION_TRANSITION',
      });
    }
  }
}
