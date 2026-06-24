import { NotificationChannel, NotificationCategory } from '@prisma/client';
import { NotificationIntentWriterService } from './notification-intent-writer.service';

describe('NotificationIntentWriterService', () => {
  it('creates email notifications as pending queue items with safe payload data', async () => {
    const repository = {
      findTypeBySlug: jest.fn().mockResolvedValue({
        id: 'type-1',
        supportsEmail: true,
        templates: [
          {
            id: 'template-1',
            channel: NotificationChannel.EMAIL,
          },
        ],
      }),
      findPreference: jest.fn().mockResolvedValue(null),
      createEmailNotification: jest.fn().mockResolvedValue({
        id: 'notification-1',
      }),
    };

    const service = new NotificationIntentWriterService(repository as never);

    await service.createEmailNotification({
      slug: 'sessions.session-join-available',
      userId: 'user-1',
      email: 'patient@example.com',
      subject: 'Subject',
      title: 'Title',
      body: 'Body',
      payload: {
        sessionId: 'session-1',
        recipientRole: 'PATIENT',
        routePath: '/en/patient/sessions/session-1',
        scheduledStartAt: '2026-05-01T10:15:00.000Z',
        joinOpenAt: '2026-05-01T10:00:00.000Z',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session-1',
      idempotencyKey: 'sessions.session-join-available:email:session-1:user-1',
      category: NotificationCategory.SESSION,
    });

    expect(repository.findPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      notificationTypeId: 'type-1',
      channel: NotificationChannel.EMAIL,
    });
    expect(repository.createEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        notificationTypeId: 'type-1',
        templateId: 'template-1',
        idempotencyKey:
          'sessions.session-join-available:email:session-1:user-1',
        isSuppressed: false,
      }),
    );
  });

  it('skips email notifications when no usable recipient email is available', async () => {
    const repository = {
      findTypeBySlug: jest.fn(),
      findPreference: jest.fn(),
      createEmailNotification: jest.fn(),
    };

    const service = new NotificationIntentWriterService(repository as never);

    await expect(
      service.createEmailNotification({
        slug: 'sessions.session-join-available',
        userId: 'user-1',
        email: '   ',
        subject: 'Subject',
        title: 'Title',
        body: 'Body',
      }),
    ).resolves.toBeNull();
    expect(repository.findTypeBySlug).not.toHaveBeenCalled();
    expect(repository.createEmailNotification).not.toHaveBeenCalled();
  });

  it('suppresses email notifications when the preference disables the channel', async () => {
    const repository = {
      findTypeBySlug: jest.fn().mockResolvedValue({
        id: 'type-1',
        supportsEmail: true,
        templates: [
          {
            id: 'template-1',
            channel: NotificationChannel.EMAIL,
          },
        ],
      }),
      findPreference: jest.fn().mockResolvedValue({
        isEnabled: false,
      }),
      createEmailNotification: jest.fn().mockResolvedValue({
        id: 'notification-1',
      }),
    };

    const service = new NotificationIntentWriterService(repository as never);

    await service.createEmailNotification({
      slug: 'sessions.session-join-available',
      userId: 'user-1',
      email: 'patient@example.com',
      subject: 'Subject',
      title: 'Title',
      body: 'Body',
      payload: {
        sessionId: 'session-1',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session-1',
      idempotencyKey: 'sessions.session-join-available:email:session-1:user-1',
      category: NotificationCategory.SESSION,
    });

    expect(repository.findPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      notificationTypeId: 'type-1',
      channel: NotificationChannel.EMAIL,
    });
    expect(repository.createEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        isSuppressed: true,
      }),
    );
  });

  it('suppresses in-app notifications when the preference disables the channel', async () => {
    const repository = {
      findTypeBySlug: jest.fn().mockResolvedValue({
        id: 'type-1',
        supportsInApp: true,
        templates: [
          {
            id: 'template-1',
            channel: NotificationChannel.IN_APP,
          },
        ],
      }),
      findPreference: jest.fn().mockResolvedValue({
        isEnabled: false,
      }),
      createInAppNotification: jest.fn().mockResolvedValue(null),
    };

    const service = new NotificationIntentWriterService(repository as never);

    await service.createInAppNotification({
      slug: 'sessions.session-join-available',
      userId: 'user-1',
      title: 'Title',
      body: 'Body',
      payload: {
        action: {
          type: 'INTERNAL_LINK',
          href: '/patient/sessions/session-1',
          label: 'Open',
        },
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session-1',
      idempotencyKey: 'session-1:user-1',
      category: NotificationCategory.SESSION,
    });

    expect(repository.findPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      notificationTypeId: 'type-1',
      channel: NotificationChannel.IN_APP,
    });
    expect(repository.createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        isSuppressed: true,
      }),
    );
  });
});
