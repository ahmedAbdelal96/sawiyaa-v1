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
