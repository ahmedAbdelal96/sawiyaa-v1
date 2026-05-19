import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import {
  ConfigDataType,
  ConfigScopeType,
  PaymentProvider,
  Prisma,
} from '@prisma/client';
import paymentConfig from '@config/payment.config';
import { ResolveConfigValueUseCase } from '@modules/config/use-cases/resolve-config-value.use-case';
import {
  PaymobCheckoutFlow,
  PaymobCheckoutFlowValue,
  PaymobCheckoutMethod,
  PaymobMethodRegistryEntry,
} from '@modules/payments/types/paymob-payment.types';
import { PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS } from '../payment-gateway-control.constants';
import {
  PaymentGatewayControlManagedProvider,
  PaymentGatewayControlProvider,
  PaymentGatewayControlRuntimeSnapshot,
  PaymentRoutingRuntimeSnapshot,
  PaymobGatewayControlMethodEntry,
  PaymobGatewayControlRuntimeSnapshot,
  StripeGatewayControlRuntimeSnapshot,
} from '../types/payment-gateway-control.types';
import {
  PaymentRoutingDraftNormalized,
  PaymobGatewayControlDraftNormalized,
  paymobGatewayControlDraftSchema,
  paymobGatewayMethodEntrySchema,
  paymentRoutingDraftSchema,
  stripeGatewayControlDraftSchema,
  StripeGatewayControlDraftNormalized,
} from '../schemas/paymob-gateway-control.schema';

type ResolvedConfig = {
  value: Prisma.JsonValue | string | number | boolean | null;
  source: 'database' | 'catalog_default' | 'missing';
  dataType: ConfigDataType;
};

type ProviderRuntimeSnapshot =
  | PaymobGatewayControlRuntimeSnapshot
  | StripeGatewayControlRuntimeSnapshot;

@Injectable()
export class PaymentGatewayControlRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(
    PaymentGatewayControlRuntimeService.name,
  );
  private providerSnapshots = new Map<
    PaymentGatewayControlManagedProvider,
    ProviderRuntimeSnapshot
  >();
  private routingSnapshot: PaymentRoutingRuntimeSnapshot | null = null;

  constructor(
    @Inject(paymentConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentConfig>,
    private readonly resolveConfigValueUseCase: ResolveConfigValueUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshAllSnapshots();
  }

  getProviderSnapshot(
    provider: PaymentGatewayControlManagedProvider,
  ): ProviderRuntimeSnapshot {
    return (
      this.providerSnapshots.get(provider) ??
      this.buildFallbackProviderSnapshot(provider)
    );
  }

  getPaymobSnapshot(): PaymobGatewayControlRuntimeSnapshot {
    return this.getProviderSnapshot(
      PaymentProvider.PAYMOB,
    ) as PaymobGatewayControlRuntimeSnapshot;
  }

  getStripeSnapshot(): StripeGatewayControlRuntimeSnapshot {
    return this.getProviderSnapshot(
      PaymentProvider.STRIPE,
    ) as StripeGatewayControlRuntimeSnapshot;
  }

  getRoutingSnapshot(): PaymentRoutingRuntimeSnapshot {
    return this.routingSnapshot ?? this.buildFallbackRoutingSnapshot();
  }

  async refreshProviderSnapshot(
    provider: PaymentGatewayControlManagedProvider,
  ): Promise<ProviderRuntimeSnapshot> {
    const snapshot = await this.loadProviderSnapshot(provider);
    this.providerSnapshots.set(provider, snapshot);
    return snapshot;
  }

  async refreshPaymobSnapshot(): Promise<PaymobGatewayControlRuntimeSnapshot> {
    return this.refreshProviderSnapshot(
      PaymentProvider.PAYMOB,
    ) as Promise<PaymobGatewayControlRuntimeSnapshot>;
  }

  async refreshStripeSnapshot(): Promise<StripeGatewayControlRuntimeSnapshot> {
    return this.refreshProviderSnapshot(
      PaymentProvider.STRIPE,
    ) as Promise<StripeGatewayControlRuntimeSnapshot>;
  }

  async refreshRoutingSnapshot(): Promise<PaymentRoutingRuntimeSnapshot> {
    const snapshot = await this.loadRoutingSnapshot();
    this.routingSnapshot = snapshot;
    return snapshot;
  }

  async refreshAllSnapshots(): Promise<void> {
    await Promise.all([
      this.refreshProviderSnapshot(PaymentProvider.PAYMOB),
      this.refreshProviderSnapshot(PaymentProvider.STRIPE),
      this.refreshRoutingSnapshot(),
    ]);
  }

  updatePaymobSnapshot(snapshot: PaymobGatewayControlRuntimeSnapshot): void {
    this.providerSnapshots.set(PaymentProvider.PAYMOB, snapshot);
  }

  updateStripeSnapshot(snapshot: StripeGatewayControlRuntimeSnapshot): void {
    this.providerSnapshots.set(PaymentProvider.STRIPE, snapshot);
  }

  updateRoutingSnapshot(snapshot: PaymentRoutingRuntimeSnapshot): void {
    this.routingSnapshot = snapshot;
  }

  isPaymobEnabled(): boolean {
    return this.getPaymobConfig().enabled;
  }

  isPaymobMaintenanceMode(): boolean {
    return this.getPaymobConfig().maintenanceMode;
  }

  getPaymobAllowedCountries(): string[] {
    return this.getPaymobConfig().allowedCountryIsoCodes;
  }

  getPaymobMethodRegistry(): PaymobMethodRegistryEntry[] {
    return this.getPaymobSnapshot().methodRegistry;
  }

  getPaymobCheckoutFlow(): PaymobCheckoutFlowValue {
    return this.getPaymobConfig().checkoutFlow;
  }

  getPaymobDefaultCheckoutMethod(context?: {
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): string | null {
    const enabledMethods = this.getPaymobEnabledMethods(context);
    if (!enabledMethods.length) {
      return null;
    }

    const configuredDefault = this.normalizeMethodKey(
      this.getPaymobConfig().defaultCheckoutMethod,
    );
    if (
      configuredDefault &&
      enabledMethods.some(
        (item) => this.normalizeMethodKey(item.key) === configuredDefault,
      )
    ) {
      return (
        enabledMethods.find(
          (item) => this.normalizeMethodKey(item.key) === configuredDefault,
        )?.key ?? null
      );
    }

    const cardDefault = enabledMethods.find(
      (item) => this.normalizeMethodKey(item.key) === 'CARD',
    );
    if (cardDefault) {
      return cardDefault.key;
    }

    return enabledMethods[0]?.key ?? null;
  }

  getPaymobEnabledMethods(context?: {
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): PaymobMethodRegistryEntry[] {
    const snapshot = this.getPaymobSnapshot();
    if (!snapshot.enabled || snapshot.maintenanceMode) {
      return [];
    }

    return this.filterActivePaymobMethods(snapshot, context);
  }

  resolvePaymobCheckoutMethod(
    preferredMethod?: string | null,
    context?: {
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): string | null {
    const enabledMethods = this.getPaymobEnabledMethods(context);
    if (!enabledMethods.length) {
      return null;
    }

    const normalizedPreferred = this.normalizeMethodKey(preferredMethod);
    if (normalizedPreferred) {
      const resolved = enabledMethods.find(
        (item) =>
          this.normalizeMethodKey(item.key) === normalizedPreferred ||
          this.normalizeMethodKey(item.type) === normalizedPreferred,
      );

      return resolved?.key ?? null;
    }

    return this.getPaymobDefaultCheckoutMethod(context);
  }

  resolvePaymobIntegrationId(
    checkoutMethod?: string | null,
    context?: {
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): string | null {
    const enabledMethods = this.getPaymobEnabledMethods(context);
    if (!enabledMethods.length) {
      return null;
    }

    const normalizedMethod = this.normalizeMethodKey(checkoutMethod);
    const selected = normalizedMethod
      ? enabledMethods.find(
          (item) =>
            this.normalizeMethodKey(item.key) === normalizedMethod ||
            this.normalizeMethodKey(item.type) === normalizedMethod,
        )
      : (enabledMethods.find(
          (item) =>
            this.normalizeMethodKey(item.key) ===
            this.normalizeMethodKey(
              this.getPaymobDefaultCheckoutMethod(context),
            ),
        ) ?? enabledMethods[0]);

    return selected?.integrationId ?? null;
  }

  getPaymobIntentionPaymentMethodIds(context?: {
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): number[] {
    return this.getPaymobEnabledMethods(context)
      .map((item) => Number(item.integrationId))
      .filter((value) => Number.isFinite(value));
  }

  getPaymobSupportedCheckoutMethods(context?: {
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): Array<{ method: string; integrationId: string }> {
    return this.getPaymobEnabledMethods(context).map((item) => ({
      method: item.key,
      integrationId: item.integrationId!,
    }));
  }

  getPaymobCheckoutLaunchUrl(clientSecret: string): string {
    const paymob = this.getPaymobConfig();
    const checkoutBaseUrl = paymob.checkoutBaseUrl;
    const publicKey = paymob.publicKey;

    if (!checkoutBaseUrl || !publicKey) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerNotConfigured',
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      });
    }

    return `${checkoutBaseUrl}/v1/intention/element/${encodeURIComponent(publicKey)}/${encodeURIComponent(clientSecret)}/`;
  }

  getPaymobIntentionCreateUrl(): string {
    const paymob = this.getPaymobConfig();
    const intentionBaseUrl = paymob.intentionBaseUrl;

    if (!intentionBaseUrl) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerNotConfigured',
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      });
    }

    return `${intentionBaseUrl}/v1/intention/`;
  }

  getPaymobConfig(): {
    enabled: boolean;
    mode: 'test' | 'live';
    apiKey: string | null;
    publicKey: string | null;
    hmacSecret: string | null;
    baseUrl: string | null;
    intentionBaseUrl: string | null;
    checkoutBaseUrl: string | null;
    checkoutFlow: PaymobCheckoutFlowValue;
    integrationIdCard: string | null;
    integrationIdWallet: string | null;
    iframeId: string | null;
    defaultCheckoutMethod: string | null;
    methodRegistryJson: string | null;
    maintenanceMode: boolean;
    allowedCountryIsoCodes: string[];
  } {
    const snapshot = this.getPaymobSnapshot();

    return {
      enabled: this.paymentCfg.paymob.enabled && snapshot.enabled,
      mode: this.paymentCfg.paymob.mode,
      apiKey: this.toNullable(this.paymentCfg.paymob.apiKey),
      publicKey: this.toNullable(this.paymentCfg.paymob.publicKey),
      hmacSecret: this.toNullable(this.paymentCfg.paymob.hmacSecret),
      baseUrl: this.toNullable(this.paymentCfg.paymob.baseUrl),
      intentionBaseUrl: this.toNullable(
        this.paymentCfg.paymob.intentionBaseUrl,
      ),
      checkoutBaseUrl: this.toNullable(this.paymentCfg.paymob.checkoutBaseUrl),
      checkoutFlow: snapshot.checkoutFlow,
      integrationIdCard: this.toNullable(
        this.paymentCfg.paymob.integrationIdCard,
      ),
      integrationIdWallet: this.toNullable(
        this.paymentCfg.paymob.integrationIdWallet,
      ),
      iframeId: this.toNullable(this.paymentCfg.paymob.iframeId),
      defaultCheckoutMethod: snapshot.defaultMethod,
      methodRegistryJson: JSON.stringify(snapshot.methodRegistry),
      maintenanceMode: snapshot.maintenanceMode,
      allowedCountryIsoCodes: snapshot.allowedCountryIsoCodes,
    };
  }

  getStripeConfig(): {
    enabled: boolean;
    mode: 'test' | 'live';
    publishableKey: string | null;
    secretKey: string | null;
    webhookSecret: string | null;
    apiBaseUrl: string | null;
    maintenanceMode: boolean;
    allowedCountryIsoCodes: string[];
  } {
    const snapshot = this.getStripeSnapshot();

    return {
      enabled: this.paymentCfg.stripe.enabled && snapshot.enabled,
      mode: this.paymentCfg.stripe.mode,
      publishableKey: this.toNullable(this.paymentCfg.stripe.publishableKey),
      secretKey: this.toNullable(this.paymentCfg.stripe.secretKey),
      webhookSecret: this.toNullable(this.paymentCfg.stripe.webhookSecret),
      apiBaseUrl: this.toNullable(this.paymentCfg.stripe.apiBaseUrl),
      maintenanceMode: snapshot.maintenanceMode,
      allowedCountryIsoCodes: snapshot.allowedCountryIsoCodes,
    };
  }

  getPaymentRoutingConfig(): PaymentRoutingRuntimeSnapshot {
    return this.getRoutingSnapshot();
  }

  getAccountingConfig(): {
    vatEnabled: boolean;
    vatRatePercent: string;
    gatewayFeeRatePercent: string;
    gatewayFeeFixedAmount: string;
  } {
    return {
      vatEnabled: this.paymentCfg.accounting.vatEnabled,
      vatRatePercent: this.paymentCfg.accounting.vatRatePercent,
      gatewayFeeRatePercent: this.paymentCfg.accounting.gatewayFeeRatePercent,
      gatewayFeeFixedAmount: this.paymentCfg.accounting.gatewayFeeFixedAmount,
    };
  }

  getAppBaseUrl(): string {
    const appBaseUrl = this.paymentCfg.appBaseUrl;

    if (!appBaseUrl) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerNotConfigured',
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      });
    }

    return appBaseUrl;
  }

  getRedirectUrls(): {
    success: string;
    failed: string;
    pending: string;
  } {
    const success = this.paymentCfg.redirectUrls.success;
    const failed = this.paymentCfg.redirectUrls.failed;
    const pending = this.paymentCfg.redirectUrls.pending;

    if (!success || !failed || !pending) {
      throw new ServiceUnavailableException({
        messageKey: 'payments.errors.providerNotConfigured',
        error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      });
    }

    return {
      success,
      failed,
      pending,
    };
  }

  assertCheckoutConfigured(provider: PaymentProvider): void {
    if (provider === PaymentProvider.STRIPE) {
      const stripe = this.getStripeConfig();

      if (
        !stripe.enabled ||
        stripe.maintenanceMode ||
        !stripe.secretKey ||
        !stripe.apiBaseUrl
      ) {
        this.throwProviderNotConfigured(PaymentProvider.STRIPE);
      }

      return;
    }

    if (provider === PaymentProvider.PAYMOB) {
      const paymob = this.getPaymobConfig();
      const enabledMethods = this.getPaymobEnabledMethods();

      if (
        !paymob.enabled ||
        paymob.maintenanceMode ||
        !paymob.apiKey ||
        !paymob.baseUrl ||
        !paymob.hmacSecret ||
        enabledMethods.length === 0
      ) {
        this.throwProviderNotConfigured(PaymentProvider.PAYMOB);
      }

      if (
        paymob.checkoutFlow === PaymobCheckoutFlow.LEGACY &&
        !paymob.iframeId
      ) {
        this.throwProviderNotConfigured(PaymentProvider.PAYMOB);
      }

      if (
        paymob.checkoutFlow === PaymobCheckoutFlow.INTENTION &&
        (!paymob.publicKey ||
          !paymob.checkoutBaseUrl ||
          !paymob.intentionBaseUrl)
      ) {
        this.throwProviderNotConfigured(PaymentProvider.PAYMOB);
      }
    }
  }

  assertWebhookConfigured(provider: PaymentProvider): void {
    if (provider === PaymentProvider.STRIPE) {
      const stripe = this.getStripeConfig();
      if (!stripe.enabled || !stripe.webhookSecret) {
        this.throwProviderWebhookNotConfigured(PaymentProvider.STRIPE);
      }
      return;
    }

    if (provider === PaymentProvider.PAYMOB) {
      const paymob = this.getPaymobConfig();
      if (!paymob.enabled || !paymob.hmacSecret) {
        this.throwProviderWebhookNotConfigured(PaymentProvider.PAYMOB);
      }
    }
  }

  isTestMode(provider: PaymentProvider): boolean {
    if (provider === PaymentProvider.STRIPE) {
      return this.getStripeConfig().mode === 'test';
    }

    if (provider === PaymentProvider.PAYMOB) {
      return this.getPaymobConfig().mode === 'test';
    }

    return true;
  }

  isDevelopmentEnvironment(): boolean {
    return this.paymentCfg.isDevelopment;
  }

  private async loadProviderSnapshot(
    provider: PaymentGatewayControlManagedProvider,
  ): Promise<ProviderRuntimeSnapshot> {
    if (provider === PaymentProvider.PAYMOB) {
      return this.loadPaymobSnapshot();
    }

    return this.loadStripeSnapshot();
  }

  private async loadPaymobSnapshot(): Promise<PaymobGatewayControlRuntimeSnapshot> {
    const envSnapshot = this.buildPaymobEnvSnapshot();
    const [
      enabled,
      checkoutFlow,
      defaultMethod,
      maintenanceMode,
      allowedCountries,
      methodRegistry,
    ] = await Promise.all([
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobEnabled,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobCheckoutFlow,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobDefaultMethod,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobMaintenanceMode,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobAllowedCountries,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.paymobMethodRegistry,
      ),
    ]);

    const configOverrides = this.normalizePaymobConfigOverrides({
      enabled,
      checkoutFlow,
      defaultMethod,
      maintenanceMode,
      allowedCountries,
      methodRegistry,
    });

    const merged = this.mergePaymobSnapshots(envSnapshot, configOverrides);
    const validation = this.validatePaymobSnapshot(merged);

    if (!validation.healthy) {
      this.logger.warn(
        `Paymob control snapshot has validation issues: ${validation.issues.join('; ')}`,
      );
    }

    return {
      ...merged,
      validation,
      updatedAt: new Date().toISOString(),
    };
  }

  private async loadStripeSnapshot(): Promise<StripeGatewayControlRuntimeSnapshot> {
    const envSnapshot = this.buildStripeEnvSnapshot();
    const [enabled, maintenanceMode, allowedCountries] = await Promise.all([
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.stripeEnabled,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.stripeMaintenanceMode,
      ),
      this.resolveConfigValue(
        PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.stripeAllowedCountries,
      ),
    ]);

    const configOverrides = this.normalizeStripeConfigOverrides({
      enabled,
      maintenanceMode,
      allowedCountries,
    });

    const merged = this.mergeStripeSnapshots(envSnapshot, configOverrides);
    const validation = this.validateStripeSnapshot(merged);

    if (!validation.healthy) {
      this.logger.warn(
        `Stripe control snapshot has validation issues: ${validation.issues.join('; ')}`,
      );
    }

    return {
      ...merged,
      validation,
      updatedAt: new Date().toISOString(),
    };
  }

  private async loadRoutingSnapshot(): Promise<PaymentRoutingRuntimeSnapshot> {
    const envSnapshot = this.buildRoutingEnvSnapshot();
    const [defaultProvider, priorityOrder, fallbackProvider] =
      await Promise.all([
        this.resolveConfigValue(
          PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.routingDefaultProvider,
        ),
        this.resolveConfigValue(
          PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.routingPriorityOrder,
        ),
        this.resolveConfigValue(
          PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS.routingFallbackProvider,
        ),
      ]);

    const configOverrides = this.normalizeRoutingConfigOverrides({
      defaultProvider,
      priorityOrder,
      fallbackProvider,
    });

    const merged = this.mergeRoutingSnapshots(envSnapshot, configOverrides);
    const validation = this.validateRoutingSnapshot(merged);

    if (!validation.healthy) {
      this.logger.warn(
        `Payment routing control snapshot has validation issues: ${validation.issues.join('; ')}`,
      );
    }

    return {
      ...merged,
      validation,
      updatedAt: new Date().toISOString(),
    };
  }

  private buildPaymobEnvSnapshot(): PaymobGatewayControlRuntimeSnapshot {
    const envMethods = this.parseMethodRegistry(
      this.paymentCfg.paymob.methodRegistryJson,
    );
    const methodRegistry =
      envMethods.length > 0
        ? envMethods
        : this.buildPaymobLegacyFallbackRegistry();

    return {
      provider: PaymentProvider.PAYMOB,
      enabled: this.paymentCfg.paymob.enabled,
      checkoutFlow: this.paymentCfg.paymob
        .checkoutFlow as PaymobCheckoutFlowValue,
      defaultMethod: this.toNullable(
        this.paymentCfg.paymob.defaultCheckoutMethod,
      ),
      maintenanceMode: false,
      allowedCountryIsoCodes: [],
      methodRegistry,
      sources: {
        enabled: 'env',
        checkoutFlow: 'env',
        defaultMethod: 'env',
        maintenanceMode: 'env',
        allowedCountryIsoCodes: 'env',
        methodRegistry: 'env',
      },
      validation: { healthy: true, issues: [] },
      updatedAt: null,
    };
  }

  private buildStripeEnvSnapshot(): StripeGatewayControlRuntimeSnapshot {
    return {
      provider: PaymentProvider.STRIPE,
      enabled: this.paymentCfg.stripe.enabled,
      maintenanceMode: false,
      allowedCountryIsoCodes: [],
      validation: { healthy: true, issues: [] },
      sources: {
        enabled: 'env',
        maintenanceMode: 'env',
        allowedCountryIsoCodes: 'env',
      },
      updatedAt: null,
    };
  }

  private buildRoutingEnvSnapshot(): PaymentRoutingRuntimeSnapshot {
    return {
      defaultProvider: null,
      priorityOrder: [PaymentProvider.PAYMOB, PaymentProvider.STRIPE],
      fallbackProvider: PaymentProvider.STRIPE,
      validation: { healthy: true, issues: [] },
      sources: {
        defaultProvider: 'env',
        priorityOrder: 'env',
        fallbackProvider: 'env',
      },
      updatedAt: null,
    };
  }

  private normalizePaymobConfigOverrides(input: {
    enabled: ResolvedConfig | null;
    checkoutFlow: ResolvedConfig | null;
    defaultMethod: ResolvedConfig | null;
    maintenanceMode: ResolvedConfig | null;
    allowedCountries: ResolvedConfig | null;
    methodRegistry: ResolvedConfig | null;
  }): Partial<PaymobGatewayControlRuntimeSnapshot> {
    const overrides: Partial<PaymobGatewayControlRuntimeSnapshot> = {};

    if (typeof input.enabled?.value === 'boolean') {
      overrides.enabled = input.enabled.value;
    }

    if (typeof input.checkoutFlow?.value === 'string') {
      const normalized = this.normalizeCheckoutFlowValue(
        input.checkoutFlow.value,
      );
      if (normalized) {
        overrides.checkoutFlow = normalized;
      }
    }

    if (typeof input.defaultMethod?.value === 'string') {
      overrides.defaultMethod = input.defaultMethod.value.trim();
    } else if (
      input.defaultMethod?.source === 'database' &&
      input.defaultMethod.value === null
    ) {
      overrides.defaultMethod = null;
    }

    if (typeof input.maintenanceMode?.value === 'boolean') {
      overrides.maintenanceMode = input.maintenanceMode.value;
    }

    if (
      input.allowedCountries?.value !== null &&
      input.allowedCountries?.value !== undefined
    ) {
      overrides.allowedCountryIsoCodes = this.toStringArray(
        input.allowedCountries.value,
      ).map((country) => country.toUpperCase());
    }

    const configMethods = this.parseMethodRegistry(
      input.methodRegistry?.value ?? null,
    );
    if (configMethods.length > 0) {
      overrides.methodRegistry = configMethods;
    } else if (
      input.methodRegistry?.source === 'database' &&
      Array.isArray(input.methodRegistry.value)
    ) {
      overrides.methodRegistry = [];
    }

    return overrides;
  }

  private normalizeStripeConfigOverrides(input: {
    enabled: ResolvedConfig | null;
    maintenanceMode: ResolvedConfig | null;
    allowedCountries: ResolvedConfig | null;
  }): Partial<StripeGatewayControlRuntimeSnapshot> {
    const overrides: Partial<StripeGatewayControlRuntimeSnapshot> = {};

    if (typeof input.enabled?.value === 'boolean') {
      overrides.enabled = input.enabled.value;
    }

    if (typeof input.maintenanceMode?.value === 'boolean') {
      overrides.maintenanceMode = input.maintenanceMode.value;
    }

    if (
      input.allowedCountries?.value !== null &&
      input.allowedCountries?.value !== undefined
    ) {
      overrides.allowedCountryIsoCodes = this.toStringArray(
        input.allowedCountries.value,
      ).map((country) => country.toUpperCase());
    }

    return overrides;
  }

  private normalizeRoutingConfigOverrides(input: {
    defaultProvider: ResolvedConfig | null;
    priorityOrder: ResolvedConfig | null;
    fallbackProvider: ResolvedConfig | null;
  }): Partial<PaymentRoutingRuntimeSnapshot> {
    const overrides: Partial<PaymentRoutingRuntimeSnapshot> = {};

    if (
      input.defaultProvider?.value === null ||
      typeof input.defaultProvider?.value === 'string'
    ) {
      overrides.defaultProvider = this.normalizeProviderKey(
        input.defaultProvider?.value,
      );
    }

    if (
      input.priorityOrder?.value !== null &&
      input.priorityOrder?.value !== undefined
    ) {
      const candidates = this.toStringArray(input.priorityOrder.value)
        .map((item) => this.normalizeProviderKey(item))
        .filter((item): item is PaymentGatewayControlManagedProvider =>
          Boolean(item),
        );

      if (candidates.length > 0) {
        overrides.priorityOrder = Array.from(new Set(candidates));
      } else if (
        input.priorityOrder?.source === 'database' &&
        Array.isArray(input.priorityOrder.value)
      ) {
        overrides.priorityOrder = [];
      }
    }

    if (
      input.fallbackProvider?.value === null ||
      typeof input.fallbackProvider?.value === 'string'
    ) {
      overrides.fallbackProvider = this.normalizeProviderKey(
        input.fallbackProvider?.value,
      );
    }

    return overrides;
  }

  private mergePaymobSnapshots(
    envSnapshot: PaymobGatewayControlRuntimeSnapshot,
    overrides: Partial<PaymobGatewayControlRuntimeSnapshot>,
  ): PaymobGatewayControlRuntimeSnapshot {
    const methodRegistry =
      overrides.methodRegistry ?? envSnapshot.methodRegistry;
    const enabled = overrides.enabled ?? envSnapshot.enabled;
    const checkoutFlow = overrides.checkoutFlow ?? envSnapshot.checkoutFlow;
    const defaultMethod =
      overrides.defaultMethod === undefined
        ? envSnapshot.defaultMethod
        : overrides.defaultMethod;
    const maintenanceMode =
      overrides.maintenanceMode ?? envSnapshot.maintenanceMode;
    const allowedCountryIsoCodes =
      overrides.allowedCountryIsoCodes ?? envSnapshot.allowedCountryIsoCodes;

    return {
      provider: PaymentProvider.PAYMOB,
      enabled,
      checkoutFlow,
      defaultMethod,
      maintenanceMode,
      allowedCountryIsoCodes,
      methodRegistry,
      sources: {
        enabled: overrides.enabled === undefined ? 'env' : 'config',
        checkoutFlow: overrides.checkoutFlow === undefined ? 'env' : 'config',
        defaultMethod: overrides.defaultMethod === undefined ? 'env' : 'config',
        maintenanceMode:
          overrides.maintenanceMode === undefined ? 'env' : 'config',
        allowedCountryIsoCodes:
          overrides.allowedCountryIsoCodes === undefined ? 'env' : 'config',
        methodRegistry:
          overrides.methodRegistry === undefined ? 'env' : 'config',
      },
      validation: { healthy: true, issues: [] },
      updatedAt: envSnapshot.updatedAt,
    };
  }

  private mergeStripeSnapshots(
    envSnapshot: StripeGatewayControlRuntimeSnapshot,
    overrides: Partial<StripeGatewayControlRuntimeSnapshot>,
  ): StripeGatewayControlRuntimeSnapshot {
    const enabled = overrides.enabled ?? envSnapshot.enabled;
    const maintenanceMode =
      overrides.maintenanceMode ?? envSnapshot.maintenanceMode;
    const allowedCountryIsoCodes =
      overrides.allowedCountryIsoCodes ?? envSnapshot.allowedCountryIsoCodes;

    return {
      provider: PaymentProvider.STRIPE,
      enabled,
      maintenanceMode,
      allowedCountryIsoCodes,
      sources: {
        enabled: overrides.enabled === undefined ? 'env' : 'config',
        maintenanceMode:
          overrides.maintenanceMode === undefined ? 'env' : 'config',
        allowedCountryIsoCodes:
          overrides.allowedCountryIsoCodes === undefined ? 'env' : 'config',
      },
      validation: { healthy: true, issues: [] },
      updatedAt: envSnapshot.updatedAt,
    };
  }

  private mergeRoutingSnapshots(
    envSnapshot: PaymentRoutingRuntimeSnapshot,
    overrides: Partial<PaymentRoutingRuntimeSnapshot>,
  ): PaymentRoutingRuntimeSnapshot {
    const defaultProvider =
      overrides.defaultProvider === undefined
        ? envSnapshot.defaultProvider
        : overrides.defaultProvider;
    const priorityOrder = overrides.priorityOrder ?? envSnapshot.priorityOrder;
    const fallbackProvider =
      overrides.fallbackProvider === undefined
        ? envSnapshot.fallbackProvider
        : overrides.fallbackProvider;

    return {
      defaultProvider,
      priorityOrder,
      fallbackProvider,
      sources: {
        defaultProvider:
          overrides.defaultProvider === undefined ? 'env' : 'config',
        priorityOrder: overrides.priorityOrder === undefined ? 'env' : 'config',
        fallbackProvider:
          overrides.fallbackProvider === undefined ? 'env' : 'config',
      },
      validation: { healthy: true, issues: [] },
      updatedAt: envSnapshot.updatedAt,
    };
  }

  private validatePaymobSnapshot(
    snapshot: PaymobGatewayControlRuntimeSnapshot,
  ): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const activeMethods = this.filterActivePaymobMethods(snapshot);

    if (
      snapshot.enabled &&
      !snapshot.maintenanceMode &&
      activeMethods.length === 0
    ) {
      issues.push(
        'No usable Paymob methods remain for the active checkout mode.',
      );
    }

    if (
      snapshot.defaultMethod &&
      !activeMethods.some(
        (item) =>
          this.normalizeMethodKey(item.key) ===
          this.normalizeMethodKey(snapshot.defaultMethod),
      )
    ) {
      issues.push(
        'Configured default Paymob method is not usable for the active snapshot.',
      );
    }

    snapshot.methodRegistry.forEach((method) => {
      if (method.enabled && !method.integrationId) {
        issues.push(
          `Method ${method.key} is enabled but has no integration reference.`,
        );
      }
      if (
        method.enabled &&
        !method.supportedCheckoutFlows.includes(snapshot.checkoutFlow)
      ) {
        issues.push(
          `Method ${method.key} is not compatible with checkout flow ${snapshot.checkoutFlow}.`,
        );
      }
    });

    if (snapshot.enabled && !snapshot.maintenanceMode) {
      const paymob = this.paymentCfg.paymob;
      const missingSecrets: string[] = [];

      if (!paymob.apiKey) missingSecrets.push('PAYMOB_API_KEY');
      if (!paymob.hmacSecret) missingSecrets.push('PAYMOB_HMAC_SECRET');
      if (!paymob.baseUrl) missingSecrets.push('PAYMOB_BASE_URL');

      if (snapshot.checkoutFlow === PaymobCheckoutFlow.LEGACY) {
        if (!paymob.iframeId) missingSecrets.push('PAYMOB_IFRAME_ID');
      } else {
        if (!paymob.publicKey) missingSecrets.push('PAYMOB_PUBLIC_KEY');
        if (!paymob.intentionBaseUrl)
          missingSecrets.push('PAYMOB_INTENTION_BASE_URL');
        if (!paymob.checkoutBaseUrl)
          missingSecrets.push('PAYMOB_CHECKOUT_BASE_URL');
      }

      if (missingSecrets.length > 0) {
        issues.push(
          `Paymob runtime config is missing required fields: ${missingSecrets.join(', ')}`,
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  private validateStripeSnapshot(
    snapshot: StripeGatewayControlRuntimeSnapshot,
  ): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (snapshot.enabled && !snapshot.maintenanceMode) {
      const stripe = this.paymentCfg.stripe;
      const missingSecrets: string[] = [];

      if (!stripe.secretKey) missingSecrets.push('STRIPE_SECRET_KEY');
      if (!stripe.webhookSecret) missingSecrets.push('STRIPE_WEBHOOK_SECRET');
      if (!stripe.apiBaseUrl) missingSecrets.push('STRIPE_API_BASE_URL');

      if (missingSecrets.length > 0) {
        issues.push(
          `Stripe runtime config is missing required fields: ${missingSecrets.join(', ')}`,
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  private validateRoutingSnapshot(snapshot: PaymentRoutingRuntimeSnapshot): {
    healthy: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const providerSnapshots = [
      this.getProviderSnapshot(PaymentProvider.PAYMOB),
      this.getProviderSnapshot(PaymentProvider.STRIPE),
    ];
    const availableProviders = providerSnapshots.filter(
      (item) =>
        item.enabled && !item.maintenanceMode && item.validation.healthy,
    );

    if (snapshot.priorityOrder.length === 0 && availableProviders.length > 0) {
      issues.push(
        'Priority order must contain at least one provider when runtime providers are available.',
      );
    }

    if (
      snapshot.defaultProvider &&
      !snapshot.priorityOrder.includes(snapshot.defaultProvider)
    ) {
      issues.push('Default provider must appear in the priority order.');
    }

    if (
      snapshot.fallbackProvider &&
      !snapshot.priorityOrder.includes(snapshot.fallbackProvider)
    ) {
      issues.push('Fallback provider must appear in the priority order.');
    }

    if (
      snapshot.defaultProvider &&
      !availableProviders.some(
        (item) => item.provider === snapshot.defaultProvider,
      )
    ) {
      issues.push('Configured default provider is not currently usable.');
    }

    if (
      snapshot.fallbackProvider &&
      !availableProviders.some(
        (item) => item.provider === snapshot.fallbackProvider,
      )
    ) {
      issues.push('Configured fallback provider is not currently usable.');
    }

    const hasUsableProvider = snapshot.priorityOrder.some((provider) =>
      availableProviders.some((item) => item.provider === provider),
    );

    if (!hasUsableProvider && availableProviders.length > 0) {
      issues.push('No usable provider remains in the current routing order.');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  private filterActivePaymobMethods(
    snapshot: PaymobGatewayControlRuntimeSnapshot,
    context?: {
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): PaymobMethodRegistryEntry[] {
    const allowedCountryIsoCodes = snapshot.allowedCountryIsoCodes.map(
      (value) => this.normalizeMethodKey(value),
    );
    const contextCountries = [
      context?.checkoutCountryIsoCode,
      context?.operatingCountryIsoCode,
    ]
      .map((value) => this.normalizeMethodKey(value))
      .filter((value): value is string => Boolean(value));

    const methods = snapshot.methodRegistry
      .filter(
        (method) => method.enabled && Boolean(method.integrationId?.trim()),
      )
      .filter((method) =>
        method.supportedCheckoutFlows.includes(snapshot.checkoutFlow),
      )
      .filter((method) => {
        const methodCountries = method.countryIsoCodes.map((value) =>
          this.normalizeMethodKey(value),
        );

        if (allowedCountryIsoCodes.length > 0) {
          const allowed = methodCountries.length
            ? methodCountries.some((code) =>
                allowedCountryIsoCodes.includes(code),
              )
            : allowedCountryIsoCodes.length > 0;

          if (!allowed) {
            return false;
          }
        }

        if (contextCountries.length > 0 && methodCountries.length > 0) {
          return contextCountries.some((countryCode) =>
            methodCountries.includes(countryCode),
          );
        }

        return true;
      });

    return [...methods].sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return left.label.localeCompare(right.label);
    });
  }

  private buildPaymobLegacyFallbackRegistry(): PaymobGatewayControlMethodEntry[] {
    const methods: PaymobGatewayControlMethodEntry[] = [];

    if (this.paymentCfg.paymob.integrationIdCard) {
      methods.push({
        key: PaymobCheckoutMethod.CARD,
        label: 'Card',
        type: 'CARD',
        enabled: true,
        priority: 100,
        integrationId: this.paymentCfg.paymob.integrationIdCard,
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        countryIsoCodes: [],
      });
    }

    if (this.paymentCfg.paymob.integrationIdWallet) {
      methods.push({
        key: PaymobCheckoutMethod.WALLET,
        label: 'Mobile Wallet',
        type: 'WALLET',
        enabled: true,
        priority: 80,
        integrationId: this.paymentCfg.paymob.integrationIdWallet,
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        countryIsoCodes: [],
      });
    }

    return methods;
  }

  private parseMethodRegistry(raw: unknown): PaymobMethodRegistryEntry[] {
    if (raw === null || raw === undefined) {
      return [];
    }

    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const candidates = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { methods?: unknown }).methods)
          ? ((parsed as { methods?: unknown[] }).methods ?? [])
          : [];

      return candidates
        .map((entry, index) => this.normalizePaymobRegistryEntry(entry, index))
        .filter((entry): entry is PaymobMethodRegistryEntry => Boolean(entry));
    } catch {
      return [];
    }
  }

  private normalizePaymobRegistryEntry(
    entry: unknown,
    _index: number,
  ): PaymobMethodRegistryEntry | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const raw = entry as Record<string, unknown>;
    const parsed = paymobGatewayMethodEntrySchema.safeParse(raw);

    if (parsed.success) {
      return parsed.data;
    }

    const key = this.toNullable(
      raw.key ?? raw.method ?? raw.name ?? raw.slug ?? null,
    );
    if (!key) {
      return null;
    }

    const label =
      this.toNullable(raw.label ?? raw.title ?? raw.displayName ?? null) ?? key;
    const type = this.inferPaymobMethodType(
      this.toNullable(raw.type ?? raw.methodType ?? raw.category ?? null) ??
        key,
    );
    const integrationId = this.toNullable(
      raw.integrationId ?? raw.integration_id ?? raw.id ?? null,
    );

    return {
      key: key.trim(),
      label,
      type,
      enabled: this.toBoolean(raw.enabled, true),
      integrationId,
      supportedCheckoutFlows: this.normalizeSupportedCheckoutFlows(
        raw.supportedCheckoutFlows ?? raw.checkoutFlows ?? raw.flows ?? null,
        type,
      ),
      countryIsoCodes: this.toStringArray(
        raw.countryIsoCodes ??
          raw.countries ??
          raw.marketCountryIsoCodes ??
          raw.regionCountryIsoCodes ??
          null,
      ),
      priority: Number.isFinite(Number(raw.priority))
        ? Number(raw.priority)
        : 0,
    };
  }

  private normalizeSupportedCheckoutFlows(
    value: unknown,
    type: string,
  ): PaymobCheckoutFlowValue[] {
    if (Array.isArray(value)) {
      const flows = value
        .map((item) => this.normalizeCheckoutFlowValue(item))
        .filter((item): item is PaymobCheckoutFlowValue => Boolean(item));

      if (flows.length > 0) {
        return flows;
      }
    }

    if (this.isLegacyCompatibleMethodType(type)) {
      return [PaymobCheckoutFlow.LEGACY, PaymobCheckoutFlow.INTENTION];
    }

    return [PaymobCheckoutFlow.INTENTION];
  }

  private normalizeCheckoutFlowValue(
    value: unknown,
  ): PaymobCheckoutFlowValue | null {
    const normalized =
      typeof value === 'string' ? value.trim().toLowerCase() : null;

    if (normalized === PaymobCheckoutFlow.LEGACY) {
      return PaymobCheckoutFlow.LEGACY;
    }

    if (normalized === PaymobCheckoutFlow.INTENTION) {
      return PaymobCheckoutFlow.INTENTION;
    }

    return null;
  }

  private normalizeProviderKey(
    value: string | null | undefined,
  ): PaymentGatewayControlManagedProvider | null {
    const normalized = this.normalizeMethodKey(value);

    if (normalized === PaymentProvider.PAYMOB) {
      return PaymentProvider.PAYMOB;
    }

    if (normalized === PaymentProvider.STRIPE) {
      return PaymentProvider.STRIPE;
    }

    return null;
  }

  private isLegacyCompatibleMethodType(type: string): boolean {
    const normalized = this.normalizeMethodKey(type);
    return (
      normalized === PaymobCheckoutMethod.CARD ||
      normalized === PaymobCheckoutMethod.WALLET
    );
  }

  private inferPaymobMethodType(value: string): string {
    const normalized = this.normalizeMethodKey(value) ?? 'OTHER';

    if (normalized.includes('CARD')) return 'CARD';
    if (normalized.includes('WALLET')) return 'WALLET';
    if (normalized.includes('KIOSK')) return 'KIOSK';
    if (
      normalized.includes('BNPL') ||
      normalized.includes('INSTALLMENT') ||
      normalized.includes('INSTALMENT')
    ) {
      return normalized.includes('BNPL') ? 'BNPL' : 'INSTALLMENT';
    }

    return normalized;
  }

  private normalizeMethodKey(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  private toBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }

    return fallback;
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) =>
        typeof item === 'string' ? item.trim() : String(item).trim(),
      )
      .filter((item) => Boolean(item));
  }

  private buildFallbackProviderSnapshot(
    provider: PaymentGatewayControlManagedProvider,
  ): ProviderRuntimeSnapshot {
    return provider === PaymentProvider.PAYMOB
      ? this.buildPaymobEnvSnapshot()
      : this.buildStripeEnvSnapshot();
  }

  private buildFallbackRoutingSnapshot(): PaymentRoutingRuntimeSnapshot {
    return this.buildRoutingEnvSnapshot();
  }

  private async resolveConfigValue(
    key: string,
  ): Promise<ResolvedConfig | null> {
    try {
      return (await this.resolveConfigValueUseCase.execute(
        key,
      )) as ResolvedConfig;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }

      throw error;
    }
  }

  private throwProviderNotConfigured(provider: PaymentProvider): never {
    throw new ServiceUnavailableException({
      messageKey: 'payments.errors.providerNotConfigured',
      error: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
      messageParams: { provider },
    });
  }

  private throwProviderWebhookNotConfigured(provider: PaymentProvider): never {
    throw new ServiceUnavailableException({
      messageKey: 'payments.errors.providerWebhookNotConfigured',
      error: 'PAYMENT_PROVIDER_WEBHOOK_NOT_CONFIGURED',
      messageParams: { provider },
    });
  }

  private toNullable(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
