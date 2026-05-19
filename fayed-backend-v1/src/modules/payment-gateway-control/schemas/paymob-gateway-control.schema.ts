import { PaymentProvider } from '@prisma/client';
import { z } from 'zod';
import { PaymobCheckoutFlow } from '@modules/payments/types/paymob-payment.types';

export const paymentGatewayControlProviderSchema = z.enum([
  PaymentProvider.PAYMOB,
  PaymentProvider.STRIPE,
]);

export const paymobCheckoutFlowSchema = z.enum([
  PaymobCheckoutFlow.LEGACY,
  PaymobCheckoutFlow.INTENTION,
]);

const countryIsoCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(3)
  .transform((value) => value.toUpperCase());

const providerKeySchema = z.enum([
  PaymentProvider.PAYMOB,
  PaymentProvider.STRIPE,
]);

export const paymobGatewayMethodEntrySchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Z0-9][A-Z0-9_-]*$/i),
    label: z.string().trim().min(1).max(120),
    type: z.string().trim().min(1).max(60),
    enabled: z.boolean(),
    priority: z.number().int().min(0).max(1000).default(0),
    supportedCheckoutFlows: z.array(paymobCheckoutFlowSchema).default([]),
    countryIsoCodes: z.array(countryIsoCodeSchema).default([]),
    integrationId: z.string().trim().min(1).max(120).nullable().default(null),
  })
  .strict();

export const paymobGatewayControlDraftSchema = z
  .object({
    enabled: z.boolean(),
    checkoutFlow: paymobCheckoutFlowSchema,
    defaultMethod: z.string().trim().min(1).max(80).nullable().default(null),
    maintenanceMode: z.boolean(),
    allowedCountryIsoCodes: z.array(countryIsoCodeSchema).default([]),
    methodRegistry: z.array(paymobGatewayMethodEntrySchema).default([]),
  })
  .strict();

export const stripeGatewayControlDraftSchema = z
  .object({
    enabled: z.boolean(),
    maintenanceMode: z.boolean(),
    allowedCountryIsoCodes: z.array(countryIsoCodeSchema).default([]),
  })
  .strict();

export const paymentRoutingDraftSchema = z
  .object({
    defaultProvider: providerKeySchema.nullable(),
    priorityOrder: z
      .array(providerKeySchema)
      .default([])
      .transform((value) => [...new Set(value)]),
    fallbackProvider: providerKeySchema.nullable().default(null),
  })
  .strict()
  .superRefine((draft, ctx) => {
    if (
      draft.defaultProvider &&
      !draft.priorityOrder.includes(draft.defaultProvider)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultProvider'],
        message: 'Default provider must appear in the priority order.',
      });
    }

    if (
      draft.fallbackProvider &&
      !draft.priorityOrder.includes(draft.fallbackProvider)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fallbackProvider'],
        message: 'Fallback provider must appear in the priority order.',
      });
    }
  });

export type PaymobGatewayControlDraftInput = z.input<
  typeof paymobGatewayControlDraftSchema
>;

export type PaymobGatewayControlDraftNormalized = z.output<
  typeof paymobGatewayControlDraftSchema
>;

export type StripeGatewayControlDraftInput = z.input<
  typeof stripeGatewayControlDraftSchema
>;

export type StripeGatewayControlDraftNormalized = z.output<
  typeof stripeGatewayControlDraftSchema
>;

export type PaymentRoutingDraftInput = z.input<
  typeof paymentRoutingDraftSchema
>;

export type PaymentRoutingDraftNormalized = z.output<
  typeof paymentRoutingDraftSchema
>;
