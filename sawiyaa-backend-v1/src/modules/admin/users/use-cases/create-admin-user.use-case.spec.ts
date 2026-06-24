import { ConflictException } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppRole } from '@common/enums/app-role.enum';
import { I18nService } from '@common/i18n/services/i18n.service';
import { SecurityAuditOutcome } from '@prisma/client';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { PrismaService } from '@common/prisma/prisma.service';
import { HashPasswordUseCase } from '@modules/auth/use-cases/hash-password.use-case';
import { CreateAdminUserUseCase } from './create-admin-user.use-case';
import { AdminUserManagementPolicy } from '../policies/admin-user-management.policy';
import { AdminUsersRepository } from '../repositories/admin-users.repository';

describe('CreateAdminUserUseCase', () => {
  const prisma = {
    userEmail: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: never) => unknown) =>
      callback({} as never),
    ),
  } as unknown as PrismaService;

  const i18nService = {
    t: jest.fn((key: string) => key),
  } as unknown as I18nService;

  const repo = {} as unknown as AdminUsersRepository;
  const policy = new AdminUserManagementPolicy();
  const hashPasswordUseCase = {
    execute: jest.fn(),
  } as unknown as HashPasswordUseCase;
  const securityAuditService = {
    logAsync: jest.fn(),
  } as unknown as SecurityAuditService;

  const useCase = new CreateAdminUserUseCase(
    prisma,
    i18nService,
    repo,
    policy,
    hashPasswordUseCase,
    securityAuditService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a transaction-time unique violation to a friendly conflict', async () => {
    (prisma.userEmail.findUnique as jest.Mock).mockResolvedValue(null);
    (hashPasswordUseCase.execute as jest.Mock).mockResolvedValue('hashed');
    const tx = {
      user: {
        create: jest.fn().mockResolvedValue({
          id: 'user-1',
          status: UserStatus.ACTIVE,
          createdAt: new Date('2026-06-18T10:00:00.000Z'),
        }),
        update: jest.fn(),
      },
      userEmail: {
        create: jest.fn().mockRejectedValue(
          new PrismaClientKnownRequestError('Unique constraint', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        ),
      },
      userPhone: {
        create: jest.fn(),
      },
      authIdentity: {
        create: jest.fn(),
      },
      userRole: {
        createMany: jest.fn(),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(
      async (callback: (tx: never) => unknown) => callback(tx as never),
    );

    const error = await useCase
      .execute({
        locale: 'en' as any,
        actor: {
          id: 'actor-1',
          roles: [AppRole.SUPER_ADMIN],
        } as any,
        payload: {
          email: 'admin.dup@example.com',
          displayName: 'Admin Dup',
          password: 'Password123!',
          roles: [UserRoleType.ADMIN],
          status: UserStatus.ACTIVE,
        } as any,
      })
      .catch((caught: unknown) => caught as ConflictException);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.getResponse()).toEqual({
      messageKey: 'admin.adminUsers.errors.emailAlreadyExists',
      error: 'ADMIN_USER_EMAIL_EXISTS',
    });
    expect(JSON.stringify(error.getResponse())).not.toContain('P2002');
    expect(JSON.stringify(error.getResponse())).not.toContain(
      'UserEmail_email_lower_unique_idx',
    );
    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: SecurityAuditOutcome.FAILURE,
      }),
    );
  });
});
