import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { ConfirmPatientPasswordResetUseCase } from './confirm-patient-password-reset.use-case';

describe('ConfirmPatientPasswordResetUseCase', () => {
  const prisma = { $transaction: jest.fn() };
  const i18nService = { t: jest.fn().mockReturnValue('ok') };
  const passwordResetSessionRepository = {
    findActiveByTokenHash: jest.fn(),
    consume: jest.fn(),
  };
  const passwordResetTokenService = {
    hashToken: jest.fn().mockReturnValue('token-hash'),
  };
  const hashPasswordUseCase = {
    execute: jest.fn().mockResolvedValue('hashed-password'),
  };
  const authIdentityRepository = { updatePasswordHash: jest.fn() };
  const invalidateUserTokensUseCase = { execute: jest.fn() };
  const issueAuthTokensUseCase = {
    execute: jest.fn().mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshTokenExpiresAt: new Date(),
    }),
  };
  const userRepository = {
    findByIdWithAuthContext: jest.fn().mockResolvedValue({
      id: 'u1',
      status: 'ACTIVE',
      roles: [{ role: UserRoleType.PATIENT }],
    }),
  };
  const operationalNotificationService = {
    notifyPatientPasswordReset: jest.fn().mockResolvedValue(undefined),
  };

  const useCase = new ConfirmPatientPasswordResetUseCase(
    prisma as any,
    i18nService as any,
    passwordResetSessionRepository as any,
    passwordResetTokenService as any,
    hashPasswordUseCase as any,
    authIdentityRepository as any,
    invalidateUserTokensUseCase as any,
    issueAuthTokensUseCase as any,
    userRepository as any,
    undefined,
    operationalNotificationService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: any) => cb({}));
  });

  it('consumes reset session and invalidates tokens on success', async () => {
    passwordResetSessionRepository.findActiveByTokenHash.mockResolvedValue({
      id: 'reset-1',
      userId: 'u1',
      role: UserRoleType.PATIENT,
      user: { roles: [{ role: UserRoleType.PATIENT }] },
    });

    const result = await useCase.execute({
      resetToken: 'plain-token',
      newPassword: 'NewPassword123',
      locale: 'en',
    });

    expect(authIdentityRepository.updatePasswordHash).toHaveBeenCalledWith(
      'u1',
      'hashed-password',
      expect.any(Object),
    );
    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalledWith(
      'u1',
      expect.any(Object),
    );
    expect(passwordResetSessionRepository.consume).toHaveBeenCalledWith(
      'reset-1',
      expect.any(Object),
    );
    expect(
      operationalNotificationService.notifyPatientPasswordReset,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', eventId: expect.any(String) }),
    );
    expect(result.message).toBe('ok');
  });

  it('does not allow notification failure to undo a committed password reset', async () => {
    passwordResetSessionRepository.findActiveByTokenHash.mockResolvedValue({
      id: 'reset-1',
      userId: 'u1',
      role: UserRoleType.PATIENT,
      user: { roles: [{ role: UserRoleType.PATIENT }] },
    });
    operationalNotificationService.notifyPatientPasswordReset.mockRejectedValue(
      new Error('notification unavailable'),
    );

    await expect(
      useCase.execute({
        resetToken: 'plain-token',
        newPassword: 'NewPassword123',
        locale: 'en',
      }),
    ).resolves.toEqual(expect.objectContaining({ message: 'ok' }));
    expect(authIdentityRepository.updatePasswordHash).toHaveBeenCalled();
    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalled();
    expect(passwordResetSessionRepository.consume).toHaveBeenCalled();
  });

  it('rejects invalid or expired reset token', async () => {
    passwordResetSessionRepository.findActiveByTokenHash.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        resetToken: 'bad-token',
        newPassword: 'NewPassword123',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(
      operationalNotificationService.notifyPatientPasswordReset,
    ).not.toHaveBeenCalled();
  });

  it('rejects reset session for non-patient role', async () => {
    passwordResetSessionRepository.findActiveByTokenHash.mockResolvedValue({
      id: 'reset-1',
      userId: 'u1',
      role: UserRoleType.PRACTITIONER,
      user: { roles: [{ role: UserRoleType.PRACTITIONER }] },
    });

    await expect(
      useCase.execute({
        resetToken: 'plain-token',
        newPassword: 'NewPassword123',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      operationalNotificationService.notifyPatientPasswordReset,
    ).not.toHaveBeenCalled();
  });
});
