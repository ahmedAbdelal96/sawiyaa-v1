import { PaymentProvider } from '@prisma/client';
import { CONFIG_KEYS } from '@modules/config/registry/config-key.constants';

export const PAYMENT_GATEWAY_CONTROL_PROVIDER_TARGET_ENTITY_TYPE =
  'PAYMENT_GATEWAY_CONTROL';

export const PAYMENT_GATEWAY_ROUTING_TARGET_ENTITY_TYPE =
  'PAYMENT_GATEWAY_ROUTING';

export const PAYMENT_GATEWAY_CONTROL_MANAGED_PROVIDERS = [
  PaymentProvider.PAYMOB,
  PaymentProvider.STRIPE,
] as const;

export const PAYMENT_GATEWAY_CONTROL_PROVIDER = PaymentProvider.PAYMOB;

export const PAYMENT_GATEWAY_CONTROL_CONFIG_KEYS = {
  paymobEnabled: CONFIG_KEYS.payment.provider.paymob.enabled,
  paymobCheckoutFlow: CONFIG_KEYS.payment.provider.paymob.checkoutFlow,
  paymobDefaultMethod: CONFIG_KEYS.payment.provider.paymob.defaultMethod,
  paymobMethodRegistry: CONFIG_KEYS.payment.provider.paymob.methodRegistry,
  paymobMaintenanceMode: CONFIG_KEYS.payment.provider.paymob.maintenanceMode,
  paymobAllowedCountries: CONFIG_KEYS.payment.provider.paymob.allowedCountries,
  stripeEnabled: CONFIG_KEYS.payment.provider.stripe.enabled,
  stripeMaintenanceMode: CONFIG_KEYS.payment.provider.stripe.maintenanceMode,
  stripeAllowedCountries: CONFIG_KEYS.payment.provider.stripe.allowedCountries,
  routingDefaultProvider: CONFIG_KEYS.payment.routing.defaultProvider,
  routingPriorityOrder: CONFIG_KEYS.payment.routing.priorityOrder,
  routingFallbackProvider: CONFIG_KEYS.payment.routing.fallbackProvider,
  routingCurrencyRoutes: CONFIG_KEYS.payment.routing.currencyRoutes,
} as const;
