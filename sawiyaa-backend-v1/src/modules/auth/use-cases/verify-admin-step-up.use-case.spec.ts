import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { AuthIdentityRepository } from '../repositories/auth-identity.repository';
import { StepUpService } from '../services/step-up.service';
import { VerifyPasswordUseCase } from './verify-password.use-case';
import { VerifyAdminStepUpUseCase } from './verify-admin-step-up.use-case';

describe('VerifyAdminStepUpUseCase', () => {
  const makeSut = (overrides?: {
    passwordOk?: boolean;
    hasIdentity?: boolean;
  }) => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'stepUp') return { ttlSeconds: 600 };
        return undefined;
      }),
    } as unknown as ConfigService;

    const authIdentityRepository = {
      findPasswordIdentityByUserId: jest
        .fn()
        .mockResolvedValue(
          overrides?.hasIdentity === false ? null : { passwordHash: 'hash' },
        ),
    } as unknown as AuthIdentityRepository;

    const verifyPasswordUseCase = {
      execute: jest.fn().mockResolvedValue(overrides?.passwordOk ?? true),
    } as unknown as VerifyPasswordUseCase;

    const stepUpService = {
      markSessionStepUpVerified: jest.fn().mockResolvedValue(undefined),
    } as unknown as StepUpService;

    const securityAuditService = {
      logAsync: jest.fn(),
    } as unknown as SecurityAuditService;

    const sut = new VerifyAdminStepUpUseCase(
      configService,
      authIdentityRepository,
      verifyPasswordUseCase,
      stepUpService,
      securityAuditService,
    );

    return { sut, stepUpService, verifyPasswordUseCase };
  };

  it('marks session as step-up verified on success', async () => {
    const { sut, stepUpService } = makeSut();
    const result = await sut.execute({
      userId: 'u1',
      sessionId: 's1',
      password: 'pw',
      actorRoles: ['ADMIN'],
    });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect((stepUpService as any).markSessionStepUpVerified).toHaveBeenCalled();
  });

  it('rejects invalid credentials', async () => {
    const { sut } = makeSut({ passwordOk: false });
    await expect(
      sut.execute({
        userId: 'u1',
        sessionId: 's1',
        password: 'bad',
        actorRoles: ['ADMIN'],
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when password identity missing', async () => {
    const { sut } = makeSut({ hasIdentity: false });
    await expect(
      sut.execute({
        userId: 'u1',
        sessionId: 's1',
        password: 'pw',
        actorRoles: ['ADMIN'],
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
