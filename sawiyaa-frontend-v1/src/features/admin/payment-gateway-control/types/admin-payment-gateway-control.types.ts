export type PaymentGatewayControlProvider = "PAYMOB" | "STRIPE";

export type PaymentGatewayControlScope = "provider" | "routing";

export type PaymentGatewayControlSource = "env" | "config";
export type PaymentRouteSource = "DATABASE" | "ENVIRONMENT";
export type PaymentRouteEnvironment = "development" | "staging" | "production";

export type PaymentRoute = {
  currencyCode: "EGP" | "USD";
  paymentMethod: string;
  provider: PaymentGatewayControlProvider;
  integrationKey: string;
  environment: PaymentRouteEnvironment;
  enabled: boolean;
  priority: number;
  source: PaymentRouteSource;
};

export type PaymentRouteDraft = Omit<PaymentRoute, "source">;

export type PaymentRouteReadiness = {
  route: PaymentRoute;
  ready: boolean;
  issues: string[];
};

export type PaymentRouteCatalogEntry = {
  provider: PaymentGatewayControlProvider;
  integrationKey: string;
  currencyCodes: Array<"EGP" | "USD">;
  paymentMethods: string[];
  ready: boolean;
  issues: string[];
};

export type PaymobCheckoutFlow = "legacy" | "intention";

export type PaymobGatewayControlMethodEntry = {
  key: string;
  label: string;
  type: string;
  enabled: boolean;
  priority: number;
  supportedCheckoutFlows: PaymobCheckoutFlow[];
  countryIsoCodes: string[];
  integrationId: string | null;
};

export type PaymobGatewayControlDraft = {
  enabled: boolean;
  checkoutFlow: PaymobCheckoutFlow;
  defaultMethod: string | null;
  maintenanceMode: boolean;
  allowedCountryIsoCodes: string[];
  methodRegistry: PaymobGatewayControlMethodEntry[];
};

export type StripeGatewayControlDraft = {
  enabled: boolean;
  maintenanceMode: boolean;
  allowedCountryIsoCodes: string[];
};

export type PaymentRoutingDraft = {
  defaultProvider: PaymentGatewayControlProvider | null;
  priorityOrder: PaymentGatewayControlProvider[];
  fallbackProvider: PaymentGatewayControlProvider | null;
  currencyRoutes: PaymentRouteDraft[];
};

export type PaymentGatewayControlBaseValidation = {
  healthy: boolean;
  issues: string[];
};

export type PaymobGatewayControlRuntimeSnapshot = PaymobGatewayControlDraft & {
  provider: "PAYMOB";
  validation: PaymentGatewayControlBaseValidation;
  sources: {
    enabled: PaymentGatewayControlSource;
    checkoutFlow: PaymentGatewayControlSource;
    defaultMethod: PaymentGatewayControlSource;
    maintenanceMode: PaymentGatewayControlSource;
    allowedCountryIsoCodes: PaymentGatewayControlSource;
    methodRegistry: PaymentGatewayControlSource;
  };
  updatedAt: string | null;
};

export type StripeGatewayControlRuntimeSnapshot = StripeGatewayControlDraft & {
  provider: "STRIPE";
  validation: PaymentGatewayControlBaseValidation;
  sources: {
    enabled: PaymentGatewayControlSource;
    maintenanceMode: PaymentGatewayControlSource;
    allowedCountryIsoCodes: PaymentGatewayControlSource;
  };
  updatedAt: string | null;
};

export type PaymentRoutingRuntimeSnapshot = Omit<PaymentRoutingDraft, "currencyRoutes"> & {
  currencyRoutes: PaymentRoute[];
  routeReadiness: PaymentRouteReadiness[];
  routeCatalog: PaymentRouteCatalogEntry[];
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

export type PaymentGatewayControlValidationResult =
  | {
      valid: boolean;
      issues: string[];
      warnings: string[];
      normalized: PaymobGatewayControlDraft;
      activeMethods: PaymobGatewayControlMethodEntry[];
    }
  | {
      valid: boolean;
      issues: string[];
      warnings: string[];
      normalized: StripeGatewayControlDraft;
    };

export type PaymentRoutingValidationResult = {
  valid: boolean;
  issues: string[];
  warnings: string[];
  normalized: PaymentRoutingDraft;
};

export type PaymentGatewayControlHistoryItem = {
  id: string;
  scope: PaymentGatewayControlScope;
  provider: PaymentGatewayControlProvider | null;
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

export type PaymentGatewayControlListResponse = {
  items: PaymentGatewayControlRuntimeSnapshot[];
  routing: PaymentRoutingRuntimeSnapshot;
};

export type PaymentGatewayMutationSecurity = {
  currentPassword: string;
};
