import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  OtpChannel,
  OtpPurpose,
  PractitionerStatus,
  UserRoleType,
  UserStatus,
} from '@prisma/client';
import { LoginPractitionerPasswordUseCase } from './login-practitioner-password.use-case';

describe('LoginPractitionerPasswordUseCase', () => {
  const configService = {
    get: jest.fn(),
  };
  const userEmailRepository = {
    findByEmail: jest.fn(),
  };
  const authIdentityRepository = {
    findPasswordIdentityByUserId: jest.fn(),
    touchLastUsed: jest.fn(),
  };
  const twoFactorSettingRepository = {
    findByUserId: jest.fn(),
  };
  const verifyPasswordUseCase = {
    execute: jest.fn(),
  };
  const issueAuthTokensUseCase = {
    execute: jest.fn(),
  };
  const practitionerOtpChannelService = {
    resolveVerifiedChannel: jest.fn(),
  };
  const createOtpChallengeUseCase = {
    execute: jest.fn(),
  };
  const sendOtpChallengeUseCase = {
    execute: jest.fn(),
  };

  const useCase = new LoginPractitionerPasswordUseCase(
    configService as any,
    userEmailRepository as any,
    authIdentityRepository as any,
    twoFactorSettingRepository as any,
    verifyPasswordUseCase as any,
    issueAuthTokensUseCase as any,
    practitionerOtpChannelService as any,
    createOtpChallengeUseCase as any,
    sendOtpChallengeUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.nodeEnv') return 'development';
      if (key === 'auth.practitionerLoginOtpBypassInDev') return false;
      return undefined;
    });
  });

  it('creates and sends an OTP challenge without returning the code', async () => {
    userEmailRepository.findByEmail.mockResolvedValue({
      isPrimary: true,
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PRACTITIONER }],
        practitionerProfile: { status: PractitionerStatus.DRAFT },
        emails: [],
        phones: [],
      },
    });
    authIdentityRepository.findPasswordIdentityByUserId.mockResolvedValue({
      id: 'identity-1',
      passwordHash: 'hash',
    });
    verifyPasswordUseCase.execute.mockResolvedValue(true);
    practitionerOtpChannelService.resolveVerifiedChannel.mockReturnValue({
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
    });
    createOtpChallengeUseCase.execute.mockResolvedValue({
      challengeId: 'challenge-1',
      channel: OtpChannel.EMAIL,
      maskedTarget: 't***@example.com',
      expiresAt: new Date(),
      code: '123456',
      target: 'test@example.com',
    });
    sendOtpChallengeUseCase.execute.mockResolvedValue({ delivered: true });

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password',
      locale: 'en',
    });

    expect(result).toEqual(
      expect.objectContaining({
        challengeId: 'challenge-1',
        requiresOtpVerification: true,
      }),
    );
    expect((result as any).code).toBeUndefined();
    expect(createOtpChallengeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: OtpPurpose.PRACTITIONER_LOGIN,
      }),
    );
    expect(issueAuthTokensUseCase.execute).not.toHaveBeenCalled();
  });

  it('bypasses OTP in development and issues tokens directly when enabled', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'app.nodeEnv') return 'development';
      if (key === 'auth.practitionerLoginOtpBypassInDev') return true;
      return undefined;
    });
    userEmailRepository.findByEmail.mockResolvedValue({
      isPrimary: true,
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PRACTITIONER }],
        practitionerProfile: { status: PractitionerStatus.DRAFT },
        emails: [],
        phones: [],
      },
    });
    authIdentityRepository.findPasswordIdentityByUserId.mockResolvedValue({
      id: 'identity-1',
      passwordHash: 'hash',
    });
    verifyPasswordUseCase.execute.mockResolvedValue(true);
    twoFactorSettingRepository.findByUserId.mockResolvedValue(null);
    issueAuthTokensUseCase.execute.mockResolvedValue({
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiresAt: new Date(),
        refreshTokenExpiresAt: new Date(),
      },
      user: {
        id: 'user-1',
        displayName: 'Dr User',
        status: UserStatus.ACTIVE,
        roles: [UserRoleType.PRACTITIONER],
        primaryEmail: 'test@example.com',
        isEmailVerified: true,
        primaryPhone: null,
        isPhoneVerified: false,
        practitionerProfileId: 'profile-1',
        practitionerStatus: PractitionerStatus.DRAFT,
      },
    });

    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'password',
      locale: 'en',
      deviceContext: {
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        tokens: expect.objectContaining({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        }),
      }),
    );
    expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    expect(sendOtpChallengeUseCase.execute).not.toHaveBeenCalled();
    expect(issueAuthTokensUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role: UserRoleType.PRACTITIONER,
      }),
    );
  });

  it('rejects non-practitioner accounts', async () => {
    userEmailRepository.findByEmail.mockResolvedValue({
      isPrimary: true,
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PATIENT }],
        practitionerProfile: { status: PractitionerStatus.DRAFT },
      },
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'password',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects invalid credentials', async () => {
    userEmailRepository.findByEmail.mockResolvedValue({
      isPrimary: true,
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PRACTITIONER }],
        practitionerProfile: { status: PractitionerStatus.DRAFT },
      },
    });
    authIdentityRepository.findPasswordIdentityByUserId.mockResolvedValue({
      id: 'identity-1',
      passwordHash: 'hash',
    });
    verifyPasswordUseCase.execute.mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'wrong',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects login with non-primary email even if it belongs to the same user', async () => {
    userEmailRepository.findByEmail.mockResolvedValue({
      isPrimary: false,
      user: {
        id: 'user-1',
        status: UserStatus.ACTIVE,
        roles: [{ role: UserRoleType.PRACTITIONER }],
        practitionerProfile: { status: PractitionerStatus.DRAFT },
      },
    });

    await expect(
      useCase.execute({
        email: 'otp@example.com',
        password: 'password',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
