import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  OtpChannel,
  OtpPurpose,
  PaymentProvider,
  UserRoleType,
} from '@prisma/client';
import { PaymentGatewayControlService } from './payment-gateway-control.service';
import type {
  PaymentRoutingRuntimeSnapshot,
  PaymobGatewayControlRuntimeSnapshot,
  StripeGatewayControlRuntimeSnapshot,
} from '../types/payment-gateway-control.types';

function createSnapshot(
  overrides?: Partial<PaymobGatewayControlRuntimeSnapshot>,
): PaymobGatewayControlRuntimeSnapshot {
  return {
    provider: PaymentProvider.PAYMOB,
    enabled: true,
    checkoutFlow: 'legacy' as any,
    defaultMethod: 'CARD',
    maintenanceMode: false,
    allowedCountryIsoCodes: [],
    methodRegistry: [
      {
        key: 'CARD',
        label: 'Card',
        type: 'CARD',
        enabled: true,
        priority: 100,
        supportedCheckoutFlows: ['legacy', 'intention'] as any,
        countryIsoCodes: [],
        integrationId: '5611307',
      },
    ],
    validation: {
      healthy: true,
      issues: [],
    },
    sources: {
      enabled: 'config',
      checkoutFlow: 'config',
      defaultMethod: 'config',
      maintenanceMode: 'config',
      allowedCountryIsoCodes: 'config',
      methodRegistry: 'config',
    },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createStripeSnapshot(
  overrides?: Partial<StripeGatewayControlRuntimeSnapshot>,
): StripeGatewayControlRuntimeSnapshot {
  return {
    provider: PaymentProvider.STRIPE,
    enabled: true,
    maintenanceMode: false,
    allowedCountryIsoCodes: [],
    validation: {
      healthy: true,
      issues: [],
    },
    sources: {
      enabled: 'config',
      maintenanceMode: 'config',
      allowedCountryIsoCodes: 'config',
    },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createRoutingSnapshot(
  overrides?: Partial<PaymentRoutingRuntimeSnapshot>,
): PaymentRoutingRuntimeSnapshot {
  return {
    defaultProvider: PaymentProvider.PAYMOB,
    priorityOrder: [PaymentProvider.PAYMOB, PaymentProvider.STRIPE],
    fallbackProvider: PaymentProvider.STRIPE,
    validation: {
      healthy: true,
      issues: [],
    },
    sources: {
      defaultProvider: 'config',
      priorityOrder: 'config',
      fallbackProvider: 'config',
    },
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('PaymentGatewayControlService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const runtimeService = {
    getProviderSnapshot: jest.fn((provider: PaymentProvider) =>
      provider === PaymentProvider.PAYMOB
        ? createSnapshot()
        : createStripeSnapshot(),
    ),
    getPaymobSnapshot: jest.fn(() => createSnapshot()),
    getStripeSnapshot: jest.fn(() => createStripeSnapshot()),
    getRoutingSnapshot: jest.fn(() => createRoutingSnapshot()),
    refreshPaymobSnapshot: jest.fn(),
    refreshStripeSnapshot: jest.fn(),
    refreshProviderSnapshot: jest.fn(),
    refreshRoutingSnapshot: jest.fn(),
  };
  const repository = {
    listHistory: jest.fn(),
    findHistoryEvent: jest.fn(),
    applySnapshot: jest.fn(),
  };
  const createOtpChallengeUseCase = {
    execute: jest.fn(),
  };
  const sendOtpChallengeUseCase = {
    execute: jest.fn(),
  };
  const verifyOtpChallengeUseCase = {
    execute: jest.fn(),
  };
  const passwordConfirmationService = {
    verify: jest.fn(),
  };

  const service = new PaymentGatewayControlService(
    prisma as never,
    runtimeService as never,
    repository as never,
    createOtpChallengeUseCase as never,
    sendOtpChallengeUseCase as never,
    verifyOtpChallengeUseCase as never,
    passwordConfirmationService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      roles: [{ role: UserRoleType.SUPER_ADMIN }],
      emails: [{ email: 'admin@example.com', isVerified: true }],
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({});
    repository.applySnapshot.mockResolvedValue({
      revisionNumber: 7,
      auditEventId: 'audit-1',
      configChangeLogIds: ['log-1'],
      changedKeys: ['enabled'],
    });
    repository.findHistoryEvent.mockResolvedValue({
      id: 'event-1',
      metadataJson: {
        afterSnapshot: createSnapshot({
          enabled: false,
          validation: { healthy: true, issues: [] },
          sources: {
            enabled: 'config',
            checkoutFlow: 'config',
            defaultMethod: 'config',
            maintenanceMode: 'config',
            allowedCountryIsoCodes: 'config',
            methodRegistry: 'config',
          },
        }),
      },
    });
  });

  it('blocks invalid drafts when no usable method remains', async () => {
    const result = await service.validateDraft(PaymentProvider.PAYMOB, {
      enabled: true,
      checkoutFlow: 'legacy' as any,
      defaultMethod: null,
      maintenanceMode: false,
      allowedCountryIsoCodes: [],
      methodRegistry: [],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContain(
      'No usable Paymob methods remain for the active checkout mode.',
    );
  });

  it('allows maintenance mode even when no active methods remain', async () => {
    const result = await service.validateDraft(PaymentProvider.PAYMOB, {
      enabled: true,
      checkoutFlow: 'legacy' as any,
      defaultMethod: null,
      maintenanceMode: true,
      allowedCountryIsoCodes: [],
      methodRegistry: [],
    });

    expect(result.valid).toBe(true);
  });

  it('rejects updates when step-up data is missing', async () => {
    await expect(
      service.updateProvider({
        provider: PaymentProvider.PAYMOB,
        actorUserId: 'user-1',
        requestId: 'request-1',
        reason: 'Operational rollout',
        currentPassword: '',
        stepUpChallengeId: '',
        stepUpCode: '',
        rawDraft: {
          enabled: true,
          checkoutFlow: 'legacy' as any,
          defaultMethod: 'CARD',
          maintenanceMode: false,
          allowedCountryIsoCodes: [],
          methodRegistry: createSnapshot().methodRegistry,
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects updates from non-admin users', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-2',
      roles: [{ role: UserRoleType.FINANCE_STAFF }],
      emails: [{ email: 'admin@example.com', isVerified: true }],
    });

    await expect(
      service.updateProvider({
        provider: PaymentProvider.PAYMOB,
        actorUserId: 'user-2',
        requestId: 'request-2',
        reason: 'Operational rollout',
        currentPassword: 'current-password',
        stepUpChallengeId: 'challenge-1',
        stepUpCode: '123456',
        rawDraft: {
          enabled: true,
          checkoutFlow: 'legacy' as any,
          defaultMethod: 'CARD',
          maintenanceMode: false,
          allowedCountryIsoCodes: [],
          methodRegistry: createSnapshot().methodRegistry,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rolls back to a previous snapshot after fresh password verification', async () => {
    const result = await service.rollbackProvider({
      provider: PaymentProvider.PAYMOB,
      actorUserId: 'user-1',
      requestId: 'request-3',
      reason: 'Rollback after validation issue',
      currentPassword: 'current-password',
      revisionId: 'event-1',
      stepUpChallengeId: 'challenge-1',
      stepUpCode: '123456',
    });

    expect(passwordConfirmationService.verify).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        operation: 'provider.rollback',
        targetId: PaymentProvider.PAYMOB,
      }),
    );
    expect(repository.applySnapshot).toHaveBeenCalled();
    expect(result.revisionNumber).toBe(7);
  });

  it('validates stripe drafts using the provider-specific model', async () => {
    const result = await service.validateProviderDraft(PaymentProvider.STRIPE, {
      enabled: true,
      maintenanceMode: false,
      allowedCountryIsoCodes: ['eg'],
    });

    expect(result.valid).toBe(true);
  });

  it('validates routing drafts using the bounded routing model', async () => {
    const result = await service.validateRoutingDraft({
      defaultProvider: PaymentProvider.PAYMOB,
      priorityOrder: [PaymentProvider.PAYMOB, PaymentProvider.STRIPE],
      fallbackProvider: PaymentProvider.STRIPE,
    });

    expect(result.valid).toBe(true);
  });
});
