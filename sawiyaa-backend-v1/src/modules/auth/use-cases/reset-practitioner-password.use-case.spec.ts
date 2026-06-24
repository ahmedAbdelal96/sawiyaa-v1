import { ConflictException } from '@nestjs/common';
import { OtpPurpose, UserRoleType } from '@prisma/client';
import { ResetPractitionerPasswordUseCase } from './reset-practitioner-password.use-case';

describe('ResetPractitionerPasswordUseCase', () => {
  const prisma = {
    $transaction: jest.fn(async (cb: any) => cb({})),
  };
  const i18nService = { t: jest.fn().mockReturnValue('ok') };
  const verifyOtpChallengeUseCase = { execute: jest.fn() };
  const hashPasswordUseCase = { execute: jest.fn() };
  const authIdentityRepository = { updatePasswordHash: jest.fn() };
  const userEmailRepository = { findByEmailForAuth: jest.fn() };
  const invalidateUserTokensUseCase = { execute: jest.fn() };

  const useCase = new ResetPractitionerPasswordUseCase(
    prisma as any,
    i18nService as any,
    verifyOtpChallengeUseCase as any,
    hashPasswordUseCase as any,
    authIdentityRepository as any,
    userEmailRepository as any,
    invalidateUserTokensUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies OTP and resets password for practitioners', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'user-1' },
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      id: 'challenge-1',
      user: { id: 'user-1', roles: [{ role: UserRoleType.PRACTITIONER }] },
    });
    hashPasswordUseCase.execute.mockResolvedValue('hashed');

    const result = await useCase.execute({
      email: 'test@example.com',
      code: '123456',
      newPassword: 'new-pass',
      locale: 'en',
    });

    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: OtpPurpose.PASSWORD_RESET,
      }),
    );
    expect(authIdentityRepository.updatePasswordHash).toHaveBeenCalled();
    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalled();
    expect(result).toEqual({ message: 'ok' });
    expect((result as any).tokens).toBeUndefined();
  });

  it('invalidates all existing sessions/tokens in the same transaction after reset', async () => {
    const practitioner = {
      id: 'user-1',
      roles: [{ role: UserRoleType.PRACTITIONER }],
    };
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: practitioner,
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      id: 'challenge-1',
      user: practitioner,
    });
    hashPasswordUseCase.execute.mockResolvedValue('hashed');

    let capturedTx: any = null;
    prisma.$transaction.mockImplementation(async (cb: any) => {
      const tx = {};
      capturedTx = tx;
      return cb(tx);
    });

    await useCase.execute({
      email: 'test@example.com',
      code: '123456',
      newPassword: 'new-pass',
      locale: 'en',
    });

    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalledWith(
      'user-1',
      capturedTx,
    );
  });

  it('rejects non-practitioner users', async () => {
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: { id: 'user-1' },
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({
      id: 'challenge-1',
      user: { id: 'user-1', roles: [{ role: UserRoleType.PATIENT }] },
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        code: '123456',
        newPassword: 'new-pass',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects OTP reuse once the original reset challenge has been consumed', async () => {
    const practitioner = {
      id: 'user-1',
      roles: [{ role: UserRoleType.PRACTITIONER }],
    };
    userEmailRepository.findByEmailForAuth.mockResolvedValue({
      user: practitioner,
    });
    hashPasswordUseCase.execute.mockResolvedValue('hashed');

    verifyOtpChallengeUseCase.execute
      .mockResolvedValueOnce({ id: 'challenge-1', user: practitioner })
      .mockRejectedValueOnce(
        new ConflictException({
          messageKey: 'auth.errors.otpChallengeInvalid',
          error: 'OTP_CHALLENGE_INVALID',
        }),
      );

    await useCase.execute({
      email: 'test@example.com',
      code: '123456',
      newPassword: 'new-pass',
      locale: 'en',
    });

    await expect(
      useCase.execute({
        email: 'test@example.com',
        code: '123456',
        newPassword: 'new-pass',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(authIdentityRepository.updatePasswordHash).toHaveBeenCalledTimes(1);
    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalledTimes(1);
    expect(verifyOtpChallengeUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
