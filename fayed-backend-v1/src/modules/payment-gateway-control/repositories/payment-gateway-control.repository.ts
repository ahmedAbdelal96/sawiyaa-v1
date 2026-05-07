import { Injectable } from '@nestjs/common';
import {
  AuditEventSource,
  ConfigChangeAction,
  ConfigDataType,
  ConfigScopeType,
  NotificationCategory,
  NotificationStatus,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS,
  PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
  PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE,
} from '../payment-gateway-control.constants';
import {
  PaymentGatewayControlScope,
  PaymentRoutingRuntimeSnapshot,
  PaymobGatewayControlRuntimeSnapshot,
  StripeGatewayControlRuntimeSnapshot,
} from '../types/payment-gateway-control.types';

type ProviderSnapshot =
  | PaymobGatewayControlRuntimeSnapshot
  | StripeGatewayControlRuntimeSnapshot;

type RoutingSnapshot = PaymentRoutingRuntimeSnapshot;

@Injectable()
export class PaymentGatewayControlRepository {
  constructor(private readonly prisma: PrismaService) {}

  listHistory(input: {
    scope: PaymentGatewayControlScope;
    provider: PaymentProvider | null;
  }) {
    return this.prisma.auditEvent.findMany({
      where: {
        targetEntityType:
          input.scope === 'routing'
            ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
            : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
        targetEntityId: input.scope === 'routing' ? null : input.provider,
      },
      orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        actorUser: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  findHistoryEvent(input: {
    scope: PaymentGatewayControlScope;
    provider: PaymentProvider | null;
    eventId: string;
  }) {
    return this.prisma.auditEvent.findFirst({
      where: {
        id: input.eventId,
        targetEntityType:
          input.scope === 'routing'
            ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
            : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
        targetEntityId: input.scope === 'routing' ? null : input.provider,
      },
    });
  }

  async applySnapshot(input: {
    scope: PaymentGatewayControlScope;
    provider: PaymentProvider | null;
    actorUserId: string;
    requestId: string;
    reason: string;
    action: 'UPDATED' | 'ROLLBACK';
    beforeSnapshot: ProviderSnapshot | RoutingSnapshot;
    afterSnapshot: ProviderSnapshot | RoutingSnapshot;
    rollbackSourceEventId?: string | null;
  }) {
    const changedKeys = this.getChangedKeys(input.beforeSnapshot, input.afterSnapshot);

    if (changedKeys.length === 0) {
      return {
        revisionNumber: await this.getNextRevisionNumber(input.scope, input.provider),
        auditEventId: null,
        configChangeLogIds: [],
        changedKeys,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const configKeyMap = new Map(
        (
          await tx.configKeyCatalog.findMany({
            where: {
              key: {
                in: changedKeys.map((key) => this.mapControlKeyToConfigKey(input.scope, input.provider, key)),
              },
            },
            select: {
              id: true,
              key: true,
              dataType: true,
            },
          })
        ).map((row) => [row.key, row] as const),
      );

      const configChangeLogIds: string[] = [];
      const revisionNumber =
        (await tx.auditEvent.count({
          where: {
            targetEntityType:
              input.scope === 'routing'
                ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
                : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
            targetEntityId: input.scope === 'routing' ? null : input.provider,
          },
        })) + 1;

      for (const key of changedKeys) {
        const configKeyName = this.mapControlKeyToConfigKey(input.scope, input.provider, key);
        const configKey = configKeyMap.get(configKeyName);

        if (!configKey) {
          throw new Error(`Missing config key catalog entry for payment gateway control key "${configKeyName}"`);
        }

        const previousValue = this.extractSnapshotValue(input.beforeSnapshot, key);
        const nextValue = this.extractSnapshotValue(input.afterSnapshot, key);

        const currentValues = await tx.configValue.findMany({
          where: {
            configKeyId: configKey.id,
            scopeType: ConfigScopeType.GLOBAL,
            scopeRefId: null,
            isActive: true,
          },
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        });

        await tx.configValue.updateMany({
          where: {
            configKeyId: configKey.id,
            scopeType: ConfigScopeType.GLOBAL,
            scopeRefId: null,
            isActive: true,
          },
          data: {
            isActive: false,
            effectiveTo: new Date(),
          },
        });

        const createdValue = await tx.configValue.create({
          data: this.buildConfigValueCreateData(configKey.id, nextValue),
        });

        const log = await tx.configChangeLog.create({
          data: {
            configKeyId: configKey.id,
            configValueId: createdValue.id,
            changedByUserId: input.actorUserId,
            changeAction:
              currentValues.length > 0 ? ConfigChangeAction.UPDATED : ConfigChangeAction.CREATED,
            oldValueSnapshot: previousValue as Prisma.InputJsonValue,
            newValueSnapshot: nextValue as Prisma.InputJsonValue,
            reason: input.reason,
          },
        });

        configChangeLogIds.push(log.id);
      }

      const auditEvent = await tx.auditEvent.create({
        data: {
          typeSlug: `payment-gateway-control.${input.scope}.${input.action.toLowerCase()}`,
          eventFamily: 'payment-gateway-control',
          category: NotificationCategory.SYSTEM,
          status: NotificationStatus.SENT,
          source: AuditEventSource.SYSTEM,
          actorUserId: input.actorUserId,
          targetEntityType:
            input.scope === 'routing'
              ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
              : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
          targetEntityId: input.scope === 'routing' ? null : input.provider,
          titleSnapshot:
            input.action === 'ROLLBACK'
              ? 'Payment gateway control rollback'
              : 'Payment gateway control update',
          subjectSnapshot: 'Payment gateway control configuration change',
          bodySnapshot: `${input.action} applied to ${input.scope}${input.provider ? `:${input.provider}` : ''}`,
          metadataJson: {
            scope: input.scope,
            provider: input.provider,
            requestId: input.requestId,
            revisionNumber,
            action: input.action,
            reason: input.reason,
            changedKeys,
            beforeSnapshot: input.beforeSnapshot,
            afterSnapshot: input.afterSnapshot,
            configChangeLogIds,
            rollbackSourceEventId: input.rollbackSourceEventId ?? null,
          },
          occurredAt: new Date(),
        },
      });

      return {
        revisionNumber,
        auditEventId: auditEvent.id,
        configChangeLogIds,
        changedKeys,
      };
    });
  }

  private getChangedKeys(
    beforeSnapshot: ProviderSnapshot | RoutingSnapshot,
    afterSnapshot: ProviderSnapshot | RoutingSnapshot,
  ): string[] {
    if (this.isRoutingSnapshot(beforeSnapshot) && this.isRoutingSnapshot(afterSnapshot)) {
      const keys: string[] = [];
      if (beforeSnapshot.defaultProvider !== afterSnapshot.defaultProvider) {
        keys.push('defaultProvider');
      }
      if (JSON.stringify(beforeSnapshot.priorityOrder) !== JSON.stringify(afterSnapshot.priorityOrder)) {
        keys.push('priorityOrder');
      }
      if (beforeSnapshot.fallbackProvider !== afterSnapshot.fallbackProvider) {
        keys.push('fallbackProvider');
      }
      return keys;
    }

    if (this.isPaymobSnapshot(beforeSnapshot) && this.isPaymobSnapshot(afterSnapshot)) {
      const keys: Array<
        | 'enabled'
        | 'checkoutFlow'
        | 'defaultMethod'
        | 'maintenanceMode'
        | 'allowedCountryIsoCodes'
        | 'methodRegistry'
      > = [];

      if (beforeSnapshot.enabled !== afterSnapshot.enabled) keys.push('enabled');
      if (beforeSnapshot.checkoutFlow !== afterSnapshot.checkoutFlow) keys.push('checkoutFlow');
      if (beforeSnapshot.defaultMethod !== afterSnapshot.defaultMethod) keys.push('defaultMethod');
      if (beforeSnapshot.maintenanceMode !== afterSnapshot.maintenanceMode) keys.push('maintenanceMode');
      if (
        JSON.stringify(beforeSnapshot.allowedCountryIsoCodes) !==
        JSON.stringify(afterSnapshot.allowedCountryIsoCodes)
      ) {
        keys.push('allowedCountryIsoCodes');
      }
      if (JSON.stringify(beforeSnapshot.methodRegistry) !== JSON.stringify(afterSnapshot.methodRegistry)) {
        keys.push('methodRegistry');
      }
      return keys;
    }

    if (this.isStripeSnapshot(beforeSnapshot) && this.isStripeSnapshot(afterSnapshot)) {
      const keys: Array<'enabled' | 'maintenanceMode' | 'allowedCountryIsoCodes'> = [];
      if (beforeSnapshot.enabled !== afterSnapshot.enabled) keys.push('enabled');
      if (beforeSnapshot.maintenanceMode !== afterSnapshot.maintenanceMode) {
        keys.push('maintenanceMode');
      }
      if (
        JSON.stringify(beforeSnapshot.allowedCountryIsoCodes) !==
        JSON.stringify(afterSnapshot.allowedCountryIsoCodes)
      ) {
        keys.push('allowedCountryIsoCodes');
      }
      return keys;
    }

    return [];
  }

  private extractSnapshotValue(
    snapshot: ProviderSnapshot | RoutingSnapshot,
    key: string,
  ): Prisma.JsonValue {
    if (this.isRoutingSnapshot(snapshot)) {
      const routingSnapshot = snapshot as RoutingSnapshot;
      switch (key) {
        case 'defaultProvider':
          return routingSnapshot.defaultProvider;
        case 'priorityOrder':
          return routingSnapshot.priorityOrder;
        case 'fallbackProvider':
          return routingSnapshot.fallbackProvider;
        default:
          return null;
      }
    }

    if (this.isStripeSnapshot(snapshot)) {
      const stripeSnapshot = snapshot as StripeGatewayControlRuntimeSnapshot;
      switch (key) {
        case 'enabled':
          return stripeSnapshot.enabled;
        case 'maintenanceMode':
          return stripeSnapshot.maintenanceMode;
        case 'allowedCountryIsoCodes':
          return stripeSnapshot.allowedCountryIsoCodes;
        default:
          return null;
      }
    }

    const paymobSnapshot = snapshot as PaymobGatewayControlRuntimeSnapshot;
    switch (key) {
      case 'enabled':
        return paymobSnapshot.enabled;
      case 'checkoutFlow':
        return paymobSnapshot.checkoutFlow;
      case 'defaultMethod':
        return paymobSnapshot.defaultMethod;
      case 'maintenanceMode':
        return paymobSnapshot.maintenanceMode;
      case 'allowedCountryIsoCodes':
        return paymobSnapshot.allowedCountryIsoCodes;
      case 'methodRegistry':
        return paymobSnapshot.methodRegistry;
      default:
        return null;
    }
  }

  private buildConfigValueCreateData(configKeyId: string, value: Prisma.JsonValue) {
    if (typeof value === 'boolean') {
      return {
        configKeyId,
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
        valueBoolean: value,
        priority: 100,
        isActive: true,
      };
    }

    if (typeof value === 'string') {
      return {
        configKeyId,
        scopeType: ConfigScopeType.GLOBAL,
        scopeRefId: null,
        valueString: value,
        priority: 100,
        isActive: true,
      };
    }

    return {
      configKeyId,
      scopeType: ConfigScopeType.GLOBAL,
      scopeRefId: null,
      valueJson: value as Prisma.InputJsonValue,
      priority: 100,
      isActive: true,
    };
  }

  private mapControlKeyToConfigKey(
    scope: PaymentGatewayControlScope,
    provider: PaymentProvider | null,
    key: string,
  ): string {
    if (scope === 'routing') {
      switch (key) {
        case 'defaultProvider':
          return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.routingDefaultProvider;
        case 'priorityOrder':
          return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.routingPriorityOrder;
        case 'fallbackProvider':
          return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.routingFallbackProvider;
        default:
          return key;
      }
    }

    if (provider === PaymentProvider.STRIPE) {
      switch (key) {
        case 'enabled':
          return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.stripeEnabled;
        case 'maintenanceMode':
          return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.stripeMaintenanceMode;
        case 'allowedCountryIsoCodes':
          return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.stripeAllowedCountries;
        default:
          return key;
      }
    }

    switch (key) {
      case 'enabled':
        return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobEnabled;
      case 'checkoutFlow':
        return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobCheckoutFlow;
      case 'defaultMethod':
        return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobDefaultMethod;
      case 'maintenanceMode':
        return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobMaintenanceMode;
      case 'allowedCountryIsoCodes':
        return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobAllowedCountries;
      case 'methodRegistry':
        return PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobMethodRegistry;
      default:
        return key;
    }
  }

  private async getNextRevisionNumber(
    scope: PaymentGatewayControlScope,
    provider: PaymentProvider | null,
  ): Promise<number> {
    return (
      (await this.prisma.auditEvent.count({
        where: {
          targetEntityType:
            scope === 'routing'
              ? PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE
              : PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE,
          targetEntityId: scope === 'routing' ? null : provider,
        },
      })) + 1
    );
  }

  private isPaymobSnapshot(
    snapshot: ProviderSnapshot | RoutingSnapshot,
  ): snapshot is PaymobGatewayControlRuntimeSnapshot {
    return (snapshot as PaymobGatewayControlRuntimeSnapshot).provider === PaymentProvider.PAYMOB;
  }

  private isStripeSnapshot(
    snapshot: ProviderSnapshot | RoutingSnapshot,
  ): snapshot is StripeGatewayControlRuntimeSnapshot {
    return (snapshot as StripeGatewayControlRuntimeSnapshot).provider === PaymentProvider.STRIPE;
  }

  private isRoutingSnapshot(
    snapshot: ProviderSnapshot | RoutingSnapshot,
  ): snapshot is RoutingSnapshot {
    return typeof (snapshot as RoutingSnapshot).defaultProvider !== 'undefined' &&
      Array.isArray((snapshot as RoutingSnapshot).priorityOrder);
  }
}
