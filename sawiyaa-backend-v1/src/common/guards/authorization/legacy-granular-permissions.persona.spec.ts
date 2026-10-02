import { PermissionOverrideEffect } from '@prisma/client';
import { AppRole } from '@common/enums/app-role.enum';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { PermissionResolverService } from './permission-resolver.service';

describe('P1 granular permission persona matrix', () => {
  const rolePermission = { findMany: jest.fn() };
  const userPermissionOverride = { findMany: jest.fn() };
  const resolver = new PermissionResolverService({
    rolePermission,
    userPermissionOverride,
  } as never);

  const roleKeys: Record<string, string[]> = {
    [AppRole.ADMIN]: Object.values(PermissionKey),
    [AppRole.CONTENT_REVIEWER]: [
      PermissionKey.ARTICLES_READ,
      PermissionKey.ARTICLES_MANAGE,
      PermissionKey.HELP_READ,
      PermissionKey.HELP_MANAGE,
      PermissionKey.REVIEWS_READ,
      PermissionKey.REVIEWS_MODERATE,
      PermissionKey.SPECIALTIES_READ,
    ],
    [AppRole.PRACTITIONER_REVIEWER]: [PermissionKey.SPECIALTIES_READ],
    [AppRole.FINANCE_STAFF]: [
      PermissionKey.CUSTOMER_WALLETS_READ,
      PermissionKey.PACKAGE_PLANS_READ,
    ],
    [AppRole.PATIENT_OPERATIONS]: [],
    [AppRole.MARKETING_STAFF]: [],
  };

  beforeEach(() => {
    rolePermission.findMany.mockImplementation(async (args: any) => {
      const role = args.where.role.in?.[0] as string;
      const keys = roleKeys[role] ?? [];
      return keys.map((key) => ({ permission: { key } }));
    });
    userPermissionOverride.findMany.mockResolvedValue([]);
  });

  const allowed = async (role: AppRole, key: PermissionKey) =>
    resolver.hasPermissions({
      userId: 'u1',
      roles: [role],
      requiredPermissions: [key],
    });

  it('CONTENT_REVIEWER has editorial/reputation access but no sensitive/commercial mutations', async () => {
    for (const key of roleKeys[AppRole.CONTENT_REVIEWER])
      expect(
        await allowed(AppRole.CONTENT_REVIEWER, key as PermissionKey),
      ).toBe(true);
    for (const key of [
      PermissionKey.SPECIALTIES_MANAGE,
      PermissionKey.PACKAGE_PLANS_MANAGE,
      PermissionKey.CUSTOMER_WALLETS_READ,
      PermissionKey.ASSESSMENTS_AUTHORING_MANAGE,
      PermissionKey.COUPONS_MANAGE,
    ])
      expect(await allowed(AppRole.CONTENT_REVIEWER, key)).toBe(false);
  });

  it('PRACTITIONER_REVIEWER is specialty read-only', async () => {
    expect(
      await allowed(
        AppRole.PRACTITIONER_REVIEWER,
        PermissionKey.SPECIALTIES_READ,
      ),
    ).toBe(true);
    for (const key of [
      PermissionKey.SPECIALTIES_MANAGE,
      PermissionKey.ARTICLES_MANAGE,
      PermissionKey.CUSTOMER_WALLETS_READ,
      PermissionKey.ASSESSMENTS_AUTHORING_MANAGE,
      PermissionKey.COUPONS_MANAGE,
    ])
      expect(await allowed(AppRole.PRACTITIONER_REVIEWER, key)).toBe(false);
  });

  it('FINANCE_STAFF receives wallet/package reads only from P1', async () => {
    expect(
      await allowed(AppRole.FINANCE_STAFF, PermissionKey.CUSTOMER_WALLETS_READ),
    ).toBe(true);
    expect(
      await allowed(AppRole.FINANCE_STAFF, PermissionKey.PACKAGE_PLANS_READ),
    ).toBe(true);
    for (const key of [
      PermissionKey.PACKAGE_PLANS_MANAGE,
      PermissionKey.ARTICLES_MANAGE,
      PermissionKey.HELP_MANAGE,
      PermissionKey.SPECIALTIES_MANAGE,
      PermissionKey.ASSESSMENTS_AUTHORING_MANAGE,
      PermissionKey.COUPONS_MANAGE,
    ])
      expect(await allowed(AppRole.FINANCE_STAFF, key)).toBe(false);
  });

  it.each([AppRole.PATIENT_OPERATIONS, AppRole.MARKETING_STAFF])(
    '%s receives no automatic P1 permissions',
    async (role) => {
      for (const key of Object.values(PermissionKey).filter(
        (key) => key.includes('.') && !key.startsWith('admin-users'),
      )) {
        if (Object.values(roleKeys).flat().includes(key)) continue;
        expect(await allowed(role, key)).toBe(false);
      }
    },
  );

  it('ADMIN retains all P1 capabilities and SUPER_ADMIN bypasses database grants', async () => {
    for (const key of Object.values(PermissionKey))
      expect(await allowed(AppRole.ADMIN, key)).toBe(true);
    expect(
      await allowed(AppRole.SUPER_ADMIN, PermissionKey.COUPONS_MANAGE),
    ).toBe(true);
  });

  it('DENY override wins and revocation is observed on the next request', async () => {
    userPermissionOverride.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          effect: PermissionOverrideEffect.DENY,
          permission: { key: PermissionKey.ARTICLES_MANAGE },
        },
      ]);
    expect(
      await allowed(AppRole.CONTENT_REVIEWER, PermissionKey.ARTICLES_MANAGE),
    ).toBe(true);
    expect(
      await allowed(AppRole.CONTENT_REVIEWER, PermissionKey.ARTICLES_MANAGE),
    ).toBe(false);
  });
});
