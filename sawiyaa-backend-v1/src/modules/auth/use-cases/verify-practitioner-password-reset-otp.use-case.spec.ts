import { ConflictException } from '@nestjs/common';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { VerifyPractitionerPasswordResetOtpUseCase } from './verify-practitioner-password-reset-otp.use-case';

describe('VerifyPractitionerPasswordResetOtpUseCase', () => {
  const i18nService = { t: jest.fn().mockReturnValue('ok') };
  const userEmailRepository = { findByEmailForAuth: jest.fn() };
  const verifyOtpChallengeUseCase = { execute: jest.fn() };
  const passwordResetSessionRepository = {
    invalidateActiveByUserIdAndRole: jest.fn(),
    create: jest.fn(),
  };
  const passwordResetTokenService = {
    generateToken: jest.fn().mockReturnValue('plain-token'),
    hashToken: jest.fn().mockReturnValue('token-hash'),
    getSessionTtlMinutes: jest.fn().mockReturnValue(10),
  };

  const useCase = new VerifyPractitionerPasswordResetOtpUseCase(
    i18nService as any,
    userEmailRepository as any,
    verifyOtpChallengeUseCase as any,
    passwordResetSessionRepository as any,
    passwordResetTokenService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates reset token for verified practitioner OTP', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PRACTITIONER }] },
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PRACTITIONER }] },
    });

    const result = await useCase.execute({
      email: 'doc@example.com',
      code: '123456',
      locale: 'en',
    });

    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledWith({
      userId: 'u1',
      code: '123456',
      purpose: OtpPurpose.PASSWORD_RESET,
    });
    expect(result.nextStep).toBe('SET_NEW_PASSWORD');
  });

  it('throws conflict for non-practitioner role', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PATIENT }] },
    });

    await expect(
      useCase.execute({
        email: 'patient@example.com',
        code: '123456',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
