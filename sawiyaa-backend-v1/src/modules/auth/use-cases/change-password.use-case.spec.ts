import { UnauthorizedException } from '@nestjs/common';
import { ChangePasswordUseCase } from './change-password.use-case';

describe('ChangePasswordUseCase', () => {
  const userRepository = { findByIdWithAuthContext: jest.fn() };
  const identityRepository = { findPasswordIdentityByUserId: jest.fn(), updatePasswordHash: jest.fn() };
  const verifyPasswordUseCase = { execute: jest.fn() };
  const hashPasswordUseCase = { execute: jest.fn() };
  const invalidateUserTokensUseCase = { execute: jest.fn() };
  const securityAuditService = { logAsync: jest.fn() };
  const prisma = { $transaction: jest.fn(async (callback) => callback({})) };
  const useCase = new ChangePasswordUseCase(
    prisma as never, userRepository as never, identityRepository as never,
    verifyPasswordUseCase as never, hashPasswordUseCase as never,
    invalidateUserTokensUseCase as never, securityAuditService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userRepository.findByIdWithAuthContext.mockResolvedValue({ status: 'ACTIVE', roles: [{ role: 'PATIENT' }] });
    identityRepository.findPasswordIdentityByUserId.mockResolvedValue({ id: 'identity-1', passwordHash: 'old-hash' });
    hashPasswordUseCase.execute.mockResolvedValue('new-hash');
  });

  it('updates the password and invalidates every session after correct current password', async () => {
    verifyPasswordUseCase.execute.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(useCase.execute({ userId: 'user-1', role: 'PATIENT', currentPassword: 'OldPassword1', newPassword: 'NewPassword1' })).resolves.toEqual({ currentSessionInvalidated: true });

    expect(identityRepository.updatePasswordHash).toHaveBeenCalledWith('user-1', 'new-hash', expect.anything());
    expect(invalidateUserTokensUseCase.execute).toHaveBeenCalledWith('user-1', expect.anything());
    expect(JSON.stringify(securityAuditService.logAsync.mock.calls)).not.toContain('OldPassword1');
    expect(JSON.stringify(securityAuditService.logAsync.mock.calls)).not.toContain('NewPassword1');
  });

  it('does not write or revoke when current password is wrong', async () => {
    verifyPasswordUseCase.execute.mockResolvedValueOnce(false);

    await expect(useCase.execute({ userId: 'user-1', role: 'PATIENT', currentPassword: 'WrongPassword1', newPassword: 'NewPassword1' })).rejects.toBeInstanceOf(UnauthorizedException);

    expect(identityRepository.updatePasswordHash).not.toHaveBeenCalled();
    expect(invalidateUserTokensUseCase.execute).not.toHaveBeenCalled();
  });
});
