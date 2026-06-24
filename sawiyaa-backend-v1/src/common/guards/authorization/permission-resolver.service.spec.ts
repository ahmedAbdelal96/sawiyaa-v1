import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { PermissionOverrideEffect, UserRoleType } from '@prisma/client';
import { PermissionResolverService } from './permission-resolver.service';

describe('PermissionResolverService', () => {
  const rolePermissionFindMany = jest.fn();
  const userPermissionOverrideFindMany = jest.fn();

  const resolver = new PermissionResolverService({
    rolePermission: {
      findMany: rolePermissionFindMany,
    },
    userPermissionOverride: {
      findMany: userPermissionOverrideFindMany,
    },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows super-admin without querying grants', async () => {
    const allowed = await resolver.hasPermissions({
      userId: 'u-1',
      roles: [AppRole.SUPER_ADMIN],
      requiredPermissions: [PermissionKey.SETTLEMENTS_WRITE],
    });

    expect(allowed).toBe(true);
    expect(rolePermissionFindMany).not.toHaveBeenCalled();
    expect(userPermissionOverrideFindMany).not.toHaveBeenCalled();
  });

  it('grants finance staff when role permission exists', async () => {
    rolePermissionFindMany.mockResolvedValue([
      {
        permission: {
          key: PermissionKey.SETTLEMENTS_READ,
        },
      },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const allowed = await resolver.hasPermissions({
      userId: 'u-2',
      roles: [AppRole.FINANCE_STAFF],
      requiredPermissions: [PermissionKey.SETTLEMENTS_READ],
    });

    expect(allowed).toBe(true);
    expect(rolePermissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: {
            in: [UserRoleType.FINANCE_STAFF],
          },
        }),
      }),
    );
  });

  it('denies support agent without grants', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const allowed = await resolver.hasPermissions({
      userId: 'u-3',
      roles: [AppRole.SUPPORT_AGENT],
      requiredPermissions: [PermissionKey.FINANCE_EVENTS_READ],
    });

    expect(allowed).toBe(false);
  });

  it('resolves practitioner reviewer role type for permission checks', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    await resolver.hasPermissions({
      userId: 'u-4',
      roles: [AppRole.PRACTITIONER_REVIEWER],
      requiredPermissions: [PermissionKey.AUDIT_LOG_READ],
    });

    expect(rolePermissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: {
            in: [UserRoleType.PRACTITIONER_REVIEWER],
          },
        }),
      }),
    );
  });

  it('applies override precedence with DENY above role grants', async () => {
    rolePermissionFindMany.mockResolvedValue([
      {
        permission: {
          key: PermissionKey.SETTLEMENTS_WRITE,
        },
      },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([
      {
        effect: PermissionOverrideEffect.DENY,
        permission: {
          key: PermissionKey.SETTLEMENTS_WRITE,
        },
      },
    ]);

    const allowed = await resolver.hasPermissions({
      userId: 'u-5',
      roles: [AppRole.ADMIN],
      requiredPermissions: [PermissionKey.SETTLEMENTS_WRITE],
    });

    expect(allowed).toBe(false);
  });

  it('allows explicit ALLOW override when role lacks permission', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([
      {
        effect: PermissionOverrideEffect.ALLOW,
        permission: {
          key: PermissionKey.NOTIFICATION_OPS_READ,
        },
      },
    ]);

    const allowed = await resolver.hasPermissions({
      userId: 'u-6',
      roles: [AppRole.SUPPORT_AGENT],
      requiredPermissions: [PermissionKey.NOTIFICATION_OPS_READ],
    });

    expect(allowed).toBe(true);
  });

  it('denies patient and practitioner for admin permission bundle', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const patientAllowed = await resolver.hasPermissions({
      userId: 'u-7',
      roles: [AppRole.PATIENT],
      requiredPermissions: [PermissionKey.AUDIT_LOG_READ],
    });
    const practitionerAllowed = await resolver.hasPermissions({
      userId: 'u-8',
      roles: [AppRole.PRACTITIONER],
      requiredPermissions: [PermissionKey.AUDIT_LOG_READ],
    });

    expect(patientAllowed).toBe(false);
    expect(practitionerAllowed).toBe(false);
  });
});

describe('PermissionResolverService.resolvePermissions', () => {
  const rolePermissionFindMany = jest.fn();
  const userPermissionOverrideFindMany = jest.fn();

  const resolver = new PermissionResolverService({
    rolePermission: {
      findMany: rolePermissionFindMany,
    },
    userPermissionOverride: {
      findMany: userPermissionOverrideFindMany,
    },
  } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns all concrete permission keys for SUPER_ADMIN without querying db', async () => {
    const result = await resolver.resolvePermissions({
      userId: 'u-1',
      roles: [AppRole.SUPER_ADMIN],
    });

    expect(result).toEqual(
      expect.arrayContaining(Object.values(PermissionKey)),
    );
    expect(result).toHaveLength(Object.values(PermissionKey).length);
    expect(rolePermissionFindMany).not.toHaveBeenCalled();
    expect(userPermissionOverrideFindMany).not.toHaveBeenCalled();
  });

  it('returns role-based permissions for FINANCE_STAFF', async () => {
    rolePermissionFindMany.mockResolvedValue([
      { permission: { key: PermissionKey.ACCOUNTING_READ } },
      { permission: { key: PermissionKey.FINANCE_EVENTS_READ } },
      { permission: { key: PermissionKey.SETTLEMENTS_READ } },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-2',
      roles: [AppRole.FINANCE_STAFF],
    });

    expect(result).toContain(PermissionKey.ACCOUNTING_READ);
    expect(result).toContain(PermissionKey.FINANCE_EVENTS_READ);
    expect(result).toContain(PermissionKey.SETTLEMENTS_READ);
    expect(result).not.toContain(PermissionKey.AUDIT_LOG_READ);
  });

  it('returns empty array for SUPPORT_AGENT with no role permissions', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-3',
      roles: [AppRole.SUPPORT_AGENT],
    });

    expect(result).toEqual([]);
  });

  it('SUPPORT_AGENT does not receive finance permissions', async () => {
    rolePermissionFindMany.mockResolvedValue([
      { permission: { key: PermissionKey.SESSIONS_READ_SUPPORT_SUMMARY } },
      { permission: { key: PermissionKey.SUPPORT_TICKET_ASSIGN } },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-4',
      roles: [AppRole.SUPPORT_AGENT],
    });

    expect(result).not.toContain(PermissionKey.FINANCE_EVENTS_READ);
    expect(result).not.toContain(PermissionKey.ACCOUNTING_READ);
    expect(result).toContain(PermissionKey.SESSIONS_READ_SUPPORT_SUMMARY);
  });

  it('applies DENY override to remove a role-granted permission', async () => {
    rolePermissionFindMany.mockResolvedValue([
      { permission: { key: PermissionKey.SETTLEMENTS_WRITE } },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([
      {
        effect: PermissionOverrideEffect.DENY,
        permission: { key: PermissionKey.SETTLEMENTS_WRITE },
      },
    ]);

    const result = await resolver.resolvePermissions({
      userId: 'u-5',
      roles: [AppRole.FINANCE_STAFF],
    });

    expect(result).not.toContain(PermissionKey.SETTLEMENTS_WRITE);
  });

  it('applies ALLOW override to add a permission not in role grants', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([
      {
        effect: PermissionOverrideEffect.ALLOW,
        permission: { key: PermissionKey.AUDIT_LOG_READ },
      },
    ]);

    const result = await resolver.resolvePermissions({
      userId: 'u-6',
      roles: [AppRole.SUPPORT_AGENT],
    });

    expect(result).toContain(PermissionKey.AUDIT_LOG_READ);
  });

  it('returns empty array for PATIENT with no role permissions', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-7',
      roles: [AppRole.PATIENT],
    });

    expect(result).toEqual([]);
    expect(result).not.toContain(PermissionKey.AUDIT_LOG_READ);
  });

  it('returns empty array for PRACTITIONER with no role permissions', async () => {
    rolePermissionFindMany.mockResolvedValue([]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-8',
      roles: [AppRole.PRACTITIONER],
    });

    expect(result).toEqual([]);
  });

  it('returns practitionerApplications.* permissions for PRACTITIONER_REVIEWER when seeded', async () => {
    rolePermissionFindMany.mockResolvedValue([
      { permission: { key: PermissionKey.PRACTITIONER_APPLICATIONS_READ } },
      { permission: { key: PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE } },
      { permission: { key: PermissionKey.PRACTITIONER_APPLICATIONS_REJECT } },
      {
        permission: {
          key: PermissionKey.PRACTITIONER_APPLICATIONS_REQUEST_CHANGES,
        },
      },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-9',
      roles: [AppRole.PRACTITIONER_REVIEWER],
    });

    expect(result).toContain(PermissionKey.PRACTITIONER_APPLICATIONS_READ);
    expect(result).toContain(PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE);
    expect(result).toContain(PermissionKey.PRACTITIONER_APPLICATIONS_REJECT);
    expect(result).toContain(
      PermissionKey.PRACTITIONER_APPLICATIONS_REQUEST_CHANGES,
    );
  });

  it('SUPPORT_AGENT does not receive practitionerApplications.* permissions', async () => {
    rolePermissionFindMany.mockResolvedValue([
      { permission: { key: PermissionKey.SESSIONS_READ_SUPPORT_SUMMARY } },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-10',
      roles: [AppRole.SUPPORT_AGENT],
    });

    expect(result).not.toContain(PermissionKey.PRACTITIONER_APPLICATIONS_READ);
    expect(result).not.toContain(
      PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE,
    );
  });

  it('FINANCE_STAFF does not receive practitionerApplications.* permissions', async () => {
    rolePermissionFindMany.mockResolvedValue([
      { permission: { key: PermissionKey.SETTLEMENTS_READ } },
    ]);
    userPermissionOverrideFindMany.mockResolvedValue([]);

    const result = await resolver.resolvePermissions({
      userId: 'u-11',
      roles: [AppRole.FINANCE_STAFF],
    });

    expect(result).not.toContain(PermissionKey.PRACTITIONER_APPLICATIONS_READ);
    expect(result).not.toContain(
      PermissionKey.PRACTITIONER_APPLICATIONS_APPROVE,
    );
  });
});
