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
import { AdminPaymentGatewayControlController } from './admin-payment-gateway-control.controller';

describe('AdminPaymentGatewayControlController access contract', () => {
  it('keeps authentication, role, and permission guards at controller level', () => {
    const guards = (Reflect.getMetadata(
      GUARDS_METADATA,
      AdminPaymentGatewayControlController,
    ) ?? []) as unknown[];
    expect(guards).toContain(JwtAccessAuthGuard);
    expect(guards).toContain(RolesGuard);
    expect(guards).toContain(PermissionsGuard);
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminPaymentGatewayControlController),
    ).toEqual([AppRole.ADMIN, AppRole.SUPER_ADMIN]);
  });

  it.each([
    'updateProvider',
    'rollbackProvider',
    'updateRouting',
    'rollbackRouting',
  ] as const)(
    '%s requires financial configuration permission',
    (methodName) => {
      const method = (
        AdminPaymentGatewayControlController.prototype as unknown as Record<
          string,
          unknown
        >
      )[methodName];
      expect(Reflect.getMetadata(PERMISSIONS_KEY, method)).toEqual([
        PermissionKey.CONFIGURATION_EDIT_FINANCIAL,
      ]);
    },
  );
});
