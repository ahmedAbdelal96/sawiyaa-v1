import { UserNotificationsPresenter } from './user-notifications.presenter';

describe('UserNotificationsPresenter', () => {
  const presenter = new UserNotificationsPresenter();

  it('keeps internal action links and ignores external links', () => {
    const item = presenter.toListItem({
      id: 'notif_1',
      userId: 'user_1',
      status: 'SENT',
      channel: 'IN_APP',
      titleSnapshot: 'Session ready',
      subjectSnapshot: null,
      bodySnapshot: 'Your session can be opened now.',
      readAt: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: {
        action: {
          type: 'INTERNAL_LINK',
          href: '/en/patient/sessions/session_1',
          label: 'Open session',
        },
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    } as never);

    expect(item.action).toEqual({
      type: 'INTERNAL_LINK',
      href: '/en/patient/sessions/session_1',
      label: 'Open session',
    });

    const blocked = presenter.toListItem({
      id: 'notif_2',
      userId: 'user_1',
      status: 'SENT',
      channel: 'IN_APP',
      titleSnapshot: 'Session ready',
      subjectSnapshot: null,
      bodySnapshot: 'Your session can be opened now.',
      readAt: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: {
        action: {
          type: 'INTERNAL_LINK',
          href: 'https://provider.example/room',
          label: 'Open session',
        },
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    } as never);

    expect(blocked.action).toBeNull();
  });

  it('filters payload fields to a frontend-safe subset', () => {
    const item = presenter.toListItem({
      id: 'notif_3',
      userId: 'user_1',
      status: 'SENT',
      channel: 'IN_APP',
      titleSnapshot: 'Session ready',
      subjectSnapshot: null,
      bodySnapshot: 'Your session can be opened now.',
      readAt: null,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      payloadJson: {
        routePath: '/en/patient/sessions/session_1',
        sessionId: 'session_1',
        recipientRole: 'PATIENT',
        scheduledStartAt: '2026-05-01T10:15:00.000Z',
        joinOpenAt: '2026-05-01T10:00:00.000Z',
        ctaLabel: 'Open session',
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session_1',
        category: 'SESSION',
        idempotencyKey: 'secret-value',
        providerRoomUrl: 'https://provider.example/room',
      },
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      notificationType: {
        category: 'SESSION',
        slug: 'sessions.session-join-available',
      },
    } as never);

    expect(item.payload).toEqual({
      routePath: '/en/patient/sessions/session_1',
      sessionId: 'session_1',
      recipientRole: 'PATIENT',
      scheduledStartAt: '2026-05-01T10:15:00.000Z',
      joinOpenAt: '2026-05-01T10:00:00.000Z',
      ctaLabel: 'Open session',
      relatedEntityType: 'SESSION',
      relatedEntityId: 'session_1',
      category: 'SESSION',
    });
  });
});
