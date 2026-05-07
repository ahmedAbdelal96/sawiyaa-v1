import { PaymentProvider } from '@prisma/client';
import { PaymobCheckoutFlowValue } from '@modules/payments/types/paymob-payment.types';

export type PaymentGatewayControlProvider = PaymentProvider;

export type PaymentGatewayControlManagedProvider =
  | 'PAYMOB'
  | 'STRIPE';

export type PaymentGatewayControlRoutingProvider =
  PaymentGatewayControlManagedProvider;

export type PaymentGatewayControlSource = 'env' | 'config';
export type PaymentGatewayControlScope = 'provider' | 'routing';

export type PaymentGatewayControlBaseValidation = {
  healthy: boolean;
  issues: string[];
};

export type PaymentGatewayControlRuntimeBaseSnapshot = {
  provider: PaymentGatewayControlManagedProvider;
  enabled: boolean;
  maintenanceMode: boolean;
  allowedCountryIsoCodes: string[];
  validation: PaymentGatewayControlBaseValidation;
  sources: {
    enabled: PaymentGatewayControlSource;
    maintenanceMode: PaymentGatewayControlSource;
    allowedCountryIsoCodes: PaymentGatewayControlSource;
  };
  updatedAt: string | null;
};

export type PaymobGatewayControlMethodEntry = {
  key: string;
  label: string;
  type: string;
  enabled: boolean;
  priority: number;
  supportedCheckoutFlows: PaymobCheckoutFlowValue[];
  countryIsoCodes: string[];
  integrationId: string | null;
};

export type PaymobGatewayControlDraft = {
  enabled: boolean;
  checkoutFlow: PaymobCheckoutFlowValue;
  defaultMethod: string | null;
  maintenanceMode: boolean;
  allowedCountryIsoCodes: string[];
  methodRegistry: PaymobGatewayControlMethodEntry[];
};

export type PaymobGatewayControlValidationResult = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  normalized: PaymobGatewayControlDraft;
  activeMethods: PaymobGatewayControlMethodEntry[];
};

export type PaymobGatewayControlRuntimeSnapshot = PaymobGatewayControlDraft &
  PaymentGatewayControlRuntimeBaseSnapshot & {
    provider: 'PAYMOB';
    sources: PaymentGatewayControlRuntimeBaseSnapshot['sources'] & {
      checkoutFlow: PaymentGatewayControlSource;
      defaultMethod: PaymentGatewayControlSource;
      methodRegistry: PaymentGatewayControlSource;
    };
  };

export type StripeGatewayControlDraft = {
  enabled: boolean;
  maintenanceMode: boolean;
  allowedCountryIsoCodes: string[];
};

export type StripeGatewayControlValidationResult = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  normalized: StripeGatewayControlDraft;
};

export type StripeGatewayControlRuntimeSnapshot = StripeGatewayControlDraft &
  PaymentGatewayControlRuntimeBaseSnapshot & {
    provider: 'STRIPE';
  };

export type PaymentRoutingDraft = {
  defaultProvider: PaymentGatewayControlRoutingProvider | null;
  priorityOrder: PaymentGatewayControlRoutingProvider[];
  fallbackProvider: PaymentGatewayControlRoutingProvider | null;
};

export type PaymentRoutingValidationResult = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  normalized: PaymentRoutingDraft;
};

export type PaymentGatewayControlValidationResult =
  | PaymobGatewayControlValidationResult
  | StripeGatewayControlValidationResult
  | PaymentRoutingValidationResult;

export type PaymentRoutingRuntimeSnapshot = PaymentRoutingDraft & {
  validation: PaymentGatewayControlBaseValidation;
  sources: {
    defaultProvider: PaymentGatewayControlSource;
    priorityOrder: PaymentGatewayControlSource;
    fallbackProvider: PaymentGatewayControlSource;
  };
  updatedAt: string | null;
};

export type PaymentGatewayControlRuntimeSnapshot =
  | PaymobGatewayControlRuntimeSnapshot
  | StripeGatewayControlRuntimeSnapshot;

export type PaymentGatewayControlHistoryItem = {
  id: string;
  scope: PaymentGatewayControlScope;
  provider: PaymentGatewayControlManagedProvider | null;
  action: string;
  reason: string | null;
  requestId: string | null;
  changedAt: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  beforeSnapshot:
    | PaymentGatewayControlRuntimeSnapshot
    | PaymentRoutingRuntimeSnapshot
    | null;
  afterSnapshot:
    | PaymentGatewayControlRuntimeSnapshot
    | PaymentRoutingRuntimeSnapshot
    | null;
  validationIssues: string[];
};

export type PaymentGatewayControlRevisionResponse = {
  item: PaymentGatewayControlRuntimeSnapshot | PaymentRoutingRuntimeSnapshot;
  revisionNumber: number;
  auditEventId: string | null;
  changedKeys: string[];
};
