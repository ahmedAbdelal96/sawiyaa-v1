import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { STEP_UP_POLICY_KEY } from '@common/decorators/step-up.decorator';
import { SecurityAuditService } from '@common/security-audit/security-audit.service';
import { StepUpGuard } from './step-up.guard';
import { StepUpService } from '@modules/auth/services/step-up.service';

function createHttpContext(request: any): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('StepUpGuard', () => {
  const buildGuard = (overrides?: {
    action?: string | undefined;
    enabled?: boolean;
    status?: any;
  }) => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockImplementation((key: string) =>
          key === STEP_UP_POLICY_KEY ? overrides?.action : undefined,
        ),
    } as unknown as Reflector;

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'stepUp') return { enabled: overrides?.enabled ?? true };
        return undefined;
      }),
    } as unknown as ConfigService;

    const stepUpService = {
      checkSessionStepUpStatus: jest
        .fn()
        .mockResolvedValue(
          overrides?.status ?? { ok: true, expiresAt: new Date() },
        ),
    } as unknown as StepUpService;

    const securityAuditService = {
      logAsync: jest.fn(),
    } as unknown as SecurityAuditService;

    return {
      guard: new StepUpGuard(
        reflector,
        configService,
        stepUpService,
        securityAuditService,
      ),
      stepUpService,
    };
  };

  it('is a no-op when route has no step-up metadata', async () => {
    const { guard } = buildGuard({ action: undefined });
    const request = {};
    await expect(guard.canActivate(createHttpContext(request))).resolves.toBe(
      true,
    );
  });

  it('is a no-op when step-up is disabled', async () => {
    const { guard } = buildGuard({
      action: 'finance.refund.approve',
      enabled: false,
    });
    const request = {
      user: { id: 'u1', roles: [], authMethod: 'access', sessionId: 's1' },
    };
    await expect(guard.canActivate(createHttpContext(request))).resolves.toBe(
      true,
    );
  });

  it('denies when step-up is required and not satisfied', async () => {
    const { guard, stepUpService } = buildGuard({
      action: 'finance.refund.approve',
      enabled: true,
      status: { ok: false, reason: 'NOT_VERIFIED' },
    });

    const request = {
      user: {
        id: 'u1',
        roles: ['ADMIN'],
        authMethod: 'access',
        sessionId: 's1',
      },
      headers: {},
    };

    await expect(
      guard.canActivate(createHttpContext(request)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(
      (stepUpService as any).checkSessionStepUpStatus,
    ).toHaveBeenCalledWith({
      userId: 'u1',
      sessionId: 's1',
    });
  });
});
