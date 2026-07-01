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
import { AdminAccountingReconciliationOperationsController } from './admin-accounting-reconciliation-operations.controller';

const getControllerMethod = (
  name: keyof AdminAccountingReconciliationOperationsController,
) =>
  (
    AdminAccountingReconciliationOperationsController.prototype as unknown as Record<
      string,
      unknown
    >
  )[name] as (...args: never[]) => unknown;

describe('AdminAccountingReconciliationOperationsController access contract', () => {
  describe('class-level guard and role configuration', () => {
    it('has JwtAccessAuthGuard, RolesGuard, and PermissionsGuard at class level', () => {
      const guards = (Reflect.getMetadata(
        GUARDS_METADATA,
        AdminAccountingReconciliationOperationsController,
      ) ?? []) as unknown[];
      expect(guards).toContain(JwtAccessAuthGuard);
      expect(guards).toContain(RolesGuard);
      expect(guards).toContain(PermissionsGuard);
    });

    it('allows ADMIN, SUPER_ADMIN, FINANCE_STAFF only', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        AdminAccountingReconciliationOperationsController,
      ) as AppRole[] | undefined;
      expect(roles).toContain(AppRole.ADMIN);
      expect(roles).toContain(AppRole.SUPER_ADMIN);
      expect(roles).toContain(AppRole.FINANCE_STAFF);
      expect(roles).not.toContain(AppRole.SUPPORT_AGENT);
    });
  });

  describe('read endpoints require ACCOUNTING_READ permission', () => {
    const readMethods: Array<
      keyof AdminAccountingReconciliationOperationsController
    > = ['listRuns', 'getRun', 'listIssues', 'getIssue', 'getReconciliationStatus'];

    for (const methodName of readMethods) {
      it(`${methodName} requires ACCOUNTING_READ`, () => {
        const method = getControllerMethod(methodName);
        const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
          | PermissionKey[]
          | undefined;
        expect(permissions).toEqual([PermissionKey.ACCOUNTING_READ]);
      });
    }
  });

  describe('reconciliation operations require ACCOUNTING_WRITE permission', () => {
    const writeMethods: Array<
      keyof AdminAccountingReconciliationOperationsController
    > = [
      'runPayments',
      'runWallets',
      'runRefunds',
      'runPackageSettlements',
      'runFull',
      'acknowledgeIssue',
      'resolveIssue',
      'ignoreIssue',
    ];

    for (const methodName of writeMethods) {
      it(`${methodName} requires ACCOUNTING_WRITE`, () => {
        const method = getControllerMethod(methodName);
        const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
          | PermissionKey[]
          | undefined;
        expect(permissions).toEqual([PermissionKey.ACCOUNTING_WRITE]);
      });
    }
  });
});
