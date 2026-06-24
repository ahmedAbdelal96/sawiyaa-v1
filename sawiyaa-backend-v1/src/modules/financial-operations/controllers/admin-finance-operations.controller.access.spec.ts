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
import { AdminFinanceOperationsController } from './admin-finance-operations.controller';

describe('AdminFinanceOperationsController access contract', () => {
  it('exposes finance operation event reads to admin/support operator roles', () => {
    const classRoles = Reflect.getMetadata(
      ROLES_KEY,
      AdminFinanceOperationsController,
    );
    expect(classRoles).toEqual([
      AppRole.ADMIN,
      AppRole.SUPER_ADMIN,
      AppRole.FINANCE_STAFF,
    ]);

    const classPermissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      AdminFinanceOperationsController,
    );
    expect(classPermissions).toEqual([PermissionKey.FINANCE_EVENTS_READ]);
  });

  it('enforces auth/role guards at controller level', () => {
    const classGuards =
      Reflect.getMetadata(GUARDS_METADATA, AdminFinanceOperationsController) ??
      [];

    expect(classGuards).toContain(JwtAccessAuthGuard);
    expect(classGuards).toContain(RolesGuard);
    expect(classGuards).toContain(PermissionsGuard);
  });
});
