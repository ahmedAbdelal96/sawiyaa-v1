import { UserRoleType } from '@prisma/client';
import { permissionDefinitions, rolePermissionBundles } from './auth.seed';

/**
 * Pure data tests for the auth seed role-permission matrix.
 * No database connection required — all assertions work against static arrays.
 */
describe('auth.seed: role-permission matrix', () => {
  const allDefinedKeys = new Set(permissionDefinitions.map((p) => p.key));

  const bundleByRole = new Map(
    rolePermissionBundles.map((b) => [b.role, new Set(b.permissions)]),
  );

  it('all permission definitions have unique keys', () => {
    const keys = permissionDefinitions.map((p) => p.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('all permission definitions have non-empty descriptions', () => {
    for (const p of permissionDefinitions) {
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });

  it('each role bundle references only defined permission keys', () => {
    for (const bundle of rolePermissionBundles) {
      for (const key of bundle.permissions) {
        expect(allDefinedKeys.has(key)).toBe(true);
      }
    }
  });

  it('SUPER_ADMIN gets all defined permissions', () => {
    const superAdminPerms = bundleByRole.get(UserRoleType.SUPER_ADMIN)!;
    for (const p of permissionDefinitions) {
      expect(superAdminPerms.has(p.key)).toBe(true);
    }
  });

  it('ADMIN gets all defined permissions except permission override management (SUPER_ADMIN-only)', () => {
    const adminPerms = bundleByRole.get(UserRoleType.ADMIN)!;
    for (const p of permissionDefinitions) {
      if (
        p.key === 'admin-users.permission-overrides.read' ||
        p.key === 'admin-users.permission-overrides.update'
      ) {
        expect(adminPerms.has(p.key)).toBe(false);
        continue;
      }
      expect(adminPerms.has(p.key)).toBe(true);
    }
  });

  it('ADMIN has support.ticket.note.internal', () => {
    const adminPerms = bundleByRole.get(UserRoleType.ADMIN)!;
    expect(adminPerms.has('support.ticket.note.internal')).toBe(true);
  });

  describe('FINANCE_STAFF', () => {
    let perms: Set<string>;
    beforeAll(() => {
      perms = bundleByRole.get(UserRoleType.FINANCE_STAFF)!;
    });

    it('has finance/settlements/payouts permissions', () => {
      expect(perms.has('finance.events.read')).toBe(true);
      expect(perms.has('finance.accounting.read')).toBe(true);
      expect(perms.has('finance.accounting.write')).toBe(true);
      expect(perms.has('settlements.read')).toBe(true);
      expect(perms.has('settlements.write')).toBe(true);
      expect(perms.has('practitioner-payouts.read')).toBe(true);
      expect(perms.has('practitioner-payouts.write')).toBe(true);
      expect(perms.has('practitioner-statements.read')).toBe(true);
    });

    it('has refund mutation permissions', () => {
      expect(perms.has('refunds.approve')).toBe(true);
      expect(perms.has('refunds.retry')).toBe(true);
    });

    it('does NOT have sensitive patient data permission', () => {
      expect(perms.has('patients.sensitive.read')).toBe(false);
    });

    it('does NOT have careChat.request.decide', () => {
      expect(perms.has('careChat.request.decide')).toBe(false);
    });

    it('does NOT have admin user management permissions', () => {
      expect(perms.has('admin-users.read')).toBe(false);
      expect(perms.has('admin-users.create')).toBe(false);
      expect(perms.has('admin-users.update')).toBe(false);
      expect(perms.has('admin-users.status.update')).toBe(false);
      expect(perms.has('admin-users.roles.update')).toBe(false);
      expect(perms.has('admin-users.sessions.revoke')).toBe(false);
      expect(perms.has('admin-users.token-version.invalidate')).toBe(false);
    });
  });

  describe('SUPPORT (SUPPORT_AGENT)', () => {
    let perms: Set<string>;
    beforeAll(() => {
      perms = bundleByRole.get(UserRoleType.SUPPORT)!;
    });

    it('does NOT have sessions.read.admin (too broad)', () => {
      expect(perms.has('sessions.read.admin')).toBe(false);
    });

    it('has sessions.read.supportSummary', () => {
      expect(perms.has('sessions.read.supportSummary')).toBe(true);
    });

    it('has patients.read.admin', () => {
      expect(perms.has('patients.read.admin')).toBe(true);
    });

    it('has careChat.request.read.admin', () => {
      expect(perms.has('careChat.request.read.admin')).toBe(true);
    });

    it('has careChat.conversation.read.admin', () => {
      expect(perms.has('careChat.conversation.read.admin')).toBe(true);
    });

    it('has support.ticket.assign', () => {
      expect(perms.has('support.ticket.assign')).toBe(true);
    });

    it('does NOT have finance permissions (full payment ops blocked)', () => {
      expect(perms.has('finance.events.read')).toBe(false);
      expect(perms.has('finance.accounting.read')).toBe(false);
      expect(perms.has('finance.accounting.write')).toBe(false);
      expect(perms.has('settlements.read')).toBe(false);
      expect(perms.has('settlements.write')).toBe(false);
    });

    it('does NOT have refund mutation permissions', () => {
      expect(perms.has('refunds.approve')).toBe(false);
      expect(perms.has('refunds.retry')).toBe(false);
    });

    it('does NOT have practitioner-payouts or payout-log access', () => {
      expect(perms.has('practitioner-payouts.read')).toBe(false);
      expect(perms.has('practitioner-payouts.write')).toBe(false);
    });

    it('does NOT have settlements permissions', () => {
      expect(perms.has('settlements.read')).toBe(false);
      expect(perms.has('settlements.write')).toBe(false);
    });

    it('does NOT have audit-log.read', () => {
      expect(perms.has('audit-log.read')).toBe(false);
    });

    it('does NOT have patients.sensitive.read', () => {
      expect(perms.has('patients.sensitive.read')).toBe(false);
    });

    it('does NOT have careChat.request.decide', () => {
      expect(perms.has('careChat.request.decide')).toBe(false);
    });

    it('does NOT have support.ticket.note.internal (admin-only)', () => {
      expect(perms.has('support.ticket.note.internal')).toBe(false);
    });

    it('does NOT have admin user management permissions', () => {
      expect(perms.has('admin-users.read')).toBe(false);
      expect(perms.has('admin-users.create')).toBe(false);
      expect(perms.has('admin-users.update')).toBe(false);
      expect(perms.has('admin-users.status.update')).toBe(false);
      expect(perms.has('admin-users.roles.update')).toBe(false);
      expect(perms.has('admin-users.sessions.revoke')).toBe(false);
      expect(perms.has('admin-users.token-version.invalidate')).toBe(false);
    });
  });

  describe('PATIENT', () => {
    it('has no permissions', () => {
      const perms = bundleByRole.get(UserRoleType.PATIENT)!;
      expect(perms.size).toBe(0);
    });
  });

  describe('PRACTITIONER', () => {
    it('has no permissions', () => {
      const perms = bundleByRole.get(UserRoleType.PRACTITIONER)!;
      expect(perms.size).toBe(0);
    });
  });

  describe('CONTENT_REVIEWER', () => {
    let perms: Set<string>;
    beforeAll(() => {
      perms = bundleByRole.get(UserRoleType.CONTENT_REVIEWER)!;
    });

    it('only has audit-log.read', () => {
      expect(perms.has('audit-log.read')).toBe(true);
      expect(perms.has('patients.read.admin')).toBe(false);
      expect(perms.has('finance.events.read')).toBe(false);
    });

    it('does NOT have admin user management permissions', () => {
      expect(perms.has('admin-users.read')).toBe(false);
      expect(perms.has('admin-users.create')).toBe(false);
      expect(perms.has('admin-users.update')).toBe(false);
      expect(perms.has('admin-users.status.update')).toBe(false);
      expect(perms.has('admin-users.roles.update')).toBe(false);
      expect(perms.has('admin-users.sessions.revoke')).toBe(false);
      expect(perms.has('admin-users.token-version.invalidate')).toBe(false);
    });
  });

  it('all roles defined in bundles are valid UserRoleType values', () => {
    const validRoles = new Set<string>(Object.values(UserRoleType));
    for (const bundle of rolePermissionBundles) {
      expect(validRoles.has(bundle.role)).toBe(true);
    }
  });
});
