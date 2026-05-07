import {
  ConfigCategory,
  ConfigDataType,
  ConfigKind,
  ConfigScopeType,
  PrismaClient,
} from '@prisma/client';
import { SeedModule } from '../shared/seed.types';
import { daysAgo, daysFromNow } from '../shared/seed.utils';

/**
 * Config seed module provides realistic defaults and active values for runtime resolution tests.
 */
export const configSeedModule: SeedModule = {
  name: 'config',
  async run(prisma: PrismaClient): Promise<void> {
    const keySeed = [
      {
        key: 'platform.defaultLocale',
        slug: 'platform-default-locale',
        displayName: 'Platform Default Locale',
        description: 'Fallback locale when request locale is missing',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING,
        category: ConfigCategory.LOCALE,
        isSensitive: false,
        isRequired: true,
        supportsOverride: true,
        defaultValueJson: 'en',
      },
      {
        key: 'auth.otp.loginTtlMinutes',
        slug: 'auth-otp-login-ttl-minutes',
        displayName: 'Practitioner Login OTP TTL Minutes',
        description: 'OTP validity window in minutes for login flow',
        configKind: ConfigKind.LIMIT,
        dataType: ConfigDataType.NUMBER,
        category: ConfigCategory.SECURITY,
        isSensitive: false,
        isRequired: true,
        supportsOverride: false,
        defaultValueJson: 10,
      },
      {
        key: 'auth.passwordReset.otpTtlMinutes',
        slug: 'auth-password-reset-otp-ttl-minutes',
        displayName: 'Password Reset OTP TTL Minutes',
        description: 'OTP validity window in minutes for password reset',
        configKind: ConfigKind.LIMIT,
        dataType: ConfigDataType.NUMBER,
        category: ConfigCategory.SECURITY,
        isSensitive: false,
        isRequired: true,
        supportsOverride: false,
        defaultValueJson: 15,
      },
      {
        key: 'security.jwt.accessTokenTtlMinutes',
        slug: 'security-jwt-access-token-ttl-minutes',
        displayName: 'Access Token TTL Minutes',
        description: 'JWT access token lifetime in minutes',
        configKind: ConfigKind.POLICY,
        dataType: ConfigDataType.NUMBER,
        category: ConfigCategory.SECURITY,
        isSensitive: false,
        isRequired: true,
        supportsOverride: false,
        defaultValueJson: 30,
      },
      {
        key: 'features.practitionerApplicationAdminReviewEnabled',
        slug: 'features-practitioner-application-admin-review-enabled',
        displayName: 'Practitioner Admin Review Feature',
        description: 'Feature flag controlling admin review operations',
        configKind: ConfigKind.FEATURE_DEFAULT,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.SYSTEM,
        isSensitive: false,
        isRequired: true,
        supportsOverride: true,
        defaultValueJson: true,
      },
      {
        key: 'notifications.channels.default',
        slug: 'notifications-channels-default',
        displayName: 'Default Notification Channels',
        description: 'Default enabled notification channels',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING_ARRAY,
        category: ConfigCategory.NOTIFICATION,
        isSensitive: false,
        isRequired: true,
        supportsOverride: true,
        defaultValueJson: ['EMAIL', 'IN_APP'],
      },
      {
        key: 'packages.enabled',
        slug: 'packages-enabled',
        displayName: 'Package Plans Enabled',
        description: 'Controls whether standardized package plans are visible',
        configKind: ConfigKind.FEATURE_DEFAULT,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.BOOKING,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
        defaultValueJson: true,
      },
      {
        key: 'packages.purchaseEnabled',
        slug: 'packages-purchase-enabled',
        displayName: 'Package Purchases Enabled',
        description: 'Controls whether package quote and purchase flows are enabled',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.BOOKING,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
        defaultValueJson: true,
      },
      {
        key: 'payment.provider.paymob.enabled',
        slug: 'payment-provider-paymob-enabled',
        displayName: 'Paymob Provider Enabled',
        description: 'Controls whether Paymob can be used for payment routing',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.paymob.checkoutFlow',
        slug: 'payment-provider-paymob-checkout-flow',
        displayName: 'Paymob Checkout Flow',
        description: 'Selects the active Paymob checkout flow',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.paymob.defaultMethod',
        slug: 'payment-provider-paymob-default-method',
        displayName: 'Paymob Default Method',
        description: 'Selects the preferred Paymob checkout method',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.paymob.methodRegistry',
        slug: 'payment-provider-paymob-method-registry',
        displayName: 'Paymob Method Registry',
        description: 'Typed registry for Paymob enabled payment methods',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.JSON,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.paymob.maintenanceMode',
        slug: 'payment-provider-paymob-maintenance-mode',
        displayName: 'Paymob Maintenance Mode',
        description: 'Temporarily disables Paymob checkout availability',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.paymob.allowedCountries',
        slug: 'payment-provider-paymob-allowed-countries',
        displayName: 'Paymob Allowed Countries',
        description: 'Allowed country ISO codes for Paymob enabled methods',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING_ARRAY,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.stripe.enabled',
        slug: 'payment-provider-stripe-enabled',
        displayName: 'Stripe Provider Enabled',
        description: 'Controls whether Stripe can be used for payment routing',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.stripe.maintenanceMode',
        slug: 'payment-provider-stripe-maintenance-mode',
        displayName: 'Stripe Maintenance Mode',
        description: 'Temporarily disables Stripe checkout availability',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.BOOLEAN,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.provider.stripe.allowedCountries',
        slug: 'payment-provider-stripe-allowed-countries',
        displayName: 'Stripe Allowed Countries',
        description: 'Allowed country ISO codes for Stripe availability',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING_ARRAY,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.routing.defaultProvider',
        slug: 'payment-routing-default-provider',
        displayName: 'Payment Routing Default Provider',
        description: 'Preferred provider when multiple providers are available',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.routing.priorityOrder',
        slug: 'payment-routing-priority-order',
        displayName: 'Payment Routing Priority Order',
        description: 'Provider priority order for runtime fallback selection',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING_ARRAY,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      {
        key: 'payment.routing.fallbackProvider',
        slug: 'payment-routing-fallback-provider',
        displayName: 'Payment Routing Fallback Provider',
        description:
          'Fallback provider used when the default provider is unavailable',
        configKind: ConfigKind.SETTING,
        dataType: ConfigDataType.STRING,
        category: ConfigCategory.PAYMENT,
        isSensitive: false,
        isRequired: false,
        supportsOverride: true,
      },
      ];

    for (const key of keySeed) {
      await prisma.configKeyCatalog.upsert({
        where: { key: key.key },
        create: key,
        update: {
          slug: key.slug,
          displayName: key.displayName,
          description: key.description,
          configKind: key.configKind,
          dataType: key.dataType,
          category: key.category,
          isSensitive: key.isSensitive,
          isRequired: key.isRequired,
          supportsOverride: key.supportsOverride,
          defaultValueJson: key.defaultValueJson,
        },
      });
    }

    const keyMap = new Map(
      (
        await prisma.configKeyCatalog.findMany({
          where: {
            key: {
              in: keySeed.map((item) => item.key),
            },
          },
          select: {
            id: true,
            key: true,
          },
        })
      ).map((row) => [row.key, row.id] as const),
    );

    const valuesByKey: Record<
      string,
      Array<{
        scopeType: ConfigScopeType;
        valueString?: string;
        valueNumber?: number;
        valueBoolean?: boolean;
        valueJson?: unknown;
        priority: number;
        isActive: boolean;
        effectiveFrom?: Date | null;
        effectiveTo?: Date | null;
      }>
    > = {
      'platform.defaultLocale': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueString: 'ar',
          priority: 100,
          isActive: true,
        },
      ],
      'auth.otp.loginTtlMinutes': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueNumber: 7,
          priority: 90,
          isActive: false,
          effectiveFrom: daysAgo(30),
          effectiveTo: daysAgo(10),
        },
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueNumber: 8,
          priority: 100,
          isActive: true,
          effectiveFrom: daysAgo(1),
        },
      ],
      'auth.passwordReset.otpTtlMinutes': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueNumber: 12,
          priority: 100,
          isActive: true,
        },
      ],
      'security.jwt.accessTokenTtlMinutes': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueNumber: 20,
          priority: 100,
          isActive: true,
        },
      ],
      'features.practitionerApplicationAdminReviewEnabled': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueBoolean: true,
          priority: 100,
          isActive: true,
          effectiveFrom: daysAgo(2),
          effectiveTo: daysFromNow(365),
        },
      ],
      'notifications.channels.default': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueJson: ['EMAIL', 'IN_APP'],
          priority: 100,
          isActive: true,
        },
      ],
      'packages.enabled': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueBoolean: true,
          priority: 100,
          isActive: true,
        },
      ],
      'packages.purchaseEnabled': [
        {
          scopeType: ConfigScopeType.GLOBAL,
          valueBoolean: true,
          priority: 100,
          isActive: true,
        },
      ],
    };

    for (const [key, values] of Object.entries(valuesByKey)) {
      const configKeyId = keyMap.get(key);
      if (!configKeyId) {
        continue;
      }

      await prisma.configValue.deleteMany({
        where: {
          configKeyId,
          scopeType: ConfigScopeType.GLOBAL,
          scopeRefId: null,
        },
      });

      for (const value of values) {
        await prisma.configValue.create({
          data: {
            configKeyId,
            scopeType: value.scopeType,
            valueString: value.valueString,
            valueNumber:
              value.valueNumber === undefined ? undefined : value.valueNumber,
            valueBoolean: value.valueBoolean,
            valueJson: value.valueJson as object | undefined,
            priority: value.priority,
            isActive: value.isActive,
            effectiveFrom: value.effectiveFrom ?? null,
            effectiveTo: value.effectiveTo ?? null,
          },
        });
      }
    }
  },
};
