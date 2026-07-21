import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OtpChannel,
  OtpPurpose,
  PaymentProvider,
  Prisma,
  UserRoleType,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import { SupportedLocale } from '@common/i18n/types/locale.types';
import { CreateOtpChallengeUseCase } from '@modules/verification/use-cases/create-otp-challenge.use-case';
import { SendOtpChallengeUseCase } from '@modules/verification/use-cases/send-otp-challenge.use-case';
import { VerifyOtpChallengeUseCase } from '@modules/verification/use-cases/verify-otp-challenge.use-case';
import {
  PAYMENT_GATEWAY_CONTROL_MANAGED_PROVIDERS,
  PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
  PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE,
} from '../payment-gateway-control.constants';
import { PaymentGatewayControlRepository } from '../repositories/payment-gateway-control.repository';
import {
  PaymentGatewayControlHistoryItem,
  PaymentGatewayControlManagedProvider,
  PaymentGatewayControlProvider,
  PaymentGatewayControlRuntimeSnapshot,
  PaymentRoutingDraft,
  PaymentRoutingRuntimeSnapshot,
  PaymentRoutingValidationResult,
  PaymobGatewayControlMethodEntry,
  PaymobGatewayControlRuntimeSnapshot,
  PaymobGatewayControlValidationResult,
  StripeGatewayControlRuntimeSnapshot,
  StripeGatewayControlValidationResult,
} from '../types/payment-gateway-control.types';
import {
  PaymentRoutingDraftInput,
  PaymentRoutingDraftNormalized,
  PaymobGatewayControlDraftInput,
  PaymobGatewayControlDraftNormalized,
  StripeGatewayControlDraftInput,
  StripeGatewayControlDraftNormalized,
  paymobGatewayControlDraftSchema,
  paymentRoutingDraftSchema,
  stripeGatewayControlDraftSchema,
} from '../schemas/paymob-gateway-control.schema';
import { PaymentGatewayControlRuntimeService } from './payment-gateway-control.runtime';
import { PaymentGatewayPasswordConfirmationService } from './payment-gateway-password-confirmation.service';

@Injectable()
export class PaymentGatewayControlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentGatewayControlRuntimeService: PaymentGatewayControlRuntimeService,
    private readonly paymentGatewayControlRepository: PaymentGatewayControlRepository,
    private readonly createOtpChallengeUseCase: CreateOtpChallengeUseCase,
    private readonly sendOtpChallengeUseCase: SendOtpChallengeUseCase,
    private readonly verifyOtpChallengeUseCase: VerifyOtpChallengeUseCase,
    private readonly passwordConfirmationService: PaymentGatewayPasswordConfirmationService,
  ) {}

  async listProviders(): Promise<{
    items: PaymentGatewayControlRuntimeSnapshot[];
  }> {
    return {
      items: [
        this.paymentGatewayControlRuntimeService.getPaymobSnapshot(),
        this.paymentGatewayControlRuntimeService.getStripeSnapshot(),
      ],
    };
  }

  async getProvider(
    provider: PaymentGatewayControlProvider,
  ): Promise<{ item: PaymentGatewayControlRuntimeSnapshot }> {
    this.assertSupportedProvider(provider);
    const managedProvider = provider as PaymentGatewayControlManagedProvider;

    return {
      item: this.paymentGatewayControlRuntimeService.getProviderSnapshot(
        managedProvider,
      ),
    };
  }

  async getRouting(): Promise<{ item: PaymentRoutingRuntimeSnapshot }> {
    return {
      item: this.paymentGatewayControlRuntimeService.getRoutingSnapshot(),
    };
  }

  async getRoutingCapabilities() {
    return {
      items: this.paymentGatewayControlRuntimeService.getPaymentRouteCatalog(),
    };
  }

  async getHistory(
    provider: PaymentGatewayControlProvider,
  ): Promise<{ items: PaymentGatewayControlHistoryItem[] }> {
    this.assertSupportedProvider(provider);
    const managedProvider = provider as PaymentGatewayControlManagedProvider;

    const history = await this.paymentGatewayControlRepository.listHistory({
      scope: 'provider',
      provider: managedProvider,
    });

    return {
      items: history.map((entry) => this.mapAuditEventToHistoryItem(entry)),
    };
  }

  async getRoutingHistory(): Promise<{
    items: PaymentGatewayControlHistoryItem[];
  }> {
    const history = await this.paymentGatewayControlRepository.listHistory({
      scope: 'routing',
      provider: null,
    });

    return {
      items: history.map((entry) => this.mapAuditEventToHistoryItem(entry)),
    };
  }

  async validateProviderDraft(
    provider: PaymentGatewayControlProvider,
    rawDraft: PaymobGatewayControlDraftInput | StripeGatewayControlDraftInput,
  ): Promise<
    PaymobGatewayControlValidationResult | StripeGatewayControlValidationResult
  > {
    this.assertSupportedProvider(provider);

    if (provider === PaymentProvider.PAYMOB) {
      const normalized = this.normalizePaymobDraft(
        rawDraft as PaymobGatewayControlDraftInput,
      );
      return this.validatePaymobAgainstCurrent(
        this.paymentGatewayControlRuntimeService.getPaymobSnapshot(),
        normalized,
      );
    }

    const normalized = this.normalizeStripeDraft(
      rawDraft as StripeGatewayControlDraftInput,
    );
    return this.validateStripeAgainstCurrent(
      this.paymentGatewayControlRuntimeService.getStripeSnapshot(),
      normalized,
    );
  }

  async validateDraft(
    provider: PaymentGatewayControlProvider,
    rawDraft: PaymobGatewayControlDraftInput | StripeGatewayControlDraftInput,
  ): Promise<
    PaymobGatewayControlValidationResult | StripeGatewayControlValidationResult
  > {
    return this.validateProviderDraft(provider, rawDraft);
  }

  async validateRoutingDraft(
    rawDraft: PaymentRoutingDraftInput,
  ): Promise<PaymentRoutingValidationResult> {
    const normalized = this.normalizeRoutingDraft(rawDraft);
    return this.validateRoutingAgainstCurrent(
      this.paymentGatewayControlRuntimeService.getRoutingSnapshot(),
      normalized,
    );
  }

  async requestProviderStepUp(input: {
    provider: PaymentGatewayControlProvider;
    actorUserId: string;
    locale: SupportedLocale;
  }) {
    this.assertSupportedProvider(input.provider);
    return this.requestStepUpChallenge({
      actorUserId: input.actorUserId,
      locale: input.locale,
      scope: 'provider',
      provider: input.provider as PaymentGatewayControlManagedProvider,
    });
  }

  async requestRoutingStepUp(input: {
    actorUserId: string;
    locale: SupportedLocale;
  }) {
    return this.requestStepUpChallenge({
      actorUserId: input.actorUserId,
      locale: input.locale,
      scope: 'routing',
      provider: null,
    });
  }

  async updateProvider(input: {
    provider: PaymentGatewayControlProvider;
    actorUserId: string;
    requestId: string;
    reason: string;
    currentPassword: string;
    stepUpChallengeId: string;
    stepUpCode: string;
    rawDraft: PaymobGatewayControlDraftInput | StripeGatewayControlDraftInput;
  }) {
    this.assertSupportedProvider(input.provider);
    const actorRoles = await this.assertGatewayAdministrator(input.actorUserId);
    this.assertReason(input.reason);
    const provider = input.provider as PaymentGatewayControlManagedProvider;

    if (input.provider === PaymentProvider.PAYMOB) {
      const normalized = this.normalizePaymobDraft(
        input.rawDraft as PaymobGatewayControlDraftInput,
      );
      const current =
        this.paymentGatewayControlRuntimeService.getPaymobSnapshot();
      const validation = this.validatePaymobAgainstCurrent(current, normalized);

      if (!validation.valid) {
        throw new BadRequestException({
          messageKey: 'payments.errors.invalidPaymentGatewayControl',
          error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
          details: { issues: validation.issues },
        });
      }

      await this.verifyCurrentPassword({
        actorUserId: input.actorUserId,
        actorRoles,
        currentPassword: input.currentPassword,
        operation: 'provider.update',
        targetId: provider,
        requestId: input.requestId,
      });

      const nextSnapshot = this.toPaymobRuntimeSnapshot(normalized, current);
      const result = await this.paymentGatewayControlRepository.applySnapshot({
        scope: 'provider',
        provider,
        actorUserId: input.actorUserId,
        requestId: input.requestId,
        reason: input.reason,
        action: 'UPDATED',
        beforeSnapshot: current,
        afterSnapshot: nextSnapshot,
      });

      await this.paymentGatewayControlRuntimeService.refreshProviderSnapshot(
        provider,
      );

      return {
        item: this.paymentGatewayControlRuntimeService.getPaymobSnapshot(),
        revisionNumber: result.revisionNumber,
        auditEventId: result.auditEventId,
        changedKeys: result.changedKeys,
      };
    }

    const normalized = this.normalizeStripeDraft(
      input.rawDraft as StripeGatewayControlDraftInput,
    );
    const current =
      this.paymentGatewayControlRuntimeService.getStripeSnapshot();
    const validation = this.validateStripeAgainstCurrent(current, normalized);

    if (!validation.valid) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidPaymentGatewayControl',
        error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
        details: { issues: validation.issues },
      });
    }

    await this.verifyCurrentPassword({
      actorUserId: input.actorUserId,
      actorRoles,
      currentPassword: input.currentPassword,
      operation: 'provider.update',
      targetId: provider,
      requestId: input.requestId,
    });

    const nextSnapshot = this.toStripeRuntimeSnapshot(normalized, current);
    const result = await this.paymentGatewayControlRepository.applySnapshot({
      scope: 'provider',
      provider,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reason: input.reason,
      action: 'UPDATED',
      beforeSnapshot: current,
      afterSnapshot: nextSnapshot,
    });

    await this.paymentGatewayControlRuntimeService.refreshProviderSnapshot(
      provider,
    );

    return {
      item: this.paymentGatewayControlRuntimeService.getStripeSnapshot(),
      revisionNumber: result.revisionNumber,
      auditEventId: result.auditEventId,
      changedKeys: result.changedKeys,
    };
  }

  async updateRouting(input: {
    actorUserId: string;
    requestId: string;
    reason: string;
    currentPassword: string;
    stepUpChallengeId: string;
    stepUpCode: string;
    rawDraft: PaymentRoutingDraftInput;
  }) {
    const actorRoles = await this.assertGatewayAdministrator(input.actorUserId);
    this.assertReason(input.reason);

    const normalized = this.normalizeRoutingDraft(input.rawDraft);
    const current =
      this.paymentGatewayControlRuntimeService.getRoutingSnapshot();
    const validation = this.validateRoutingAgainstCurrent(current, normalized);

    if (!validation.valid) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidPaymentGatewayControl',
        error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
        details: { issues: validation.issues },
      });
    }

    await this.verifyCurrentPassword({
      actorUserId: input.actorUserId,
      actorRoles,
      currentPassword: input.currentPassword,
      operation: 'routing.update',
      targetId: 'routing',
      requestId: input.requestId,
    });

    const nextSnapshot = this.toRoutingRuntimeSnapshot(normalized, current);
    const result = await this.paymentGatewayControlRepository.applySnapshot({
      scope: 'routing',
      provider: null,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reason: input.reason,
      action: 'UPDATED',
      beforeSnapshot: current,
      afterSnapshot: nextSnapshot,
    });

    await this.paymentGatewayControlRuntimeService.refreshRoutingSnapshot();

    return {
      item: this.paymentGatewayControlRuntimeService.getRoutingSnapshot(),
      revisionNumber: result.revisionNumber,
      auditEventId: result.auditEventId,
      changedKeys: result.changedKeys,
    };
  }

  async rollbackProvider(input: {
    provider: PaymentGatewayControlProvider;
    actorUserId: string;
    requestId: string;
    reason: string;
    currentPassword: string;
    revisionId: string;
    stepUpChallengeId: string;
    stepUpCode: string;
  }) {
    this.assertSupportedProvider(input.provider);
    const actorRoles = await this.assertGatewayAdministrator(input.actorUserId);
    this.assertReason(input.reason);
    const provider = input.provider as PaymentGatewayControlManagedProvider;

    const revision =
      await this.paymentGatewayControlRepository.findHistoryEvent({
        scope: 'provider',
        provider: input.provider,
        eventId: input.revisionId,
      });

    if (!revision) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentGatewayControlRevisionNotFound',
        error: 'PAYMENT_GATEWAY_CONTROL_REVISION_NOT_FOUND',
      });
    }

    const metadata = (revision.metadataJson ?? {}) as Record<string, unknown>;
    const snapshot = metadata.afterSnapshot as
      | PaymentGatewayControlRuntimeSnapshot
      | undefined;

    if (!snapshot) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentGatewayControlRevisionInvalid',
        error: 'PAYMENT_GATEWAY_CONTROL_REVISION_INVALID',
      });
    }

    if (input.provider === PaymentProvider.PAYMOB) {
      const validation = this.validatePaymobAgainstCurrent(
        this.paymentGatewayControlRuntimeService.getPaymobSnapshot(),
        this.normalizePaymobDraft(
          snapshot as PaymobGatewayControlRuntimeSnapshot,
        ),
      );

      if (!validation.valid) {
        throw new BadRequestException({
          messageKey: 'payments.errors.invalidPaymentGatewayControl',
          error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
          details: { issues: validation.issues },
        });
      }
    } else {
      const validation = this.validateStripeAgainstCurrent(
        this.paymentGatewayControlRuntimeService.getStripeSnapshot(),
        this.normalizeStripeDraft(
          snapshot as StripeGatewayControlRuntimeSnapshot,
        ),
      );

      if (!validation.valid) {
        throw new BadRequestException({
          messageKey: 'payments.errors.invalidPaymentGatewayControl',
          error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
          details: { issues: validation.issues },
        });
      }
    }

    await this.verifyCurrentPassword({
      actorUserId: input.actorUserId,
      actorRoles,
      currentPassword: input.currentPassword,
      operation: 'provider.rollback',
      targetId: provider,
      requestId: input.requestId,
    });

    const current =
      this.paymentGatewayControlRuntimeService.getProviderSnapshot(provider);
    const result = await this.paymentGatewayControlRepository.applySnapshot({
      scope: 'provider',
      provider,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reason: input.reason,
      action: 'ROLLBACK',
      beforeSnapshot: current,
      afterSnapshot: snapshot,
      rollbackSourceEventId: input.revisionId,
    });

    await this.paymentGatewayControlRuntimeService.refreshProviderSnapshot(
      provider,
    );

    return {
      item: this.paymentGatewayControlRuntimeService.getProviderSnapshot(
        provider,
      ),
      revisionNumber: result.revisionNumber,
      auditEventId: result.auditEventId,
      changedKeys: result.changedKeys,
    };
  }

  async rollbackRouting(input: {
    actorUserId: string;
    requestId: string;
    reason: string;
    currentPassword: string;
    revisionId: string;
    stepUpChallengeId: string;
    stepUpCode: string;
  }) {
    const actorRoles = await this.assertGatewayAdministrator(input.actorUserId);
    this.assertReason(input.reason);

    const revision =
      await this.paymentGatewayControlRepository.findHistoryEvent({
        scope: 'routing',
        provider: null,
        eventId: input.revisionId,
      });

    if (!revision) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentGatewayControlRevisionNotFound',
        error: 'PAYMENT_GATEWAY_CONTROL_REVISION_NOT_FOUND',
      });
    }

    const metadata = (revision.metadataJson ?? {}) as Record<string, unknown>;
    const snapshot = metadata.afterSnapshot as
      | PaymentRoutingRuntimeSnapshot
      | undefined;

    if (!snapshot) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentGatewayControlRevisionInvalid',
        error: 'PAYMENT_GATEWAY_CONTROL_REVISION_INVALID',
      });
    }

    const validation = this.validateRoutingAgainstCurrent(
      this.paymentGatewayControlRuntimeService.getRoutingSnapshot(),
      this.normalizeRoutingDraft(snapshot),
    );

    if (!validation.valid) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidPaymentGatewayControl',
        error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
        details: { issues: validation.issues },
      });
    }

    await this.verifyCurrentPassword({
      actorUserId: input.actorUserId,
      actorRoles,
      currentPassword: input.currentPassword,
      operation: 'routing.rollback',
      targetId: 'routing',
      requestId: input.requestId,
    });

    const current =
      this.paymentGatewayControlRuntimeService.getRoutingSnapshot();
    const result = await this.paymentGatewayControlRepository.applySnapshot({
      scope: 'routing',
      provider: null,
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      reason: input.reason,
      action: 'ROLLBACK',
      beforeSnapshot: current,
      afterSnapshot: snapshot,
      rollbackSourceEventId: input.revisionId,
    });

    await this.paymentGatewayControlRuntimeService.refreshRoutingSnapshot();

    return {
      item: this.paymentGatewayControlRuntimeService.getRoutingSnapshot(),
      revisionNumber: result.revisionNumber,
      auditEventId: result.auditEventId,
      changedKeys: result.changedKeys,
    };
  }

  private normalizePaymobDraft(
    input: PaymobGatewayControlDraftInput | PaymobGatewayControlRuntimeSnapshot,
  ): PaymobGatewayControlDraftNormalized {
    const parsed = paymobGatewayControlDraftSchema.safeParse(input);
    if (parsed.success) {
      return parsed.data;
    }

    const fromSnapshot =
      'validation' in input
        ? {
            enabled: input.enabled,
            checkoutFlow: input.checkoutFlow,
            defaultMethod: input.defaultMethod,
            maintenanceMode: input.maintenanceMode,
            allowedCountryIsoCodes: input.allowedCountryIsoCodes,
            methodRegistry: input.methodRegistry,
          }
        : input;

    const parsedSnapshot =
      paymobGatewayControlDraftSchema.safeParse(fromSnapshot);
    if (!parsedSnapshot.success) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidPaymentGatewayControl',
        error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
        details: {
          issues: parsedSnapshot.error.issues.map((issue) => issue.message),
        },
      });
    }

    return parsedSnapshot.data;
  }

  private normalizeStripeDraft(
    input: StripeGatewayControlDraftInput | StripeGatewayControlRuntimeSnapshot,
  ): StripeGatewayControlDraftNormalized {
    const parsed = stripeGatewayControlDraftSchema.safeParse(input);
    if (parsed.success) {
      return parsed.data;
    }

    const fromSnapshot =
      'validation' in input
        ? {
            enabled: input.enabled,
            maintenanceMode: input.maintenanceMode,
            allowedCountryIsoCodes: input.allowedCountryIsoCodes,
          }
        : input;

    const parsedSnapshot =
      stripeGatewayControlDraftSchema.safeParse(fromSnapshot);
    if (!parsedSnapshot.success) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidPaymentGatewayControl',
        error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
        details: {
          issues: parsedSnapshot.error.issues.map((issue) => issue.message),
        },
      });
    }

    return parsedSnapshot.data;
  }

  private normalizeRoutingDraft(
    input: PaymentRoutingDraftInput | PaymentRoutingRuntimeSnapshot,
  ): PaymentRoutingDraftNormalized {
    const parsed = paymentRoutingDraftSchema.safeParse(input);
    if (parsed.success) {
      return parsed.data;
    }

    const fromSnapshot =
      'validation' in input
        ? {
            defaultProvider: input.defaultProvider,
            priorityOrder: input.priorityOrder,
            fallbackProvider: input.fallbackProvider,
            currencyRoutes: input.currencyRoutes,
          }
        : input;

    const parsedSnapshot = paymentRoutingDraftSchema.safeParse(fromSnapshot);
    if (!parsedSnapshot.success) {
      throw new BadRequestException({
        messageKey: 'payments.errors.invalidPaymentGatewayControl',
        error: 'PAYMENT_GATEWAY_CONTROL_INVALID',
        details: {
          issues: parsedSnapshot.error.issues.map((issue) => issue.message),
        },
      });
    }

    return parsedSnapshot.data;
  }

  private toPaymobRuntimeSnapshot(
    draft: PaymobGatewayControlDraftNormalized,
    sourceSnapshot: PaymobGatewayControlRuntimeSnapshot,
  ): PaymobGatewayControlRuntimeSnapshot {
    const validation = this.validatePaymobAgainstCurrent(sourceSnapshot, draft);

    return {
      provider: PaymentProvider.PAYMOB,
      enabled: draft.enabled,
      checkoutFlow: draft.checkoutFlow,
      defaultMethod: draft.defaultMethod,
      maintenanceMode: draft.maintenanceMode,
      allowedCountryIsoCodes: draft.allowedCountryIsoCodes,
      methodRegistry: draft.methodRegistry,
      validation: {
        healthy: validation.valid,
        issues: validation.issues,
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
    };
  }

  private toStripeRuntimeSnapshot(
    draft: StripeGatewayControlDraftNormalized,
    sourceSnapshot: StripeGatewayControlRuntimeSnapshot,
  ): StripeGatewayControlRuntimeSnapshot {
    const validation = this.validateStripeAgainstCurrent(sourceSnapshot, draft);

    return {
      provider: PaymentProvider.STRIPE,
      enabled: draft.enabled,
      maintenanceMode: draft.maintenanceMode,
      allowedCountryIsoCodes: draft.allowedCountryIsoCodes,
      validation: {
        healthy: validation.valid,
        issues: validation.issues,
      },
      sources: {
        enabled: 'config',
        maintenanceMode: 'config',
        allowedCountryIsoCodes: 'config',
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private toRoutingRuntimeSnapshot(
    draft: PaymentRoutingDraftNormalized,
    sourceSnapshot: PaymentRoutingRuntimeSnapshot,
  ): PaymentRoutingRuntimeSnapshot {
    const validation = this.validateRoutingAgainstCurrent(
      sourceSnapshot,
      draft,
    );
    const routeCatalog =
      this.paymentGatewayControlRuntimeService.getRoutingSnapshot().routeCatalog;
    const currencyRoutes = draft.currencyRoutes.map((route) => ({
      ...route,
      source: 'DATABASE' as const,
    }));

    return {
      defaultProvider: draft.defaultProvider,
      priorityOrder: draft.priorityOrder,
      fallbackProvider: draft.fallbackProvider,
      currencyRoutes,
      routeCatalog,
      routeReadiness: currencyRoutes.map((route) => {
        const entry = routeCatalog.find(
          (candidate) =>
            candidate.provider === route.provider &&
            candidate.integrationKey === route.integrationKey &&
            candidate.currencyCodes.includes(route.currencyCode) &&
            candidate.paymentMethods.includes(route.paymentMethod),
        );
        return {
          route,
          ready: Boolean(entry?.ready),
          issues: entry?.issues ?? ['PAYMENT_ROUTE_INTEGRATION_ALIAS_UNKNOWN'],
        };
      }),
      validation: {
        healthy: validation.valid,
        issues: validation.issues,
      },
      sources: {
        defaultProvider: 'config',
        priorityOrder: 'config',
        fallbackProvider: 'config',
        currencyRoutes: 'config',
      },
      updatedAt: new Date().toISOString(),
    };
  }

  private validatePaymobAgainstCurrent(
    current: PaymobGatewayControlRuntimeSnapshot,
    next: PaymobGatewayControlDraftNormalized,
  ): PaymobGatewayControlValidationResult {
    const issues: string[] = [...current.validation.issues];
    const warnings: string[] = [];
    const activeMethods = this.resolveActivePaymobMethods(next);

    if (next.enabled && !next.maintenanceMode && activeMethods.length === 0) {
      issues.push(
        'No usable Paymob methods remain for the active checkout mode.',
      );
    }

    if (
      next.defaultMethod &&
      !activeMethods.some(
        (item) => item.key.toUpperCase() === next.defaultMethod?.toUpperCase(),
      )
    ) {
      issues.push(
        'Configured default Paymob method is not usable for the active snapshot.',
      );
    }

    for (const method of next.methodRegistry) {
      if (method.enabled && !method.integrationId) {
        issues.push(
          `Method ${method.key} is enabled but has no integration reference.`,
        );
      }
      if (
        method.enabled &&
        !method.supportedCheckoutFlows.includes(next.checkoutFlow)
      ) {
        issues.push(
          `Method ${method.key} is not compatible with checkout flow ${next.checkoutFlow}.`,
        );
      }
    }

    if (current.enabled !== next.enabled) {
      warnings.push(
        next.enabled
          ? 'Provider will be enabled after save.'
          : 'Provider will be disabled after save.',
      );
    }

    if (current.checkoutFlow !== next.checkoutFlow) {
      warnings.push(
        `Checkout flow will change from ${current.checkoutFlow} to ${next.checkoutFlow}.`,
      );
    }

    if (
      JSON.stringify(current.methodRegistry) !==
      JSON.stringify(next.methodRegistry)
    ) {
      warnings.push(
        'Method registry will be replaced with the submitted snapshot.',
      );
    }

    if (current.maintenanceMode !== next.maintenanceMode) {
      warnings.push(
        next.maintenanceMode
          ? 'Maintenance mode will be enabled.'
          : 'Maintenance mode will be disabled.',
      );
    }

    if (!current.validation.healthy) {
      warnings.push(
        'Current Paymob runtime configuration has validation issues and should be corrected before activation.',
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      normalized: next,
      activeMethods,
    };
  }

  private validateStripeAgainstCurrent(
    current: StripeGatewayControlRuntimeSnapshot,
    next: StripeGatewayControlDraftNormalized,
  ): StripeGatewayControlValidationResult {
    const issues: string[] = [...current.validation.issues];
    const warnings: string[] = [];

    if (current.enabled !== next.enabled) {
      warnings.push(
        next.enabled
          ? 'Stripe will be enabled after save.'
          : 'Stripe will be disabled after save.',
      );
    }

    if (current.maintenanceMode !== next.maintenanceMode) {
      warnings.push(
        next.maintenanceMode
          ? 'Stripe maintenance mode will be enabled.'
          : 'Stripe maintenance mode will be disabled.',
      );
    }

    if (
      JSON.stringify(current.allowedCountryIsoCodes) !==
      JSON.stringify(next.allowedCountryIsoCodes)
    ) {
      warnings.push(
        'Stripe country restrictions will be replaced with the submitted snapshot.',
      );
    }

    if (!current.validation.healthy) {
      warnings.push(
        'Current Stripe runtime configuration has validation issues and should be corrected before activation.',
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      normalized: next,
    };
  }

  private validateRoutingAgainstCurrent(
    current: PaymentRoutingRuntimeSnapshot,
    next: PaymentRoutingDraftNormalized,
  ): PaymentRoutingValidationResult {
    const issues: string[] = [...current.validation.issues];
    const warnings: string[] = [];
    const providerSnapshots = [
      this.paymentGatewayControlRuntimeService.getPaymobSnapshot(),
      this.paymentGatewayControlRuntimeService.getStripeSnapshot(),
    ];
    const usableProviders = providerSnapshots.filter(
      (item) =>
        item.enabled && !item.maintenanceMode && item.validation.healthy,
    );
    const runtimeWithCatalog = this.paymentGatewayControlRuntimeService as
      | (PaymentGatewayControlRuntimeService & {
          getPaymentRouteCatalog?: () => ReturnType<
            PaymentGatewayControlRuntimeService['getPaymentRouteCatalog']
          >;
        })
      | undefined;
    const routeCatalog = runtimeWithCatalog?.getPaymentRouteCatalog
      ? runtimeWithCatalog.getPaymentRouteCatalog()
      : (current.currencyRoutes ?? []).map((route) => ({
          provider: route.provider,
          integrationKey: route.integrationKey,
          currencyCodes: [route.currencyCode],
          paymentMethods: [route.paymentMethod],
          ready: true,
          issues: [],
        }));
    const activeRouteKeys = new Set<string>();
    for (const route of next.currencyRoutes) {
      const catalogEntry = routeCatalog.find(
        (entry) =>
          entry.provider === route.provider &&
          entry.integrationKey === route.integrationKey &&
          entry.currencyCodes.includes(route.currencyCode) &&
          entry.paymentMethods.includes(route.paymentMethod),
      );
      if (!catalogEntry) {
        issues.push(
          `Unknown or incompatible payment route alias ${route.integrationKey} for ${route.provider}.`,
        );
      } else if (route.enabled && !catalogEntry.ready) {
        issues.push(
          `Enabled payment route ${route.currencyCode}/${route.paymentMethod} is not ready: ${catalogEntry.issues.join(', ')}.`,
        );
      }

      if (route.enabled) {
        const key = `${route.currencyCode}:${route.paymentMethod}:${route.environment}:${route.priority}`;
        if (activeRouteKeys.has(key)) {
          issues.push(`Ambiguous enabled payment route for ${key}.`);
        }
        activeRouteKeys.add(key);
      }
    }

    if (next.priorityOrder.length === 0 && usableProviders.length > 0) {
      issues.push(
        'Priority order must contain at least one provider when runtime providers are available.',
      );
    }

    if (
      next.defaultProvider &&
      !next.priorityOrder.includes(next.defaultProvider)
    ) {
      issues.push('Default provider must appear in the priority order.');
    }

    if (
      next.fallbackProvider &&
      !next.priorityOrder.includes(next.fallbackProvider)
    ) {
      issues.push('Fallback provider must appear in the priority order.');
    }

    if (
      next.defaultProvider &&
      !usableProviders.some((item) => item.provider === next.defaultProvider)
    ) {
      issues.push('Configured default provider is not currently usable.');
    }

    if (
      next.fallbackProvider &&
      !usableProviders.some((item) => item.provider === next.fallbackProvider)
    ) {
      issues.push('Configured fallback provider is not currently usable.');
    }

    const hasUsableProvider = next.priorityOrder.some((provider) =>
      usableProviders.some((item) => item.provider === provider),
    );

    if (!hasUsableProvider && usableProviders.length > 0) {
      issues.push('No usable provider remains in the current routing order.');
    }

    if (current.defaultProvider !== next.defaultProvider) {
      warnings.push(
        `Default provider will change from ${current.defaultProvider ?? 'none'} to ${next.defaultProvider ?? 'none'}.`,
      );
    }

    if (current.fallbackProvider !== next.fallbackProvider) {
      warnings.push(
        `Fallback provider will change from ${current.fallbackProvider ?? 'none'} to ${next.fallbackProvider ?? 'none'}.`,
      );
    }

    if (
      JSON.stringify(current.priorityOrder) !==
      JSON.stringify(next.priorityOrder)
    ) {
      warnings.push(
        'Provider priority order will be replaced with the submitted snapshot.',
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      normalized: next,
    };
  }

  private resolveActivePaymobMethods(
    snapshot: PaymobGatewayControlDraftNormalized,
  ): PaymobGatewayControlMethodEntry[] {
    const allowedCountries = snapshot.allowedCountryIsoCodes.map((value) =>
      value.toUpperCase(),
    );

    return [...snapshot.methodRegistry]
      .filter(
        (method) => method.enabled && Boolean(method.integrationId?.trim()),
      )
      .filter((method) =>
        method.supportedCheckoutFlows.includes(snapshot.checkoutFlow),
      )
      .filter((method) => {
        if (allowedCountries.length === 0) {
          return true;
        }

        if (method.countryIsoCodes.length === 0) {
          return true;
        }

        return method.countryIsoCodes.some((countryCode) =>
          allowedCountries.includes(countryCode.toUpperCase()),
        );
      })
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        return left.label.localeCompare(right.label);
      });
  }

  private async assertGatewayAdministrator(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roles: { select: { role: true } },
      },
    });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'auth.errors.userNotFound',
        error: 'USER_NOT_FOUND',
      });
    }

    const roles = user.roles.map((entry) => entry.role);
    if (
      !roles.some(
        (role) =>
          role === UserRoleType.SUPER_ADMIN || role === UserRoleType.ADMIN,
      )
    ) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.forbidden',
        error: 'ADMIN_REQUIRED',
      });
    }
    return roles;
  }

  private async verifyCurrentPassword(input: {
    actorUserId: string;
    actorRoles: string[];
    currentPassword: string;
    operation: string;
    targetId: string;
    requestId: string;
  }): Promise<void> {
    if (!input.currentPassword) {
      throw new BadRequestException({
        messageKey: 'auth.errors.invalidCredentials',
        error: 'CURRENT_PASSWORD_REQUIRED',
      });
    }
    await this.passwordConfirmationService.verify(input);
  }

  private assertReason(reason: string): void {
    if (!reason.trim()) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentGatewayControlReasonRequired',
        error: 'PAYMENT_GATEWAY_CONTROL_REASON_REQUIRED',
      });
    }
  }

  private assertStepUpPayload(challengeId: string, code: string): void {
    if (!challengeId.trim() || !code.trim()) {
      throw new BadRequestException({
        messageKey: 'payments.errors.paymentGatewayControlStepUpRequired',
        error: 'PAYMENT_GATEWAY_CONTROL_STEP_UP_REQUIRED',
      });
    }
  }

  private async requestStepUpChallenge(input: {
    actorUserId: string;
    locale: SupportedLocale;
    scope: 'provider' | 'routing';
    provider: PaymentGatewayControlManagedProvider | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.actorUserId },
      select: {
        id: true,
        roles: { select: { role: true } },
        emails: {
          where: { isPrimary: true },
          take: 1,
          select: { email: true, isVerified: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        messageKey: 'auth.errors.userNotFound',
        error: 'USER_NOT_FOUND',
      });
    }

    if (
      !user.roles.some(
        (role) =>
          role.role === UserRoleType.SUPER_ADMIN || role.role === UserRoleType.ADMIN,
      )
    ) {
      throw new ForbiddenException({
        messageKey: 'auth.errors.forbidden',
        error: 'ADMIN_REQUIRED',
      });
    }

    const email = user.emails[0]?.email ?? null;
    if (!email) {
      throw new BadRequestException({
        messageKey: 'auth.errors.emailRequired',
        error: 'ADMIN_EMAIL_REQUIRED',
      });
    }

    const challenge = await this.createOtpChallengeUseCase.execute({
      userId: user.id,
      purpose: OtpPurpose.ADMIN_STEP_UP,
      channel: OtpChannel.EMAIL,
      target: email,
      metadata: {
        scope: input.scope,
        provider: input.provider,
      },
    });

    await this.sendOtpChallengeUseCase.execute({
      challengeId: challenge.challengeId,
      userId: user.id,
      purpose: OtpPurpose.ADMIN_STEP_UP,
      channel: OtpChannel.EMAIL,
      target: email,
      code: challenge.code,
      expiresAt: challenge.expiresAt,
      locale: input.locale,
    });

    return {
      challengeId: challenge.challengeId,
      maskedTarget: challenge.maskedTarget,
      expiresAt: challenge.expiresAt.toISOString(),
    };
  }

  private async verifyStepUp(input: {
    challengeId: string;
    code: string;
    actorUserId: string;
  }): Promise<void> {
    await this.verifyOtpChallengeUseCase.execute({
      challengeId: input.challengeId,
      userId: input.actorUserId,
      code: input.code,
      purpose: OtpPurpose.ADMIN_STEP_UP,
    });
  }

  private mapAuditEventToHistoryItem(event: {
    id: string;
    typeSlug: string;
    metadataJson: Prisma.JsonValue | null;
    occurredAt: Date;
    actorUserId: string | null;
    actorUser: { id: string; displayName: string | null } | null;
  }): PaymentGatewayControlHistoryItem {
    const metadata = (event.metadataJson ?? {}) as Record<string, unknown>;
    return {
      id: event.id,
      scope:
        typeof metadata.scope === 'string'
          ? (metadata.scope as 'provider' | 'routing')
          : 'provider',
      provider:
        typeof metadata.provider === 'string'
          ? (metadata.provider as PaymentGatewayControlManagedProvider)
          : null,
      action:
        typeof metadata.action === 'string' ? metadata.action : event.typeSlug,
      reason: typeof metadata.reason === 'string' ? metadata.reason : null,
      requestId:
        typeof metadata.requestId === 'string' ? metadata.requestId : null,
      changedAt: event.occurredAt.toISOString(),
      actorUserId: event.actorUserId,
      actorDisplayName: event.actorUser?.displayName ?? null,
      beforeSnapshot:
        (metadata.beforeSnapshot as
          | PaymentGatewayControlRuntimeSnapshot
          | PaymentRoutingRuntimeSnapshot
          | undefined) ?? null,
      afterSnapshot:
        (metadata.afterSnapshot as
          | PaymentGatewayControlRuntimeSnapshot
          | PaymentRoutingRuntimeSnapshot
          | undefined) ?? null,
      validationIssues: Array.isArray(metadata.validationIssues)
        ? (metadata.validationIssues as unknown[]).filter(
            (item): item is string => typeof item === 'string',
          )
        : [],
    };
  }

  private assertSupportedProvider(
    provider: PaymentGatewayControlProvider,
  ): void {
    if (
      !PAYMENT_GATEWAY_CONTROL_MANAGED_PROVIDERS.includes(
        provider as PaymentGatewayControlManagedProvider,
      )
    ) {
      throw new NotFoundException({
        messageKey: 'payments.errors.paymentGatewayControlProviderUnsupported',
        error: 'PAYMENT_GATEWAY_CONTROL_PROVIDER_UNSUPPORTED',
      });
    }
  }
}
