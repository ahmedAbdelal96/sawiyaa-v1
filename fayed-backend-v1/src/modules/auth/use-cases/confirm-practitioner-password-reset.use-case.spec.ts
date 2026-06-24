import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { ConfirmPractitionerPasswordResetUseCase } from './confirm-practitioner-password-reset.use-case';

describe('ConfirmPractitionerPasswordResetUseCase', () => {
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

  const useCase = new ConfirmPractitionerPasswordResetUseCase(
    prisma as any,
    i18nService as any,
    passwordResetSessionRepository as any,
    passwordResetTokenService as any,
    hashPasswordUseCase as any,
    authIdentityRepository as any,
    invalidateUserTokensUseCase as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: any) => cb({}));
  });

  it('consumes reset session and invalidates practitioner tokens', async () => {
    passwordResetSessionRepository.findActiveByTokenHash.mockResolvedValue({
      id: 'reset-1',
      userId: 'u1',
      role: UserRoleType.PRACTITIONER,
      user: { roles: [{ role: UserRoleType.PRACTITIONER }] },
    });

    await useCase.execute({
      resetToken: 'plain-token',
      newPassword: 'NewPassword123',
      locale: 'en',
    });

    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalledWith(
      'u1',
      expect.any(Object),
    );
    expect(passwordResetSessionRepository.consume).toHaveBeenCalledWith(
      'reset-1',
      expect.any(Object),
    );
  });

  it('rejects invalid reset token', async () => {
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
  });

  it('rejects reset session for non-practitioner role', async () => {
    passwordResetSessionRepository.findActiveByTokenHash.mockResolvedValue({
      id: 'reset-1',
      userId: 'u1',
      role: UserRoleType.PATIENT,
      user: { roles: [{ role: UserRoleType.PATIENT }] },
    });

    await expect(
      useCase.execute({
        resetToken: 'plain-token',
        newPassword: 'NewPassword123',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
