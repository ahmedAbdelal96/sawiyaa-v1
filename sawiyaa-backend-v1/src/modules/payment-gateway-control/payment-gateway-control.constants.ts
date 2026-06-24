import { PaymentProvider } from '@prisma/client';

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
  paymobEnabled: 'payment.provider.paymob.enabled',
  paymobCheckoutFlow: 'payment.provider.paymob.checkoutFlow',
  paymobDefaultMethod: 'payment.provider.paymob.defaultMethod',
  paymobMethodRegistry: 'payment.provider.paymob.methodRegistry',
  paymobMaintenanceMode: 'payment.provider.paymob.maintenanceMode',
  paymobAllowedCountries: 'payment.provider.paymob.allowedCountries',
  stripeEnabled: 'payment.provider.stripe.enabled',
  stripeMaintenanceMode: 'payment.provider.stripe.maintenanceMode',
  stripeAllowedCountries: 'payment.provider.stripe.allowedCountries',
  routingDefaultProvider: 'payment.routing.defaultProvider',
  routingPriorityOrder: 'payment.routing.priorityOrder',
  routingFallbackProvider: 'payment.routing.fallbackProvider',
} as const;
