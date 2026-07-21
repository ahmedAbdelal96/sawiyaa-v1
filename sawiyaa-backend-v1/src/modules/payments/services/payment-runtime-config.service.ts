import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import appConfig from '@config/app.config';
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

type SupportedPaymentCurrencyCode = 'EGP' | 'USD';

type PaymobMethodContext = {
  currencyCode?: string | null;
  checkoutCountryIsoCode?: string | null;
  operatingCountryIsoCode?: string | null;
};

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
  egpCardIntegrationId: string | null;
  egpWalletIntegrationId: string | null;
  usdCardIntegrationId: string | null;
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
    @Inject(appConfig.KEY)
    private readonly appCfg: ConfigType<typeof appConfig>,
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

  getPaymentEnvironment(): 'development' | 'staging' | 'production' {
    return this.paymentCfg.appEnv === 'production'
      ? 'production'
      : this.paymentCfg.appEnv === 'staging'
        ? 'staging'
        : 'development';
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
      checkoutBaseUrl: this.toNullable(this.paymentCfg.paymob.checkoutBaseUrl),
      checkoutFlow: snapshot.checkoutFlow,
      egpCardIntegrationId: this.toNullable(
        this.paymentCfg.paymob.egpCardIntegrationId,
      ),
      egpWalletIntegrationId: this.toNullable(
        this.paymentCfg.paymob.egpWalletIntegrationId,
      ),
      usdCardIntegrationId: this.toNullable(
        this.paymentCfg.paymob.usdCardIntegrationId,
      ),
      integrationIdCard: this.toNullable(
        this.paymentCfg.paymob.integrationIdCard,
      ),
      integrationIdWallet: this.toNullable(
        this.paymentCfg.paymob.integrationIdWallet,
      ),
      iframeId: this.toNullable(this.paymentCfg.paymob.iframeId),
      defaultCheckoutMethod: snapshot.defaultMethod,
      methodRegistryJson: this.toNullable(
        this.paymentCfg.paymob.methodRegistryJson,
      ),
      maintenanceMode: snapshot.maintenanceMode,
      allowedCountryIsoCodes: snapshot.allowedCountryIsoCodes,
    };
  }

  getPaymobCheckoutFlow(): PaymobCheckoutFlowValue {
    return this.getPaymobConfig().checkoutFlow;
  }

  getPaymobMethodRegistry(): PaymobMethodRegistryEntry[] {
    const paymob = this.getPaymobConfig();
    const parsedRegistry = this.parsePaymobMethodRegistry(
      paymob.methodRegistryJson,
    );

    if (parsedRegistry.length > 0) {
      return parsedRegistry;
    }

    return this.buildCurrencyAwareFallbackRegistry(paymob);
  }

  getPaymobEnabledMethods(
    context?: PaymobMethodContext,
  ): PaymobMethodRegistryEntry[] {
    const flow = this.getPaymobCheckoutFlow();

    return [...this.getPaymobMethodRegistry()]
      .filter((entry) => {
        if (!entry.enabled || !entry.integrationId?.trim()) {
          return false;
        }

        if (!entry.supportedCheckoutFlows.includes(flow)) {
          return false;
        }

        return this.isMethodApplicable(entry, context);
      })
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }

        return left.label.localeCompare(right.label);
      });
  }

  getPaymobSupportedCheckoutMethods(context?: PaymobMethodContext): Array<{
    method: string;
    integrationId: string;
  }> {
    return this.getPaymobEnabledMethods(context).map((item) => ({
      method: item.key,
      integrationId: item.integrationId!,
    }));
  }

  getPaymobDefaultCheckoutMethod(context?: PaymobMethodContext): string | null {
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

  resolvePaymobCheckoutMethod(
    preferredMethod?: string | null,
    context?: PaymobMethodContext,
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
    context?: PaymobMethodContext,
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

  resolvePaymobIntegrationIdForRoute(
    routeIntegrationKey: string | null | undefined,
    checkoutMethod?: string | null,
    context?: PaymobMethodContext,
  ): string | null {
    const key = routeIntegrationKey?.trim().toLowerCase();
    const config = this.getPaymobConfig();
    if (key === 'paymob-egp-card') return config.egpCardIntegrationId;
    if (key === 'paymob-usd-card') return config.usdCardIntegrationId;
    if (key === 'paymob-egp-wallet') return config.egpWalletIntegrationId;
    return this.resolvePaymobIntegrationId(checkoutMethod, context);
  }

  getPaymobIntentionPaymentMethodIds(context?: PaymobMethodContext): number[] {
    return this.getPaymobEnabledMethods(context)
      .map((item) => Number(item.integrationId))
      .filter((value) => Number.isFinite(value));
  }

  getPaymobCurrencyMethodConfigIssues(): string[] {
    const paymob = this.getPaymobConfig();
    const issues: string[] = [];
    const hasExplicitEnvConfig = Boolean(
      paymob.egpCardIntegrationId ||
      paymob.egpWalletIntegrationId ||
      paymob.usdCardIntegrationId,
    );
    const hasLegacyEnvConfig = Boolean(
      paymob.integrationIdCard || paymob.integrationIdWallet,
    );
    const rawRegistry = paymob.methodRegistryJson;
    const registry = this.parsePaymobMethodRegistry(rawRegistry);
    const sourceLabel = rawRegistry?.trim()
      ? 'PAYMOB_METHOD_REGISTRY_JSON'
      : 'env';

    if (rawRegistry?.trim() && (hasExplicitEnvConfig || hasLegacyEnvConfig)) {
      issues.push(
        'Paymob currency/method config is ambiguous. Use either PAYMOB_METHOD_REGISTRY_JSON or the explicit PAYMOB_*_INTEGRATION_ID variables, not both.',
      );
    }

    if (rawRegistry?.trim() && registry.length === 0) {
      issues.push(
        'PAYMOB_METHOD_REGISTRY_JSON is present but could not be parsed into any valid method entries.',
      );
    }

    const seenEntries = new Set<string>();

    for (const entry of registry) {
      const normalizedMethod =
        this.normalizeMethodKey(entry.type) ??
        this.normalizeMethodKey(entry.key);
      const normalizedCurrencies = entry.currencyCodes
        .map((value) => this.normalizeCurrencyCode(value))
        .filter((value): value is SupportedPaymentCurrencyCode =>
          Boolean(value),
        );

      if (!normalizedMethod || !['CARD', 'WALLET'].includes(normalizedMethod)) {
        issues.push(
          `Unsupported Paymob method ${entry.key} in ${sourceLabel}. Only CARD and WALLET are allowed for checkout.`,
        );
      }

      if (entry.enabled && !entry.integrationId?.trim()) {
        issues.push(
          `Enabled Paymob method ${entry.key} is missing an integrationId.`,
        );
      }

      if (entry.enabled && normalizedCurrencies.length === 0) {
        issues.push(
          `Enabled Paymob method ${entry.key} must declare explicit currencyCodes.`,
        );
      }

      if (
        entry.currencyCodes.some((value) => !this.normalizeCurrencyCode(value))
      ) {
        issues.push(
          `Paymob method ${entry.key} contains an unsupported currency code. Only EGP and USD are allowed.`,
        );
      }

      if (
        entry.enabled &&
        normalizedMethod === PaymobCheckoutMethod.WALLET &&
        normalizedCurrencies.includes('USD')
      ) {
        issues.push(
          'USD WALLET is not supported. Remove USD from any Paymob WALLET method configuration.',
        );
      }

      for (const currencyCode of normalizedCurrencies) {
        const dedupeKey = `${currencyCode}:${normalizedMethod}`;
        if (seenEntries.has(dedupeKey)) {
          issues.push(
            `Duplicate Paymob method configuration detected for ${currencyCode} ${normalizedMethod}.`,
          );
          continue;
        }

        seenEntries.add(dedupeKey);
      }
    }

    if (!rawRegistry?.trim()) {
      const hasAnyCardConfig = Boolean(
        paymob.egpCardIntegrationId ||
        paymob.usdCardIntegrationId ||
        paymob.integrationIdCard,
      );

      if (!hasAnyCardConfig) {
        issues.push(
          'Paymob checkout requires at least one card integration. Configure PAYMOB_EGP_CARD_INTEGRATION_ID, PAYMOB_USD_CARD_INTEGRATION_ID, or legacy PAYMOB_INTEGRATION_ID_CARD/PAYMOB_INTEGRATION_ID.',
        );
      }
    }

    return issues;
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

  getTrustedReturnUrlOrigins(): string[] {
    const origins = new Set<string>();

    this.addTrustedOrigin(origins, this.appCfg.url ?? null);
    this.addTrustedOrigin(origins, this.paymentCfg.appBaseUrl ?? null);

    for (const origin of this.appCfg.corsOrigins ?? []) {
      this.addTrustedOrigin(origins, origin);
    }

    return [...origins];
  }

  isTrustedReturnUrl(returnUrl: string | null | undefined): boolean {
    const parsed = this.parseUrlOrNull(returnUrl);
    if (!parsed) {
      return false;
    }

    if (parsed.protocol === 'sawiyaa:') {
      return true;
    }

    if (!this.isHttpUrl(parsed)) {
      return false;
    }

    return this.getTrustedReturnUrlOrigins().includes(parsed.origin);
  }

  resolveTrustedReturnUrl(returnUrl: string | null | undefined): string | null {
    if (!returnUrl?.trim()) {
      return null;
    }

    return this.isTrustedReturnUrl(returnUrl.trim()) ? returnUrl.trim() : null;
  }

  resolveTrustedReturnUrlBase(
    returnUrlBase: string | null | undefined,
  ): string | null {
    if (!returnUrlBase?.trim()) {
      return null;
    }

    return this.isTrustedReturnUrl(returnUrlBase.trim())
      ? returnUrlBase.trim()
      : null;
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
        .map((entry) => this.normalizePaymobRegistryEntry(entry))
        .filter((entry): entry is PaymobMethodRegistryEntry => Boolean(entry));
    } catch {
      return [];
    }
  }

  private normalizePaymobRegistryEntry(
    entry: unknown,
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
      priority: this.toNumber(
        raw.priority ?? raw.order ?? raw.position ?? 0,
        0,
      ),
      integrationId,
      currencyCodes: this.toStringArray(
        raw.currencyCodes ?? raw.currencies ?? raw.currencyCode ?? null,
      ),
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

  private buildCurrencyAwareFallbackRegistry(
    paymob: PaymobRuntimeConfig,
  ): PaymobMethodRegistryEntry[] {
    const registry: PaymobMethodRegistryEntry[] = [];

    if (paymob.egpCardIntegrationId) {
      registry.push({
        key: PaymobCheckoutMethod.CARD,
        label: 'Card',
        type: 'CARD',
        enabled: true,
        priority: 100,
        integrationId: paymob.egpCardIntegrationId,
        currencyCodes: ['EGP'],
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        countryIsoCodes: [],
      });
    }

    if (paymob.egpWalletIntegrationId) {
      registry.push({
        key: PaymobCheckoutMethod.WALLET,
        label: 'Mobile Wallet',
        type: 'WALLET',
        enabled: true,
        priority: 90,
        integrationId: paymob.egpWalletIntegrationId,
        currencyCodes: ['EGP'],
        supportedCheckoutFlows: [
          PaymobCheckoutFlow.LEGACY,
          PaymobCheckoutFlow.INTENTION,
        ],
        countryIsoCodes: ['EG', 'EGY'],
      });
    }

    if (paymob.usdCardIntegrationId) {
      registry.push({
        key: PaymobCheckoutMethod.CARD,
        label: 'Card',
        type: 'CARD',
        enabled: true,
        priority: 80,
        integrationId: paymob.usdCardIntegrationId,
        currencyCodes: ['USD'],
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
      currencyCode?: string | null;
      checkoutCountryIsoCode?: string | null;
      operatingCountryIsoCode?: string | null;
    },
  ): boolean {
    if (!entry.currencyCodes.length) {
      return false;
    }

    const normalizedCurrency = this.normalizeCurrencyCode(
      context?.currencyCode,
    );
    if (normalizedCurrency) {
      const methodCurrencies = entry.currencyCodes
        .map((value) => this.normalizeCurrencyCode(value))
        .filter((value): value is SupportedPaymentCurrencyCode =>
          Boolean(value),
        );

      if (!methodCurrencies.length) {
        return false;
      }

      if (!methodCurrencies.includes(normalizedCurrency)) {
        return false;
      }
    }

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

  private normalizeCurrencyCode(
    value: string | null | undefined,
  ): SupportedPaymentCurrencyCode | null {
    const normalized = this.normalizeMethodKey(value);

    if (normalized === 'EGP' || normalized === 'USD') {
      return normalized;
    }

    return null;
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
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? [trimmed] : [];
    }

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

  private addTrustedOrigin(target: Set<string>, value: string | null): void {
    const parsed = this.parseUrlOrNull(value);
    if (!parsed) {
      return;
    }

    if (this.isHttpUrl(parsed)) {
      target.add(parsed.origin);
    }
  }

  private parseUrlOrNull(value: string | null | undefined): URL | null {
    if (!value?.trim()) {
      return null;
    }

    try {
      return new URL(value.trim());
    } catch {
      return null;
    }
  }

  private isHttpUrl(url: URL): boolean {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }
}
