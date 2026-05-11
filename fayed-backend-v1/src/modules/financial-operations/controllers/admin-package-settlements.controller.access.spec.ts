import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { AdminGuard } from '@common/guards/authorization/admin.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminPackageSettlementsController } from './admin-package-settlements.controller';

const getControllerMethod = (name: keyof AdminPackageSettlementsController) =>
  (
    AdminPackageSettlementsController.prototype as unknown as Record<
      string,
      unknown
    >
  )[name] as (...args: never[]) => unknown;

describe('AdminPackageSettlementsController access contract', () => {
  it('has JwtAccessAuthGuard, RolesGuard, and PermissionsGuard at class level', () => {
    const guards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminPackageSettlementsController,
    ) ?? []) as unknown[];
    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(PermissionsGuard);
  });

  it('allows ADMIN, SUPER_ADMIN, FINANCE_STAFF at class level — does NOT include SUPPORT_AGENT', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      AdminPackageSettlementsController,
    ) as AppRole[] | undefined;
    expect(roles).toContain(AppRole.ADMIN);
    expect(roles).toContain(AppRole.SUPER_ADMIN);
    expect(roles).toContain(AppRole.FINANCE_STAFF);
    expect(roles).not.toContain(AppRole.SUPPORT_AGENT);
  });

  it('list requires SETTLEMENTS_READ permission', () => {
    const method = getControllerMethod('list');
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
      | PermissionKey[]
      | undefined;
    expect(permissions).toEqual([PermissionKey.SETTLEMENTS_READ]);
  });

  it('details requires SETTLEMENTS_READ permission', () => {
    const method = getControllerMethod('details');
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
      | PermissionKey[]
      | undefined;
    expect(permissions).toEqual([PermissionKey.SETTLEMENTS_READ]);
  });

  it('release mutation is protected by AdminGuard', () => {
    const method = getControllerMethod('release');
    const guards = (Reflect.getMetadata(GUARDS_METADATA, method) ??
      []) as unknown[];
    expect(guards).toContain(AdminGuard);
  });
});
