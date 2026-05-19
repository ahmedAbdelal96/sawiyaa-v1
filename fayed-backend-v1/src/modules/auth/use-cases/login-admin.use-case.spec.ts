import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { LoginAdminUseCase } from './login-admin.use-case';

describe('LoginAdminUseCase', () => {
  const userEmailRepository = {
    findByEmailForAuth: jest.fn(),
  };
  const authIdentityRepository = {
    findPasswordIdentityByUserId: jest.fn(),
    touchLastUsed: jest.fn(),
  };
  const verifyPasswordUseCase = {
    execute: jest.fn(),
  };
  const issueAuthTokensUseCase = {
    execute: jest.fn(),
  };

  const useCase = new LoginAdminUseCase(
    userEmailRepository as any,
    authIdentityRepository as any,
    verifyPasswordUseCase as any,
    issueAuthTokensUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    UserRoleType.SUPER_ADMIN,
    UserRoleType.ADMIN,
    UserRoleType.FINANCE_STAFF,
    UserRoleType.MARKETING_STAFF,
    UserRoleType.PRACTITIONER_REVIEWER,
    UserRoleType.PATIENT_OPERATIONS,
    UserRoleType.SUPPORT,
    UserRoleType.CONTENT_REVIEWER,
  ])('allows %s to sign in through admin auth', async (role) => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role }],
      },
    });
    authIdentityRepository.findPasswordIdentityByUserId.mockResolvedValue({
      id: 'identity-1',
      passwordHash: 'hash',
    });
    verifyPasswordUseCase.execute.mockResolvedValue(true);
    issueAuthTokensUseCase.execute.mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(),
        refreshTokenExpiresAt: new Date(),
      },
      user: {
        id: 'user-1',
      },
    });

    await useCase.execute({
      email: 'staff@hesba.local',
      password: 'Password123!',
      deviceContext: {
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });

    expect(issueAuthTokensUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role,
      }),
    );
    expect(authIdentityRepository.touchLastUsed).toHaveBeenCalledWith('identity-1');
  });

  it('rejects users without an admin-class role', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PATIENT }],
      },
    });

    await expect(
      useCase.execute({
        email: 'patient@hesba.local',
        password: 'Password123!',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid credentials', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.ADMIN }],
      },
    });
    authIdentityRepository.findPasswordIdentityByUserId.mockResolvedValue({
      id: 'identity-1',
      passwordHash: 'hash',
    });
    verifyPasswordUseCase.execute.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: 'admin@hesba.local',
        password: 'wrong',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
