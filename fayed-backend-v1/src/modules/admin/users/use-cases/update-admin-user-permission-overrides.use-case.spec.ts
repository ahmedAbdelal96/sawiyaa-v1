import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PermissionResolverService } from '@common/guards/authorization/permission-resolver.service';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { PermissionOverrideEffect, UserRoleType } from '@prisma/client';
import { PermissionKey } from '@common/enums/permission-key.enum';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { UpdateAdminUserPermissionOverridesUseCase } from './update-admin-user-permission-overrides.use-case';

describe('UpdateAdminUserPermissionOverridesUseCase', () => {
  const makeSut = (overrides?: {
    internalUser?: any | null;
    superAdminCount?: number;
    actorIsSuperAdmin?: boolean;
    actorHasAllowPerms?: boolean;
    permissionExists?: boolean;
  }) => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: any) =>
        fn({
          permission: {
            findUnique: jest
              .fn()
              .mockResolvedValue(
                overrides?.permissionExists === false
                  ? null
                  : { id: 'p1', key: 'k' },
              ),
          },
        }),
      ),
    } as unknown as PrismaService;

    const i18nService = {
      t: jest.fn().mockReturnValue('ok'),
    } as unknown as I18nService;

    const repo = {
      findInternalUserById: jest
        .fn()
        .mockResolvedValue(overrides?.internalUser ?? null),
      countSuperAdmins: jest
        .fn()
        .mockResolvedValue(overrides?.superAdminCount ?? 2),
      upsertPermissionOverride: jest.fn().mockResolvedValue(undefined),
      deletePermissionOverride: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdminUsersRepository;

    const policy = new AdminUserManagementPolicy();

    const permissionResolver = {
      hasPermissions: jest
        .fn()
        .mockResolvedValue(overrides?.actorHasAllowPerms ?? true),
    } as unknown as PermissionResolverService;

    const audit = {
      logAsync: jest.fn(),
    } as unknown as SecurityAuditService;

    const sut = new UpdateAdminUserPermissionOverridesUseCase(
      prisma,
      i18nService,
      repo,
      policy,
      permissionResolver,
      audit,
    );

    const actorRoles = overrides?.actorIsSuperAdmin
      ? ['SUPER_ADMIN']
      : ['ADMIN'];

    return { sut, repo, actorRoles, permissionResolver };
  };

  it('rejects when target is not an internal user', async () => {
    const { sut, actorRoles } = makeSut({ internalUser: null });
    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: actorRoles } as any,
        userId: 'u2',
        operations: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks denying admin user control keys for the last SUPER_ADMIN', async () => {
    const { sut, actorRoles } = makeSut({
      internalUser: { id: 'u2', roles: [{ role: UserRoleType.SUPER_ADMIN }] },
      superAdminCount: 1,
      actorIsSuperAdmin: true,
    });

    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: actorRoles } as any,
        userId: 'u2',
        operations: [
          {
            permissionKey: PermissionKey.ADMIN_USERS_READ,
            effect: PermissionOverrideEffect.DENY,
          } as any,
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks non-super-admin from granting ALLOW override when actor lacks the permission', async () => {
    const { sut, actorRoles } = makeSut({
      internalUser: { id: 'u2', roles: [{ role: UserRoleType.ADMIN }] },
      actorIsSuperAdmin: false,
      actorHasAllowPerms: false,
    });

    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: actorRoles } as any,
        userId: 'u2',
        operations: [
          {
            permissionKey: PermissionKey.AUDIT_LOG_READ,
            effect: PermissionOverrideEffect.ALLOW,
          } as any,
        ],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
