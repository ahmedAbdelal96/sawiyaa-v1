import { ForbiddenException } from '@nestjs/common';
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

  async function captureFailure(
    action: () => Promise<unknown>,
  ): Promise<unknown> {
    try {
      await action();
      throw new Error('Expected action to fail');
    } catch (error: unknown) {
      return error;
    }
  }

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

  it('uses the same external OTP error for an unknown account as for an invalid OTP', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue(null);

    const unknownAccountError = await captureFailure(() =>
      useCase.execute({
        email: 'unknown@example.com',
        code: '123456',
        locale: 'en',
      }),
    );

    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PATIENT }] },
    });
    verifyOtpChallengeUseCase.execute.mockRejectedValue(
      new ForbiddenException({
        messageKey: 'auth.errors.otpCodeInvalid',
        error: 'OTP_CODE_INVALID',
      }),
    );

    const invalidOtpError = await captureFailure(() =>
      useCase.execute({
        email: 'patient@example.com',
        code: '123456',
        locale: 'en',
      }),
    );

    if (
      !(unknownAccountError instanceof ForbiddenException) ||
      !(invalidOtpError instanceof ForbiddenException)
    ) {
      throw new Error('Expected both failures to be forbidden OTP failures');
    }
    expect(unknownAccountError.getResponse()).toEqual(
      invalidOtpError.getResponse(),
    );
    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledTimes(1);
    expect(passwordResetSessionRepository.create).not.toHaveBeenCalled();
  });

  it('uses the same external OTP error for a wrong-role account', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'u1', roles: [{ role: UserRoleType.PRACTITIONER }] },
    });

    await expect(
      useCase.execute({
        email: 'doc@example.com',
        code: '123456',
        locale: 'en',
      }),
    ).rejects.toMatchObject({
      response: {
        messageKey: 'auth.errors.otpCodeInvalid',
        error: 'OTP_CODE_INVALID',
      },
    });
    expect(verifyOtpChallengeUseCase.execute).not.toHaveBeenCalled();
  });
});
