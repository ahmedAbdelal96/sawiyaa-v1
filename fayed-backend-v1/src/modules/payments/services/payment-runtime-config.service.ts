import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import paymentConfig from '@config/payment.config';
import { PaymentGatewayControlRuntimeService } from '@modules/payment-gateway-control/services/payment-gateway-control.runtime';
import {
  PaymobCheckoutFlow,
  PaymobCheckoutFlowValue,
  PaymobCheckoutMethod,
  PaymobMethodRegistryEntry,
} from '../types/paymob-payment.types';
import { PaymentRoutingRuntimeSnapshot } from '@modules/payment-gateway-control/types/payment-gateway-control.types';

type StripeRuntimeConfig = {
  enabled: boolean;
  mode: 'test' | 'live';
  publishableKey: string | null;
  secretKey: string | null;
  webhookSecret: string | null;
  apiBaseUrl: string | null;
};

type PaymobRuntimeConfig = {
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
};

type PaymentAccountingRuntimeConfig = {
  vatEnabled: boolean;
  vatRatePercent: string;
  gatewayFeeRatePercent: string;
  gatewayFeeFixedAmount: string;
};

@Injectable()
export class PaymentRuntimeConfigService {
  constructor(
    @Inject(paymentConfig.KEY)
    private readonly paymentCfg: ConfigType<typeof paymentConfig>,
    private readonly paymentGatewayControlRuntimeService: PaymentGatewayControlRuntimeService,
  ) {}

  getStripeConfig(): StripeRuntimeConfig {
    return {
      enabled: this.paymentCfg.stripe.enabled,
      mode: this.paymentCfg.stripe.mode,
      publishableKey: this.toNullable(this.paymentCfg.stripe.publishableKey),
      secretKey: this.toNullable(this.paymentCfg.stripe.secretKey),
      webhookSecret: this.toNullable(this.paymentCfg.stripe.webhookSecret),
      apiBaseUrl: this.toNullable(this.paymentCfg.stripe.apiBaseUrl),
    };
  }

  getPaymentRoutingConfig(): PaymentRoutingRuntimeSnapshot {
    return this.paymentGatewayControlRuntimeService.getRoutingSnapshot();
  }

  getPaymobConfig(): PaymobRuntimeConfig {
    const snapshot =
      this.paymentGatewayControlRuntimeService.getPaymobSnapshot();

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
      checkoutBaseUrl: this.toNullable(
        this.paymentCfg.paymob.checkoutBaseUrl,
      ),
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

  getPaymobCheckoutFlow(): PaymobCheckoutFlowValue {
    return this.getPaymobConfig().checkoutFlow;
  }

  getPaymobMethodRegistry(): PaymobMethodRegistryEntry[] {
    const snapshot = this.paymentGatewayControlRuntimeService.getPaymobSnapshot();
    const parsedRegistry = snapshot.methodRegistry;

    if (parsedRegistry.length > 0) {
      return parsedRegistry;
    }

    return this.buildLegacyFallbackRegistry(this.getPaymobConfig());
  }

  getPaymobEnabledMethods(context?: {
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): PaymobMethodRegistryEntry[] {
    const flow = this.getPaymobCheckoutFlow();

    return this.getPaymobMethodRegistry().filter((entry) => {
      if (!entry.enabled || !entry.integrationId?.trim()) {
        return false;
      }

      if (!entry.supportedCheckoutFlows.includes(flow)) {
        return false;
      }

      return this.isMethodApplicable(entry, context);
    });
  }

  getPaymobSupportedCheckoutMethods(context?: {
    checkoutCountryIsoCode?: string | null;
    operatingCountryIsoCode?: string | null;
  }): Array<{
    method: string;
    integrationId: string;
  }> {
    return this.getPaymobEnabledMethods(context).map((item) => ({
      method: item.key,
      integrationId: item.integrationId!,
    }));
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
      enabledMethods.some((item) => this.normalizeMethodKey(item.key) === configuredDefault)
    ) {
      return enabledMethods.find(
        (item) => this.normalizeMethodKey(item.key) === configuredDefault,
      )?.key ?? null;
    }

    const cardDefault = enabledMethods.find((item) =>
      this.normalizeMethodKey(item.key) === 'CARD',
    );
    if (cardDefault) {
      return cardDefault.key;
    }

    return enabledMethods[0]?.key ?? null;
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
      : enabledMethods.find(
          (item) =>
            this.normalizeMethodKey(item.key) ===
            this.normalizeMethodKey(this.getPaymobDefaultCheckoutMethod(context)),
        ) ?? enabledMethods[0];

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

  getAccountingConfig(): PaymentAccountingRuntimeConfig {
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

      if (!stripe.enabled || !stripe.secretKey || !stripe.apiBaseUrl) {
        this.throwProviderNotConfigured(PaymentProvider.STRIPE);
      }

      return;
    }

    if (provider === PaymentProvider.PAYMOB) {
      const paymob = this.getPaymobConfig();
      const enabledMethods = this.getPaymobEnabledMethods();

      if (
        !paymob.enabled ||
        !paymob.apiKey ||
        !paymob.baseUrl ||
        !paymob.hmacSecret ||
        enabledMethods.length === 0
      ) {
        this.throwProviderNotConfigured(PaymentProvider.PAYMOB);
      }

      if (paymob.checkoutFlow === PaymobCheckoutFlow.LEGACY && !paymob.iframeId) {
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

      return;
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
      return;
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

  private parsePaymobMethodRegistry(
    raw: string | null,
  ): PaymobMethodRegistryEntry[] {
    if (!raw?.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const candidates = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { methods?: unknown }).methods)
          ? ((parsed as { methods?: unknown[] }).methods ?? [])
          : [];

      return candidates
        .map((entry, index) => this.normalizePaymobRegistryEntry(entry, index))
        .filter(
          (entry): entry is PaymobMethodRegistryEntry => Boolean(entry),
        );
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
    const key = this.toNullable(
      raw.key ?? raw.method ?? raw.name ?? raw.slug ?? null,
    );

    if (!key) {
      return null;
    }

    const label =
      this.toNullable(raw.label ?? raw.title ?? raw.displayName ?? null) ??
      key;
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
      priority: this.toNumber(raw.priority ?? raw.order ?? raw.position ?? 0, 0),
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
    };
  }

  private buildLegacyFallbackRegistry(
    paymob: PaymobRuntimeConfig,
  ): PaymobMethodRegistryEntry[] {
    const registry: PaymobMethodRegistryEntry[] = [];

    if (paymob.integrationIdCard) {
      registry.push({
        key: PaymobCheckoutMethod.CARD,
        label: 'Card',
        type: 'CARD',
        enabled: true,
        priority: 100,
        integrationId: paymob.integrationIdCard,
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        countryIsoCodes: [],
      });
    }

    if (paymob.integrationIdWallet) {
      registry.push({
        key: PaymobCheckoutMethod.WALLET,
        label: 'Mobile Wallet',
        type: 'WALLET',
        enabled: true,
        priority: 90,
        integrationId: paymob.integrationIdWallet,
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        countryIsoCodes: [],
      });
    }

    return registry;
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

  private isLegacyCompatibleMethodType(type: string): boolean {
    const normalized = this.normalizeMethodKey(type);

    return (
      normalized === PaymobCheckoutMethod.CARD ||
      normalized === PaymobCheckoutMethod.WALLET
    );
  }

  private inferPaymobMethodType(value: string): string {
    const normalized = this.normalizeMethodKey(value) ?? 'OTHER';

    if (normalized.includes('CARD')) {
      return 'CARD';
    }

    if (normalized.includes('WALLET')) {
      return 'WALLET';
    }

    if (normalized.includes('KIOSK')) {
      return 'KIOSK';
    }

    if (
      normalized.includes('BNPL') ||
      normalized.includes('INSTALLMENT') ||
      normalized.includes('INSTALMENT')
    ) {
      return normalized.includes('BNPL') ? 'BNPL' : 'INSTALLMENT';
    }

    return normalized;
  }

  private isMethodApplicable(
    entry: PaymobMethodRegistryEntry,
    context?: {
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): boolean {
    if (!entry.countryIsoCodes.length) {
      return true;
    }

    const contextCountries = [
      context?.checkoutCountryIsoCode,
      context?.operatingCountryIsoCode,
    ]
      .map((value) => this.normalizeMethodKey(value))
      .filter((value): value is string => Boolean(value));

    if (!contextCountries.length) {
      return true;
    }

    return contextCountries.some((countryCode) =>
      entry.countryIsoCodes.some(
        (allowedCountry) =>
          this.normalizeMethodKey(allowedCountry) === countryCode,
      ),
    );
  }

  private normalizeMethodKey(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed.toUpperCase() : null;
  }

  private toBoolean(
    value: unknown,
    fallback = false,
  ): boolean {
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

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return fallback;
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
