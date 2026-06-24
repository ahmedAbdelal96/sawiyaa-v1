import { ConflictException } from '@nestjs/common';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { VerifyPatientPasswordResetOtpUseCase } from './verify-patient-password-reset-otp.use-case';

describe('VerifyPatientPasswordResetOtpUseCase', () => {
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

  const useCase = new VerifyPatientPasswordResetOtpUseCase(
    i18nService as any,
    userEmailRepository as any,
    verifyOtpChallengeUseCase as any,
    passwordResetSessionRepository as any,
    passwordResetTokenService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a short-lived reset token after OTP verification', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PATIENT }] },
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PATIENT }] },
    });

    const result = await useCase.execute({
      email: 'patient@example.com',
      code: '123456',
      locale: 'en',
    });

    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledWith({
      userId: 'u1',
      code: '123456',
      purpose: OtpPurpose.PASSWORD_RESET,
    });
    expect(
      passwordResetSessionRepository.invalidateActiveByUserIdAndRole,
    ).toHaveBeenCalledWith('u1', UserRoleType.PATIENT);
    expect(passwordResetSessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        role: UserRoleType.PATIENT,
        tokenHash: 'token-hash',
      }),
    );
    expect(result.resetToken).toBe('plain-token');
    expect(result.nextStep).toBe('SET_NEW_PASSWORD');
  });

  it('throws conflict when resolved account is not a patient', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PRACTITIONER }] },
    });

    await expect(
      useCase.execute({
        email: 'doc@example.com',
        code: '123456',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
