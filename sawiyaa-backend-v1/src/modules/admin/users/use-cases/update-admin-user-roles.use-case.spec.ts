import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { UserRoleType } from '@prisma/client';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { UpdateAdminUserRolesUseCase } from './update-admin-user-roles.use-case';

describe('UpdateAdminUserRolesUseCase', () => {
  const makeSut = (overrides?: {
    internalUser?: any | null;
    superAdminCount?: number;
  }) => {
    const prisma = {
      $transaction: jest.fn().mockImplementation(async (fn: any) => fn({})),
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
      setUserRoles: jest.fn().mockResolvedValue(undefined),
    } as unknown as AdminUsersRepository;

    const policy = new AdminUserManagementPolicy();

    const audit = {
      logAsync: jest.fn(),
      recordRequired: jest.fn(),
    } as unknown as SecurityAuditService;

    const sut = new UpdateAdminUserRolesUseCase(
      prisma,
      i18nService,
      repo,
      policy,
      audit,
    );

    return { sut, repo };
  };

  it('rejects when target is not an internal user', async () => {
    const { sut } = makeSut({ internalUser: null });
    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: ['ADMIN'] } as any,
        userId: 'u2',
        roles: [UserRoleType.ADMIN],
        reason: 'Security review',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks non-super-admin from assigning SUPER_ADMIN', async () => {
    const { sut } = makeSut({
      internalUser: { id: 'u2', roles: [{ role: UserRoleType.ADMIN }] },
    });
    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: ['ADMIN'] } as any,
        userId: 'u2',
        roles: [UserRoleType.SUPER_ADMIN],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks removing SUPER_ADMIN from the last super admin', async () => {
    const { sut } = makeSut({
      internalUser: { id: 'u2', roles: [{ role: UserRoleType.SUPER_ADMIN }] },
      superAdminCount: 1,
    });
    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: ['SUPER_ADMIN'] } as any,
        userId: 'u2',
        roles: [UserRoleType.ADMIN],
        reason: 'Security review',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
