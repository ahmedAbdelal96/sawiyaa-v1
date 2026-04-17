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
    userEmailRepository as any,
    authIdentityRepository as any,
    twoFactorSettingRepository as any,
    verifyPasswordUseCase as any,
    practitionerOtpChannelService as any,
    createOtpChallengeUseCase as any,
    sendOtpChallengeUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
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
