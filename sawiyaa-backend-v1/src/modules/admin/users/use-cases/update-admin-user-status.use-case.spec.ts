import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { I18nService } from '@common/i18n/services/i18n.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { UserRoleType, UserStatus } from '@prisma/client';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';
import { UpdateAdminUserStatusUseCase } from './update-admin-user-status.use-case';

describe('UpdateAdminUserStatusUseCase', () => {
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
      updateUserStatus: jest
        .fn()
        .mockResolvedValue({ id: 'u2', status: UserStatus.INACTIVE }),
      revokeAllActiveSessions: jest.fn().mockResolvedValue(3),
      bumpTokenVersion: jest.fn().mockResolvedValue({ tokenVersion: 2 }),
    } as unknown as AdminUsersRepository;

    const policy = new AdminUserManagementPolicy();

    const audit = {
      logAsync: jest.fn(),
      recordRequired: jest.fn(),
    } as unknown as SecurityAuditService;

    const sut = new UpdateAdminUserStatusUseCase(
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
        status: UserStatus.INACTIVE,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks disabling the last SUPER_ADMIN', async () => {
    const { sut } = makeSut({
      internalUser: {
        id: 'u2',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.SUPER_ADMIN }],
      },
      superAdminCount: 1,
    });

    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'a1', roles: ['SUPER_ADMIN'] } as any,
        userId: 'u2',
        status: UserStatus.SUSPENDED,
        reason: 'Security review',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks self status changes', async () => {
    const { sut } = makeSut({
      internalUser: {
        id: 'u1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.ADMIN }],
      },
    });

    await expect(
      sut.execute({
        locale: 'en' as any,
        actor: { id: 'u1', roles: ['ADMIN'] } as any,
        userId: 'u1',
        status: UserStatus.INACTIVE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
