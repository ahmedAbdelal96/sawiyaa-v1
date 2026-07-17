import { NotFoundException } from '@nestjs/common';
import { ClearPractitionerAuthLockoutUseCase } from './clear-practitioner-auth-lockout.use-case';
import { AUTH_LOCKOUT_CONTEXTS } from '@modules/auth/types/auth-lockout.types';

describe('ClearPractitionerAuthLockoutUseCase', () => {
  const adminPractitionerProfileRepository = {
    findById: jest.fn(),
  };
  const authLockoutService = {
    clear: jest.fn(),
  };
  const securityAuditService = {
    logAsync: jest.fn(),
  };
  const i18nService = {
    t: jest.fn((key: string) => key),
  };

  const useCase = new ClearPractitionerAuthLockoutUseCase(
    adminPractitionerProfileRepository as any,
    authLockoutService as any,
    securityAuditService as any,
    i18nService as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears both practitioner password and OTP lockout states', async () => {
    adminPractitionerProfileRepository.findById.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
    });

    const result = await useCase.execute({
      practitionerId: 'profile-1',
      actorUserId: 'admin-1',
      locale: 'en',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      correlationId: 'req-1',
    });

    expect(authLockoutService.clear).toHaveBeenCalledWith(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_PASSWORD_LOGIN,
      'user:user-1',
    );
    expect(authLockoutService.clear).toHaveBeenCalledWith(
      AUTH_LOCKOUT_CONTEXTS.PRACTITIONER_OTP_VERIFY,
      'user:user-1',
    );
    expect(result.message).toBe('auth.success.practitionerAuthLockoutCleared');
    expect(securityAuditService.logAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.practitioner.authLockout.clear',
        targetUserId: 'user-1',
      }),
    );
  });

  it('throws not found when the practitioner profile does not exist', async () => {
    adminPractitionerProfileRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        practitionerId: 'missing',
        actorUserId: 'admin-1',
        locale: 'en',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

