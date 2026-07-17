import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { UserRoleType, UserStatus } from '@prisma/client';
import { AUTH_LOCKOUT_CONTEXTS } from '../types/auth-lockout.types';
import { LoginPatientWithEmailPasswordUseCase } from './login-patient-with-email-password.use-case';

describe('LoginPatientWithEmailPasswordUseCase', () => {
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
  const authLockoutService = {
    getState: jest.fn(),
    recordFailure: jest.fn(),
    clear: jest.fn(),
  };
  const securityAuditService = {
    logAsync: jest.fn(),
  };

  const useCase = new LoginPatientWithEmailPasswordUseCase(
    userEmailRepository as any,
    authIdentityRepository as any,
    verifyPasswordUseCase as any,
    issueAuthTokensUseCase as any,
    authLockoutService as any,
    securityAuditService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    authLockoutService.getState.mockResolvedValue({
      attemptCount: 0,
      maxAttempts: 5,
      remainingAttempts: 5,
      lockedUntil: null,
      retryAfterSeconds: 0,
      isLocked: false,
    });
    authLockoutService.recordFailure.mockResolvedValue({
      attemptCount: 1,
      maxAttempts: 5,
      remainingAttempts: 4,
      lockedUntil: null,
      retryAfterSeconds: 0,
      isLocked: false,
    });
    authLockoutService.clear.mockResolvedValue(undefined);
  });

  it('allows a patient to sign in and clears the password lockout state', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PATIENT }],
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
      email: 'patient@hesba.local',
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
        role: UserRoleType.PATIENT,
      }),
    );
    expect(authIdentityRepository.touchLastUsed).toHaveBeenCalledWith(
      'identity-1',
    );
    expect(authLockoutService.clear).toHaveBeenCalledWith(
      AUTH_LOCKOUT_CONTEXTS.PATIENT_PASSWORD_LOGIN,
      'user:user-1',
    );
  });

  it('rejects non-patient accounts with a generic invalid credentials response', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.ADMIN }],
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
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authLockoutService.recordFailure).toHaveBeenCalledWith(
      AUTH_LOCKOUT_CONTEXTS.PATIENT_PASSWORD_LOGIN,
      'user:user-1',
    );
  });

  it('returns a lockout response when the patient password flow is already locked', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PATIENT }],
      },
    });
    authLockoutService.getState.mockResolvedValue({
      attemptCount: 5,
      maxAttempts: 5,
      remainingAttempts: 0,
      lockedUntil: new Date('2026-07-10T10:00:00.000Z'),
      retryAfterSeconds: 60,
      isLocked: true,
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
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });
});
