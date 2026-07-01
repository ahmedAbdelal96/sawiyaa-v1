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
import { AdminAccountingController } from './admin-accounting.controller';

const getControllerMethod = (name: keyof AdminAccountingController) =>
  (AdminAccountingController.prototype as unknown as Record<string, unknown>)[
    name
  ] as (...args: never[]) => unknown;

describe('AdminAccountingController access contract', () => {
  describe('class-level guard and role configuration', () => {
    it('has JwtAccessAuthGuard, RolesGuard, and PermissionsGuard at class level', () => {
      const guards = (Reflect.getMetadata(
        GUARDS_METADATA,
        AdminAccountingController,
      ) ?? []) as unknown[];
      expect(guards).toContain(JwtAccessAuthGuard);
      expect(guards).toContain(RolesGuard);
      expect(guards).toContain(PermissionsGuard);
    });

    it('allows ADMIN, SUPER_ADMIN, FINANCE_STAFF — does NOT include SUPPORT_AGENT', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        AdminAccountingController,
      ) as AppRole[] | undefined;
      expect(roles).toContain(AppRole.ADMIN);
      expect(roles).toContain(AppRole.SUPER_ADMIN);
      expect(roles).toContain(AppRole.FINANCE_STAFF);
      expect(roles).not.toContain(AppRole.SUPPORT_AGENT);
    });
  });

  describe('read endpoints require ACCOUNTING_READ permission', () => {
    const readMethods: Array<keyof AdminAccountingController> = [
      'dashboard',
      'exportDashboardCsv',
      'reconciliationOverview',
      'reconciliationItems',
      'reconcilePayment',
      'reconcilePractitionerWallet',
      'reconcileSettlement',
      'reconcileRefund',
      'reconcileCustomerWallet',
      'reconcilePackageSettlement',
      'accountOptions',
      'ledgerEntries',
      'exportLedgerCsv',
      'journalEntry',
    ];

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

  describe('reconciliation mutation requires ACCOUNTING_WRITE permission', () => {
    it('updateReconciliationReview requires ACCOUNTING_WRITE', () => {
      const method = getControllerMethod('updateReconciliationReview');
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, method) as
        | PermissionKey[]
        | undefined;
      expect(permissions).toEqual([PermissionKey.ACCOUNTING_WRITE]);
    });
  });
});
