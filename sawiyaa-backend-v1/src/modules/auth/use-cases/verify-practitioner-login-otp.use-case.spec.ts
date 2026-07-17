import { ForbiddenException, HttpStatus } from '@nestjs/common';
import {
  OtpPurpose,
  PractitionerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { VerifyPractitionerLoginOtpUseCase } from './verify-practitioner-login-otp.use-case';
import { AUTH_LOCKOUT_CONTEXTS } from '../types/auth-lockout.types';

describe('VerifyPractitionerLoginOtpUseCase', () => {
  type SuccessfulLoginResult = {
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };

  const verifyOtpChallengeUseCase = {
    execute: jest.fn(),
  };
  const issueAuthTokensUseCase = {
    execute: jest.fn(),
  };
  const userRepository = {
    findByIdWithAuthContext: jest.fn(),
  };
  const practitionerPresenceRepository = {
    markOnline: jest.fn(),
  };
  const authLockoutService = {
    getState: jest.fn(),
    recordFailure: jest.fn(),
    clear: jest.fn(),
  };
  const securityAuditService = {
    logAsync: jest.fn(),
  };

  const useCase = new VerifyPractitionerLoginOtpUseCase(
    verifyOtpChallengeUseCase as any,
    issueAuthTokensUseCase as any,
    userRepository as any,
    practitionerPresenceRepository as any,
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

  it('marks the practitioner online after a successful OTP login', async () => {
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
      },
    });
    userRepository.findByIdWithAuthContext.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      practitionerProfile: {
        id: 'profile-1',
        status: PractitionerStatus.APPROVED,
      },
    });
    issueAuthTokensUseCase.execute.mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
    });
    practitionerPresenceRepository.markOnline.mockResolvedValue({});

    const result = (await useCase.execute({
      challengeId: 'challenge-1',
      code: '123456',
      locale: 'en',
      deviceContext: {
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    })) as SuccessfulLoginResult;

    expect(result.tokens.accessToken).toBe('access-token');
    expect(result.tokens.refreshToken).toBe('refresh-token');
    expect(result.nextStep).toBe('AUTHENTICATED');
    expect(issueAuthTokensUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role: UserRoleType.PRACTITIONER,
      }),
    );
    expect(practitionerPresenceRepository.markOnline).toHaveBeenCalledWith(
      'profile-1',
    );
    expect(authLockoutService.clear).toHaveBeenCalledWith(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:user-1',
    );
    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      code: '123456',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
      onInvalidCodeAttempt: expect.any(Function),
    });
  });

  it('does not mark online for invalid practitioner OTP attempts', async () => {
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
      },
    });
    userRepository.findByIdWithAuthContext.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      practitionerProfile: null,
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '123456',
        locale: 'en',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(issueAuthTokensUseCase.execute).not.toHaveBeenCalled();
    expect(practitionerPresenceRepository.markOnline).not.toHaveBeenCalled();
  });

  it('returns a temporary lockout when repeated invalid OTP attempts hit the limit', async () => {
    verifyOtpChallengeUseCase.execute.mockImplementation(
      async (input: { onInvalidCodeAttempt?: (challenge: { user: { id: string } }) => Promise<void> | void }) => {
        if (input.onInvalidCodeAttempt) {
          await input.onInvalidCodeAttempt({
            user: {
              id: 'user-1',
            },
          });
        }

        throw new ForbiddenException({
          messageKey: 'auth.errors.otpCodeInvalid',
          error: 'OTP_CODE_INVALID',
        });
      },
    );
    authLockoutService.recordFailure.mockResolvedValue({
      attemptCount: 5,
      maxAttempts: 5,
      remainingAttempts: 0,
      lockedUntil: new Date('2026-07-10T10:00:00.000Z'),
      retryAfterSeconds: 60,
      isLocked: true,
    });

    await expect(
      useCase.execute({
        challengeId: 'challenge-1',
        code: '111111',
        locale: 'en',
        deviceContext: {
          deviceId: 'device-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(authLockoutService.recordFailure).toHaveBeenCalledWith(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:user-1',
    );
  });
});
