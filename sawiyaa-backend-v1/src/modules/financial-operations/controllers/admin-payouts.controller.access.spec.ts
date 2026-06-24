import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
} from '@common/constants/auth-metadata.constants';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { JwtAccessAuthGuard } from '@common/guards/authentication/jwt-access-auth.guard';
import { PermissionsGuard } from '@common/guards/authorization/permissions.guard';
import { RolesGuard } from '@common/guards/authorization/roles.guard';
import { AdminPayoutsController } from './admin-payouts.controller';

const getControllerMethod = (name: keyof AdminPayoutsController) =>
  (AdminPayoutsController.prototype as unknown as Record<string, unknown>)[
    name
  ] as (...args: never[]) => unknown;

describe('AdminPayoutsController access contract', () => {
  it('has JwtAccessAuthGuard, RolesGuard, and PermissionsGuard at class level', () => {
    const guards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminPayoutsController,
    ) ?? []) as unknown[];
    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(PermissionsGuard);
  });

  it('allows ADMIN, SUPER_ADMIN, FINANCE_STAFF — does NOT include SUPPORT_AGENT', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminPayoutsController) as
      | AppRole[]
      | undefined;
    expect(roles).toContain(AppRole.ADMIN);
    expect(roles).toContain(AppRole.SUPER_ADMIN);
    expect(roles).toContain(AppRole.FINANCE_STAFF);
    expect(roles).not.toContain(AppRole.SUPPORT_AGENT);
  });

  it('list requires PRACTITIONER_PAYOUTS_READ permission', () => {
    const method = getControllerMethod('list');
    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
      | PermissionKey[]
      | undefined;
    expect(permissions).toEqual([PermissionKey.PRACTITIONER_PAYOUTS_READ]);
  });
});
