import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentProvider, UserRoleType } from '@prisma/client';
import { PaymobCheckoutFlow } from '@modules/payments/types/paymob-payment.types';
import type {
  ConfigurationWriteResult,
  UpdateConfigurationCommand,
} from '@modules/config/types/configuration-write.types';
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
    checkoutFlow: PaymobCheckoutFlow.LEGACY,
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
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        currencyCodes: [],
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
    currencyRoutes: [],
    validation: {
      healthy: true,
      issues: [],
    },
    sources: {
      defaultProvider: 'config',
      priorityOrder: 'config',
      fallbackProvider: 'config',
      currencyRoutes: 'config',
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
  };
  const configurationManagementService = {
    getCurrentVersion: jest.fn(),
    updateManyWithTransaction: jest.fn(),
  };
  const auditEventCountMock = jest.fn().mockResolvedValue(6);
  const auditEventCreateMock = jest.fn().mockResolvedValue({ id: 'audit-1' });
  type ConfigTransaction = {
    auditEvent: {
      count: jest.Mock;
      create: jest.Mock;
    };
  };
  type UpdateManyCall = [readonly UpdateConfigurationCommand[], unknown];
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
    configurationManagementService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      roles: [{ role: UserRoleType.SUPER_ADMIN }],
      emails: [{ email: 'admin@example.com', isVerified: true }],
    });
    verifyOtpChallengeUseCase.execute.mockResolvedValue({});
    configurationManagementService.getCurrentVersion.mockResolvedValue({
      valueId: 'current-value',
      updatedAt: new Date('2026-08-02T12:00:00.000Z'),
    });
    configurationManagementService.updateManyWithTransaction.mockImplementation(
      (
        commands: readonly UpdateConfigurationCommand[],
        operation: (
          tx: ConfigTransaction,
          results: readonly ConfigurationWriteResult[],
        ) => unknown,
      ) =>
        operation(
          {
            auditEvent: {
              count: auditEventCountMock,
              create: auditEventCreateMock,
            },
          },
          commands.map((_, index) => ({
            key: commands[index].key,
            scopeType: commands[index].scopeType,
            scopeRefId: commands[index].scopeRefId,
            value: commands[index].value,
            valueId: `value-${index + 1}`,
            previousValueId: null,
            updatedAt: new Date('2026-08-02T12:00:00.000Z'),
            changeLogId: `log-${index + 1}`,
          })),
        ),
    );
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

  it('blocks invalid drafts when no usable method remains', () => {
    const result = service.validateDraft(PaymentProvider.PAYMOB, {
      enabled: true,
      checkoutFlow: PaymobCheckoutFlow.LEGACY,
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

  it('allows maintenance mode even when no active methods remain', () => {
    const result = service.validateDraft(PaymentProvider.PAYMOB, {
      enabled: true,
      checkoutFlow: PaymobCheckoutFlow.LEGACY,
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
          checkoutFlow: PaymobCheckoutFlow.LEGACY,
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
          checkoutFlow: PaymobCheckoutFlow.LEGACY,
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
    expect(
      configurationManagementService.updateManyWithTransaction,
    ).toHaveBeenCalledTimes(1);
    expect(result.revisionNumber).toBe(7);
  });

  it('maps Paymob changes to canonical config commands and one payment audit event', async () => {
    await service.updateProvider({
      provider: PaymentProvider.PAYMOB,
      actorUserId: 'user-1',
      requestId: 'request-4',
      reason: 'Disable Paymob for maintenance',
      currentPassword: 'current-password',
      stepUpChallengeId: 'challenge-1',
      stepUpCode: '123456',
      rawDraft: {
        enabled: false,
        checkoutFlow: PaymobCheckoutFlow.LEGACY,
        defaultMethod: 'CARD',
        maintenanceMode: false,
        allowedCountryIsoCodes: [],
        methodRegistry: createSnapshot().methodRegistry,
      },
    });

    const [commands, operation] = configurationManagementService
      .updateManyWithTransaction.mock.calls[0] as UpdateManyCall;
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatchObject({
      key: 'payment.provider.paymob.enabled',
      value: false,
      scopeType: 'GLOBAL',
      scopeRefId: null,
      reason: 'Disable Paymob for maintenance',
      actor: {
        type: 'USER',
        id: 'user-1',
        permissions: ['configuration.edit.financial'],
      },
      actorType: 'USER',
    });
    expect(typeof operation).toBe('function');
    expect(auditEventCreateMock).toHaveBeenCalledTimes(1);
  });

  it('maps multi-key routing changes into one canonical atomic batch', async () => {
    await service.updateRouting({
      actorUserId: 'user-1',
      requestId: 'request-5',
      reason: 'Reorder payment routing',
      currentPassword: 'current-password',
      stepUpChallengeId: 'challenge-1',
      stepUpCode: '123456',
      rawDraft: {
        defaultProvider: PaymentProvider.STRIPE,
        priorityOrder: [PaymentProvider.STRIPE, PaymentProvider.PAYMOB],
        fallbackProvider: PaymentProvider.PAYMOB,
        currencyRoutes: [],
      },
    });

    const [commands] = configurationManagementService.updateManyWithTransaction
      .mock.calls[0] as UpdateManyCall;
    expect(
      commands.map((command: UpdateConfigurationCommand) => command.key),
    ).toEqual([
      'payment.routing.defaultProvider',
      'payment.routing.priorityOrder',
      'payment.routing.fallbackProvider',
    ]);
    expect(
      commands.every(
        (command: UpdateConfigurationCommand) => command.scopeType === 'GLOBAL',
      ),
    ).toBe(true);
    expect(
      commands.every(
        (command: UpdateConfigurationCommand) => command.scopeRefId === null,
      ),
    ).toBe(true);
  });

  it('validates stripe drafts using the provider-specific model', () => {
    const result = service.validateProviderDraft(PaymentProvider.STRIPE, {
      enabled: true,
      maintenanceMode: false,
      allowedCountryIsoCodes: ['eg'],
    });

    expect(result.valid).toBe(true);
  });

  it('validates routing drafts using the bounded routing model', () => {
    const result = service.validateRoutingDraft({
      defaultProvider: PaymentProvider.PAYMOB,
      priorityOrder: [PaymentProvider.PAYMOB, PaymentProvider.STRIPE],
      fallbackProvider: PaymentProvider.STRIPE,
    });

    expect(result.valid).toBe(true);
  });
});
