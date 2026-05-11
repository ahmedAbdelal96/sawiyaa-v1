import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { PermissionsGuard } from './permissions.guard';

function buildContext(user: {
  id: string;
  roles: AppRole[];
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, headers: {}, socket: {} }),
    }),
    getHandler: () => ({ name: 'testHandler' }),
    getClass: () => class TestClass {},
  } as never;
}

describe('PermissionsGuard', () => {
  const getAllAndOverride = jest.fn();
  const hasPermissions = jest.fn();
  const logAsync = jest.fn();

  const guard = new PermissionsGuard(
    {
      getAllAndOverride,
    } as unknown as Reflector,
    {
      hasPermissions,
    } as never,
    {
      logAsync,
    } as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes for super-admin when resolver allows', async () => {
    getAllAndOverride.mockReturnValue([PermissionKey.SETTLEMENTS_WRITE]);
    hasPermissions.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        buildContext({ id: 'super-admin-user', roles: [AppRole.SUPER_ADMIN] }),
      ),
    ).resolves.toBe(true);
  });

  it('fails for support-agent when resolver denies', async () => {
    getAllAndOverride.mockReturnValue([PermissionKey.SETTLEMENTS_READ]);
    hasPermissions.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        buildContext({ id: 'support-user', roles: [AppRole.SUPPORT_AGENT] }),
      ),
    ).rejects.toThrow('You do not have the required permission for this route');

    expect(logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'security.permission.denied',
        actorUserId: 'support-user',
      }),
    );
  });

  it('passes for finance staff when resolver allows', async () => {
    getAllAndOverride.mockReturnValue([PermissionKey.FINANCE_EVENTS_READ]);
    hasPermissions.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        buildContext({ id: 'finance-user', roles: [AppRole.FINANCE_STAFF] }),
      ),
    ).resolves.toBe(true);
  });

  it('passes for practitioner reviewer when resolver allows', async () => {
    getAllAndOverride.mockReturnValue([PermissionKey.AUDIT_LOG_READ]);
    hasPermissions.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        buildContext({
          id: 'reviewer-user',
          roles: [AppRole.PRACTITIONER_REVIEWER],
        }),
      ),
    ).resolves.toBe(true);
  });
});
