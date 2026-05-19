import {
  AuditEventSource,
  NotificationCategory,
  NotificationStatus,
  SecurityAuditOutcome,
  UserRoleType,
} from '@prisma/client';
import { OperationalNotificationRepository } from './operational-notification.repository';

describe('OperationalNotificationRepository admin audit timeline', () => {
  const auditEventFindMany = jest.fn();
  const auditEventFindUnique = jest.fn();
  const securityAuditLogFindMany = jest.fn();
  const securityAuditLogFindUnique = jest.fn();
  const userFindMany = jest.fn();

  const prisma = {
    $transaction: jest.fn((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    ),
    auditEvent: {
      findMany: auditEventFindMany,
      findUnique: auditEventFindUnique,
    },
    securityAuditLog: {
      findMany: securityAuditLogFindMany,
      findUnique: securityAuditLogFindUnique,
    },
    user: {
      findMany: userFindMany,
    },
  };

  const repository = new OperationalNotificationRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('merges security audit logs with legacy audit events and sorts newest first', async () => {
    const oldEventAt = new Date('2026-05-08T09:38:20.401Z');
    const newEventAt = new Date('2026-05-13T07:05:12.074Z');

    auditEventFindMany.mockResolvedValue([
      {
        id: 'audit-1',
        typeSlug: 'payments.refund-succeeded',
        category: NotificationCategory.PAYMENT,
        status: NotificationStatus.READ,
        source: AuditEventSource.IN_APP,
        actorUserId: 'actor-1',
        targetEntityType: 'Payment',
        targetEntityId: 'pay-1',
        titleSnapshot: 'Refund succeeded',
        subjectSnapshot: 'payment',
        bodySnapshot: 'legacy body',
        suppressedReason: null,
        occurredAt: oldEventAt,
        createdAt: oldEventAt,
        updatedAt: oldEventAt,
      },
    ]);

    securityAuditLogFindMany.mockResolvedValue([
      {
        id: 'sec-1',
        action: 'security.adminUsers.create.success',
        outcome: SecurityAuditOutcome.SUCCESS,
        actorUserId: 'actor-1',
        resourceType: 'User',
        resourceId: 'user-1',
        targetUserId: 'user-1',
        reason: null,
        metadataJson: { roles: ['ADMIN'] },
        occurredAt: newEventAt,
      },
    ]);

    userFindMany.mockResolvedValue([
      {
        id: 'actor-1',
        displayName: 'Admin One',
        roles: [{ role: UserRoleType.SUPER_ADMIN }],
      },
    ]);

    const [rows, totalItems] = await repository.listAdminAuditEvents({
      page: 1,
      limit: 20,
    });

    expect(totalItems).toBe(2);
    expect(rows.map((row) => row.id)).toEqual(['sec-1', 'audit-1']);
    expect(rows[0]).toMatchObject({
      typeSlug: 'security.adminUsers.create.success',
      category: NotificationCategory.SECURITY,
      status: NotificationStatus.SENT,
      source: AuditEventSource.SYSTEM,
      actorUserId: 'actor-1',
      targetEntityType: 'User',
      targetEntityId: 'user-1',
      titleSnapshot: 'security.adminUsers.create.success',
    });
    expect(rows[0].actorUser?.displayName).toBe('Admin One');
    expect(rows[0].bodySnapshot).toContain('"roles": [');
  });

  it('falls back to security audit logs when the event is not in legacy audit events', async () => {
    const eventAt = new Date('2026-05-13T07:05:12.074Z');

    auditEventFindUnique.mockResolvedValue(null);
    securityAuditLogFindUnique.mockResolvedValue({
      id: 'sec-2',
      action: 'security.step_up.verify.success',
      outcome: SecurityAuditOutcome.SUCCESS,
      actorUserId: 'actor-2',
      resourceType: 'User',
      resourceId: 'user-2',
      targetUserId: 'user-2',
      reason: 'verified',
      metadataJson: { method: 'password' },
      occurredAt: eventAt,
    });
    userFindMany.mockResolvedValue([
      {
        id: 'actor-2',
        displayName: 'Security Admin',
        roles: [{ role: UserRoleType.ADMIN }],
      },
    ]);

    const item = await repository.findAdminAuditEventById('sec-2');

    expect(item).toMatchObject({
      id: 'sec-2',
      typeSlug: 'security.step_up.verify.success',
      category: NotificationCategory.SECURITY,
      status: NotificationStatus.SENT,
      source: AuditEventSource.SYSTEM,
      actorUserId: 'actor-2',
      targetEntityType: 'User',
      targetEntityId: 'user-2',
      titleSnapshot: 'security.step_up.verify.success',
      suppressedReason: 'verified',
    });
    expect(item?.actorUser?.displayName).toBe('Security Admin');
    expect(item?.bodySnapshot).toContain('"method": "password"');
  });
});
