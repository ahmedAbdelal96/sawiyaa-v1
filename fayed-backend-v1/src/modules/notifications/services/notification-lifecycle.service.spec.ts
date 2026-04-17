import { BadRequestException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { NotificationLifecycleService } from './notification-lifecycle.service';

describe('NotificationLifecycleService', () => {
  const service = new NotificationLifecycleService();

  it('marks terminal statuses correctly', () => {
    expect(service.isTerminal(NotificationStatus.SENT)).toBe(true);
    expect(service.isTerminal(NotificationStatus.FAILED)).toBe(true);
    expect(service.isTerminal(NotificationStatus.SUPPRESSED)).toBe(true);
    expect(service.isTerminal(NotificationStatus.PENDING)).toBe(false);
    expect(service.isTerminal(NotificationStatus.QUEUED)).toBe(false);
  });

  it('allows claim transition only from pending', () => {
    expect(() =>
      service.assertCanBeClaimedForExecution(NotificationStatus.PENDING),
    ).not.toThrow();
    expect(() =>
      service.assertCanBeClaimedForExecution(NotificationStatus.QUEUED),
    ).toThrow(BadRequestException);
  });

  it('allows execution transition only from queued', () => {
    expect(() =>
      service.assertCanExecuteClaimedNotification(NotificationStatus.QUEUED),
    ).not.toThrow();
    expect(() =>
      service.assertCanExecuteClaimedNotification(NotificationStatus.PENDING),
    ).toThrow(BadRequestException);
  });
});
