import {
  AuditEventSource,
  NotificationCategory,
  NotificationStatus,
  UserRoleType,
} from '@prisma/client';
import { AdminAuditPresenter } from './admin-audit.presenter';

describe('AdminAuditPresenter', () => {
  const presenter = new AdminAuditPresenter();

  it('maps security admin actions to the ADMIN event family', () => {
    const item = presenter.toListItem({
      id: 'sec-1',
      typeSlug: 'security.adminUsers.create.success',
      category: NotificationCategory.SECURITY,
      status: NotificationStatus.SENT,
      source: AuditEventSource.SYSTEM,
      actorUserId: 'actor-1',
      targetEntityType: 'User',
      targetEntityId: 'user-1',
      titleSnapshot: 'security.adminUsers.create.success',
      subjectSnapshot: 'User:user-1',
      bodySnapshot: null,
      suppressedReason: null,
      occurredAt: new Date('2026-05-13T07:05:12.074Z'),
      createdAt: new Date('2026-05-13T07:05:12.074Z'),
      updatedAt: new Date('2026-05-13T07:05:12.074Z'),
      actorUser: {
        displayName: 'Admin One',
        roles: [{ role: UserRoleType.SUPER_ADMIN }],
      },
    });

    expect(item.eventFamily).toBe('ADMIN');
    expect(item.category).toBe(NotificationCategory.SECURITY);
    expect(item.status).toBe(NotificationStatus.SENT);
  });

  it('maps security step-up events to the AUTH family', () => {
    const item = presenter.toListItem({
      id: 'sec-2',
      typeSlug: 'security.step_up.verify.success',
      category: NotificationCategory.SECURITY,
      status: NotificationStatus.SENT,
      source: AuditEventSource.SYSTEM,
      actorUserId: 'actor-2',
      targetEntityType: 'User',
      targetEntityId: 'user-2',
      titleSnapshot: 'security.step_up.verify.success',
      subjectSnapshot: 'User:user-2',
      bodySnapshot: null,
      suppressedReason: null,
      occurredAt: new Date('2026-05-13T07:05:12.074Z'),
      createdAt: new Date('2026-05-13T07:05:12.074Z'),
      updatedAt: new Date('2026-05-13T07:05:12.074Z'),
      actorUser: {
        displayName: 'Security Admin',
        roles: [{ role: UserRoleType.ADMIN }],
      },
    });

    expect(item.eventFamily).toBe('AUTH');
  });
});
