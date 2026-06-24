import { BadRequestException, ConflictException } from '@nestjs/common';
import { OtpChannel, OtpPurpose, UserRoleType } from '@prisma/client';
import { RequestPractitionerPasswordResetUseCase } from './request-practitioner-password-reset.use-case';

describe('RequestPractitionerPasswordResetUseCase', () => {
  const i18nService = { t: jest.fn().mockReturnValue('ok') };
  const userEmailRepository = { findByEmailForAuth: jest.fn() };
  const twoFactorSettingRepository = { findByUserId: jest.fn() };
  const practitionerOtpChannelService = { resolveVerifiedChannel: jest.fn() };
  const createOtpChallengeUseCase = { execute: jest.fn() };
  const sendOtpChallengeUseCase = { execute: jest.fn() };
  const rateLimitService = {
    check: jest.fn().mockResolvedValue({ allowed: true }),
  };

  const useCase = new RequestPractitionerPasswordResetUseCase(
    i18nService as any,
    userEmailRepository as any,
    twoFactorSettingRepository as any,
    practitionerOtpChannelService as any,
    createOtpChallengeUseCase as any,
    sendOtpChallengeUseCase as any,
    rateLimitService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimitService.check.mockResolvedValue({ allowed: true });
  });

  it('creates and sends password reset OTP when practitioner exists', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
        emails: [],
        phones: [],
      },
    });
    practitionerOtpChannelService.resolveVerifiedChannel.mockReturnValue({
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
    });
    createOtpChallengeUseCase.execute.mockResolvedValue({
      challengeId: 'challenge-1',
      channel: OtpChannel.EMAIL,
      target: 'test@example.com',
      code: '123456',
      expiresAt: new Date(),
    });

    await useCase.execute({ email: 'test@example.com', locale: 'en' });

    expect(createOtpChallengeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: OtpPurpose.PASSWORD_RESET,
      }),
    );
    expect(sendOtpChallengeUseCase.execute).toHaveBeenCalled();
  });

  it('passes isPractitioner=true so practitioner reset uses English template', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
        emails: [{ email: 'doc@sawiyaa.com' }],
        phones: [],
      },
    });
    practitionerOtpChannelService.resolveVerifiedChannel.mockReturnValue({
      channel: OtpChannel.EMAIL,
      target: 'doc@sawiyaa.com',
    });
    createOtpChallengeUseCase.execute.mockResolvedValue({
      challengeId: 'ch-1',
      channel: OtpChannel.EMAIL,
      target: 'doc@sawiyaa.com',
      code: '555666',
      expiresAt: new Date(),
    });

    await useCase.execute({ email: 'doc@sawiyaa.com', locale: 'ar' });

    expect(sendOtpChallengeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ isPractitioner: true, locale: 'ar' }),
    );
  });

  it('throws conflict for unknown email', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

    await expect(
      useCase.execute({
        email: 'unknown@example.com',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns next step metadata after sending OTP', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
        emails: [{ email: 'doc@sawiyaa.com' }],
        phones: [],
      },
    });
    practitionerOtpChannelService.resolveVerifiedChannel.mockReturnValue({
      channel: OtpChannel.EMAIL,
      target: 'doc@sawiyaa.com',
    });
    createOtpChallengeUseCase.execute.mockResolvedValue({
      challengeId: 'ch-1',
      channel: OtpChannel.EMAIL,
      target: 'doc@sawiyaa.com',
      code: '555666',
      expiresAt: new Date(),
    });

    const result = await useCase.execute({
      email: 'doc@sawiyaa.com',
      locale: 'en',
    });

    expect((result as any).nextStep).toBe('VERIFY_OTP');
  });

  it('throws when per-email+role rate limit is exceeded', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: {
        id: 'user-1',
        roles: [{ role: UserRoleType.PRACTITIONER }],
        emails: [{ email: 'doc@sawiyaa.com' }],
        phones: [],
      },
    });
    rateLimitService.check.mockResolvedValue({
      allowed: false,
      reason: 'EMAIL_ROLE_LIMIT_15MIN',
      retryAfterSeconds: 300,
      retryAfterMs: 300_000,
    });

    await expect(
      useCase.execute({ email: 'doc@sawiyaa.com', locale: 'en' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createOtpChallengeUseCase.execute).not.toHaveBeenCalled();
  });
});
