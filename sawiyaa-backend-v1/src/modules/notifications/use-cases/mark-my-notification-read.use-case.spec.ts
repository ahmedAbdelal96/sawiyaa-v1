import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { UserNotificationsPresenter } from '../presenters/user-notifications.presenter';
import { UserNotificationRepository } from '../repositories/user-notification.repository';
import { MarkMyNotificationReadUseCase } from './mark-my-notification-read.use-case';
import { NotificationContextEnrichmentService } from '../services/notification-context-enrichment.service';

describe('MarkMyNotificationReadUseCase', () => {
  const repository = {
    findMyNotificationById: jest.fn(),
    markMyNotificationRead: jest.fn(),
  } as unknown as UserNotificationRepository;
  const presenter = {
    presentReadResult: jest.fn().mockImplementation((item) => ({ item })),
  } as unknown as UserNotificationsPresenter;
  const enrichmentService = {
    enrichOne: jest.fn().mockResolvedValue({ context: {}, primaryAction: { kind: 'details' } }),
  } as unknown as NotificationContextEnrichmentService;

  const useCase = new MarkMyNotificationReadUseCase(repository, presenter, enrichmentService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the existing item when the notification is already read', async () => {
    (repository.findMyNotificationById as jest.Mock).mockResolvedValue({
      id: 'notif_1',
      userId: 'user_1',
      status: NotificationStatus.READ,
      channel: 'IN_APP',
      titleSnapshot: 'Read already',
      subjectSnapshot: null,
      bodySnapshot: 'Already read',
      readAt: new Date('2026-05-01T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T09:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: {},
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    });

    const result = await useCase.execute({
      authenticatedUser: { id: 'user_1', roles: [] },
      notificationId: 'notif_1',
    });

    expect(result.item.id).toBe('notif_1');
    expect(repository.markMyNotificationRead).not.toHaveBeenCalled();
  });

  it('throws not found for missing notifications', async () => {
    (repository.findMyNotificationById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        notificationId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws forbidden for suppressed notifications', async () => {
    (repository.findMyNotificationById as jest.Mock).mockResolvedValue({
      id: 'notif_1',
      userId: 'user_1',
      status: NotificationStatus.SUPPRESSED,
      channel: 'IN_APP',
      titleSnapshot: 'Suppressed',
      subjectSnapshot: null,
      bodySnapshot: 'Suppressed',
      readAt: null,
      createdAt: new Date('2026-05-01T09:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: {},
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    });

    await expect(
      useCase.execute({
        authenticatedUser: { id: 'user_1', roles: [] },
        notificationId: 'notif_1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
