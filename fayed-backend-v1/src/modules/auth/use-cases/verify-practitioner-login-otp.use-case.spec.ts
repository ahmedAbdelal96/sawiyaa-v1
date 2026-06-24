import { ForbiddenException } from '@nestjs/common';
import {
  OtpPurpose,
  PractitionerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { VerifyPractitionerLoginOtpUseCase } from './verify-practitioner-login-otp.use-case';

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
  const securityAuditService = {
    logAsync: jest.fn(),
  };

  const useCase = new VerifyPractitionerLoginOtpUseCase(
    verifyOtpChallengeUseCase as any,
    issueAuthTokensUseCase as any,
    userRepository as any,
    practitionerPresenceRepository as any,
    securityAuditService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(issueAuthTokensUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role: UserRoleType.PRACTITIONER,
      }),
    );
    expect(practitionerPresenceRepository.markOnline).toHaveBeenCalledWith(
      'profile-1',
    );
    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledWith({
      challengeId: 'challenge-1',
      code: '123456',
      purpose: OtpPurpose.PRACTITIONER_LOGIN,
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
});
