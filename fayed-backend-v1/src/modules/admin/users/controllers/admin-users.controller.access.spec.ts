import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
  THROTTLE_POLICY_KEY,
} from '@common/constants/auth-metadata.constants';
import { STEP_UP_POLICY_KEY } from '@common/decorators/step-up.decorator';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminUsersController } from './admin-users.controller';

const getControllerMethod = (name: keyof AdminUsersController) =>
  (AdminUsersController.prototype as unknown as Record<string, unknown>)[
    name
  ] as (...args: never[]) => unknown;

describe('AdminUsersController access contract', () => {
  it('enforces auth/role/permission guards at controller level', () => {
    const classGuards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminUsersController,
    ) ?? []) as unknown[];
    expect(classGuards).toContain(JwtAccessAuthGuard);
    expect(classGuards).toContain(RolesGuard);
    expect(classGuards).toContain(PermissionsGuard);
  });

  it('allows admin-class roles at controller level (permission checks still apply)', () => {
    const classRoles = Reflect.getMetadata(ROLES_KEY, AdminUsersController) as
      | AppRole[]
      | undefined;

    expect(classRoles).toEqual([
      AppRole.SUPER_ADMIN,
      AppRole.ADMIN,
      AppRole.FINANCE_STAFF,
      AppRole.MARKETING_STAFF,
      AppRole.PRACTITIONER_REVIEWER,
      AppRole.PATIENT_OPERATIONS,
      AppRole.SUPPORT_AGENT,
      AppRole.CONTENT_REVIEWER,
    ]);
  });

  it('requires read permission for list/get', () => {
    const list = getControllerMethod('list');
    const get = getControllerMethod('get');

    expect(Reflect.getMetadata(PERMISSIONS_KEY, list)).toEqual([
      PermissionKey.ADMIN_USERS_READ,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, get)).toEqual([
      PermissionKey.ADMIN_USERS_READ,
    ]);
  });

  it('requires step-up + create permission for create', () => {
    const create = getControllerMethod('create');

    expect(Reflect.getMetadata(PERMISSIONS_KEY, create)).toEqual([
      PermissionKey.ADMIN_USERS_CREATE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, create)).toBe(
      'security.adminUsers.create',
    );
    expect(Reflect.getMetadata(THROTTLE_POLICY_KEY, create)).toBe(
      'admin-users-create',
    );
  });

  it('requires step-up + permissions for sensitive mutations', () => {
    const patch = getControllerMethod('patch');
    const updateStatus = getControllerMethod('updateStatus');
    const updateRoles = getControllerMethod('updateRoles');
    const updateOverrides = getControllerMethod('updatePermissionOverrides');
    const revokeSessions = getControllerMethod('revokeSessions');
    const invalidateTokens = getControllerMethod('invalidateTokens');

    expect(Reflect.getMetadata(PERMISSIONS_KEY, patch)).toEqual([
      PermissionKey.ADMIN_USERS_UPDATE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, patch)).toBe(
      'security.adminUsers.update',
    );

    expect(Reflect.getMetadata(PERMISSIONS_KEY, updateStatus)).toEqual([
      PermissionKey.ADMIN_USERS_STATUS_UPDATE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, updateStatus)).toBe(
      'security.adminUsers.status.update',
    );

    expect(Reflect.getMetadata(PERMISSIONS_KEY, updateRoles)).toEqual([
      PermissionKey.ADMIN_USERS_ROLES_UPDATE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, updateRoles)).toBe(
      'security.adminUsers.roles.update',
    );

    expect(Reflect.getMetadata(PERMISSIONS_KEY, updateOverrides)).toEqual([
      PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_UPDATE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, updateOverrides)).toBe(
      'security.adminUsers.permissionOverrides.update',
    );

    expect(Reflect.getMetadata(PERMISSIONS_KEY, revokeSessions)).toEqual([
      PermissionKey.ADMIN_USERS_SESSIONS_REVOKE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, revokeSessions)).toBe(
      'security.adminUsers.sessions.revoke',
    );

    expect(Reflect.getMetadata(PERMISSIONS_KEY, invalidateTokens)).toEqual([
      PermissionKey.ADMIN_USERS_TOKEN_VERSION_INVALIDATE,
    ]);
    expect(Reflect.getMetadata(STEP_UP_POLICY_KEY, invalidateTokens)).toBe(
      'security.adminUsers.tokenVersion.invalidate',
    );
  });

  it('requires override read permission for listing overrides', () => {
    const listOverrides = getControllerMethod('listPermissionOverrides');
    expect(Reflect.getMetadata(PERMISSIONS_KEY, listOverrides)).toEqual([
      PermissionKey.ADMIN_USERS_PERMISSION_OVERRIDES_READ,
    ]);
  });
});
